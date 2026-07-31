<?php
if (!defined('ABSPATH')) {
    exit;
}

if (class_exists('Avonix_Updates')) {
    return;
}

/**
 * Applies software update commands from Avonix (connector self-update,
 * plugin/theme activate/deactivate/delete, WP.org package updates).
 */
class Avonix_Updates
{
    public function __construct()
    {
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('avonix_updates_immediate', [$this, 'run_pending']);
    }

    public function register_rest_routes()
    {
        register_rest_route('avonix/v1', '/updates/run', [
            'methods'             => 'POST',
            'callback'            => [$this, 'rest_run_updates'],
            'permission_callback' => '__return_true',
        ]);
    }

    /**
     * Cloud wake — validate token, then poll/apply queued update jobs.
     */
    public function rest_run_updates(\WP_REST_Request $request)
    {
        $client = new Avonix_Client();
        if (!$client->is_configured()) {
            return new \WP_Error(
                'avonix_not_configured',
                'Avonix connector is not configured.',
                ['status' => 503]
            );
        }

        $token = sanitize_text_field((string) $request->get_param('token'));
        $job_id = sanitize_text_field((string) $request->get_param('job_id'));

        if ($token === '') {
            return new \WP_Error(
                'avonix_bad_request',
                'Missing trigger token.',
                ['status' => 400]
            );
        }

        list($ok, , $code) = $client->forward('/api/v1/connector/trigger/update', [
            'token'  => $token,
            'job_id' => $job_id,
        ]);

        if (!$ok) {
            return new \WP_Error(
                'avonix_trigger_rejected',
                'Update trigger was rejected by Avonix.',
                ['status' => $code >= 400 ? $code : 403]
            );
        }

        if (!wp_next_scheduled('avonix_updates_immediate')) {
            wp_schedule_single_event(time(), 'avonix_updates_immediate');
        }
        if (function_exists('spawn_cron')) {
            spawn_cron();
        }

        // Also run inline when possible (cron may be delayed).
        $this->run_pending();

        return new \WP_REST_Response([
            'status'  => 'accepted',
            'message' => 'Update started.',
        ], 202);
    }

    /** Shared entry used by cron wake. */
    public function run_pending()
    {
        if (class_exists('Avonix_Backup')) {
            (new Avonix_Backup())->check_commands();
            return;
        }
    }

    /**
     * Execute one software_update command from /commands.
     *
     * @param Avonix_Client $client
     * @param array         $command
     */
    public static function run_command($client, array $command)
    {
        $job_id = isset($command['id']) ? (string) $command['id'] : '';
        if ($job_id === '') {
            return;
        }

        $lock_key = 'avonix_upd_' . md5($job_id);
        if (get_transient($lock_key)) {
            return;
        }
        set_transient($lock_key, 1, 15 * MINUTE_IN_SECONDS);

        @set_time_limit(0);
        if (function_exists('wp_raise_memory_limit')) {
            wp_raise_memory_limit('admin');
        }

        self::report($client, $job_id, 'running', 'Applying update…');

        $kind = isset($command['kind']) ? (string) $command['kind'] : 'update';
        $target = isset($command['target_type']) ? (string) $command['target_type'] : '';
        $slug = isset($command['slug']) ? (string) $command['slug'] : '';

        try {
            $result = self::apply($client, $kind, $target, $slug, $command);
            if (is_wp_error($result)) {
                self::report(
                    $client,
                    $job_id,
                    'failed',
                    $result->get_error_message()
                );
                delete_transient($lock_key);
                return;
            }

            self::report(
                $client,
                $job_id,
                'success',
                is_string($result) && $result !== ''
                    ? $result
                    : 'Update completed.'
            );
            // Do not register() here after self-update — AVONIX_VERSION is still
            // the old in-memory constant. Next heartbeat loads the new plugin.
        } catch (\Throwable $e) {
            self::report($client, $job_id, 'failed', $e->getMessage());
        }

        delete_transient($lock_key);
    }

    /**
     * @return true|string|\WP_Error
     */
    private static function apply($client, $kind, $target, $slug, array $command)
    {
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        if (!function_exists('request_filesystem_credentials')) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
        }
        if (!class_exists('Plugin_Upgrader')) {
            require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        }
        if (!function_exists('WP_Filesystem')) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
        }

        WP_Filesystem();

        if ($target === 'connector') {
            return self::apply_connector($client, $kind, $command);
        }

        if ($kind === 'activate') {
            return self::activate_target($target, $slug);
        }
        if ($kind === 'deactivate') {
            return self::deactivate_target($target, $slug);
        }
        if ($kind === 'delete') {
            return self::delete_target($target, $slug);
        }
        if ($kind === 'update') {
            return self::update_wp_package($target, $slug);
        }

        return new \WP_Error('avonix_unknown', 'Unknown update action.');
    }

    /**
     * @return true|string|\WP_Error
     */
    private static function apply_connector($client, $kind, array $command)
    {
        $plugin = plugin_basename(AVONIX_PLUGIN_FILE);

        if ($kind === 'deactivate') {
            deactivate_plugins($plugin, true);
            return 'Connector deactivated.';
        }
        if ($kind === 'activate') {
            $r = activate_plugin($plugin);
            return is_wp_error($r) ? $r : 'Connector activated.';
        }
        if ($kind === 'delete') {
            if (function_exists('avonix_self_uninstall')) {
                avonix_self_uninstall();
                return 'Connector removed.';
            }
            deactivate_plugins($plugin, true);
            $del = delete_plugins([$plugin]);
            return is_wp_error($del) ? $del : 'Connector removed.';
        }
        if ($kind !== 'update') {
            return new \WP_Error('avonix_unknown', 'Unsupported connector action.');
        }

        $path = isset($command['package_url'])
            ? (string) $command['package_url']
            : '/api/v1/connector/plugin-zip';
        if ($path === '' || $path[0] !== '/') {
            $path = '/api/v1/connector/plugin-zip';
        }

        list($ok, $zip, $err) = $client->download_to_file($path, 180);
        if (!$ok || !$zip) {
            return new \WP_Error(
                'avonix_download',
                $err ? $err : 'Could not download connector zip.'
            );
        }

        // Ensure .zip extension for upgrader package detection.
        $zip_named = $zip . '.zip';
        // phpcs:ignore WordPress.WP.AlternativeFunctions.rename_rename
        if (!@rename($zip, $zip_named)) {
            // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_copy
            if (!@copy($zip, $zip_named)) {
                @unlink($zip);
                return new \WP_Error('avonix_zip', 'Could not prepare zip package.');
            }
            @unlink($zip);
        }

        $skin = new \Automatic_Upgrader_Skin();
        $upgrader = new \Plugin_Upgrader($skin);
        $result = $upgrader->run([
            'package'           => $zip_named,
            'destination'       => WP_PLUGIN_DIR,
            'clear_destination' => true,
            'clear_working'     => true,
            'hook_extra'        => [
                'plugin' => $plugin,
                'type'   => 'plugin',
                'action' => 'update',
            ],
        ]);

        @unlink($zip_named);

        if (is_wp_error($result)) {
            return $result;
        }
        if ($result === false) {
            $messages = method_exists($skin, 'get_upgrade_messages')
                ? $skin->get_upgrade_messages()
                : [];
            $detail = is_array($messages) && $messages
                ? implode(' ', $messages)
                : 'Plugin upgrade failed.';
            return new \WP_Error('avonix_upgrade', $detail);
        }

        // Keep connector active after overwrite.
        if (!is_plugin_active($plugin)) {
            activate_plugin($plugin, '', false, true);
        }

        $latest = isset($command['latest_version'])
            ? (string) $command['latest_version']
            : '';
        if ($latest === '' && function_exists('get_plugin_data')) {
            $data = get_plugin_data(WP_PLUGIN_DIR . '/' . $plugin, false, false);
            $latest = isset($data['Version']) ? (string) $data['Version'] : '';
        }

        return $latest !== ''
            ? ('Connector updated to v' . $latest . '.')
            : 'Connector updated.';
    }

    /**
     * @return true|string|\WP_Error
     */
    private static function activate_target($target, $slug)
    {
        if ($target === 'plugin') {
            $file = self::resolve_plugin_file($slug);
            if (!$file) {
                return new \WP_Error('avonix_missing', 'Plugin not found: ' . $slug);
            }
            $r = activate_plugin($file);
            return is_wp_error($r) ? $r : 'Plugin activated.';
        }
        if ($target === 'theme') {
            $theme = wp_get_theme($slug);
            if (!$theme->exists()) {
                return new \WP_Error('avonix_missing', 'Theme not found: ' . $slug);
            }
            switch_theme($slug);
            return 'Theme activated.';
        }
        return new \WP_Error('avonix_unsupported', 'Cannot activate this target.');
    }

    /**
     * @return true|string|\WP_Error
     */
    private static function deactivate_target($target, $slug)
    {
        if ($target !== 'plugin') {
            return new \WP_Error('avonix_unsupported', 'Only plugins can be deactivated.');
        }
        $file = self::resolve_plugin_file($slug);
        if (!$file) {
            return new \WP_Error('avonix_missing', 'Plugin not found: ' . $slug);
        }
        deactivate_plugins($file, true);
        return 'Plugin deactivated.';
    }

    /**
     * @return true|string|\WP_Error
     */
    private static function delete_target($target, $slug)
    {
        if ($target === 'plugin') {
            $file = self::resolve_plugin_file($slug);
            if (!$file) {
                return new \WP_Error('avonix_missing', 'Plugin not found: ' . $slug);
            }
            if (is_plugin_active($file)) {
                deactivate_plugins($file, true);
            }
            $r = delete_plugins([$file]);
            return is_wp_error($r) ? $r : 'Plugin deleted.';
        }
        if ($target === 'theme') {
            if (!function_exists('delete_theme')) {
                require_once ABSPATH . 'wp-admin/includes/theme.php';
            }
            $r = delete_theme($slug);
            return is_wp_error($r) ? $r : 'Theme deleted.';
        }
        return new \WP_Error('avonix_unsupported', 'Cannot delete this target.');
    }

    /**
     * Update a WP.org plugin/theme or WordPress core via built-in upgraders.
     *
     * @return true|string|\WP_Error
     */
    private static function update_wp_package($target, $slug)
    {
        require_once ABSPATH . 'wp-admin/includes/update.php';
        require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';

        if ($target === 'core') {
            wp_version_check([], true);
            $updates = get_site_transient('update_core');
            if (empty($updates->updates) || !is_array($updates->updates)) {
                return new \WP_Error('avonix_noupdate', 'No WordPress core update available.');
            }
            $update = null;
            foreach ($updates->updates as $u) {
                if (isset($u->response) && $u->response === 'upgrade') {
                    $update = $u;
                    break;
                }
            }
            if (!$update) {
                return new \WP_Error('avonix_noupdate', 'No WordPress core update available.');
            }
            $skin = new \Automatic_Upgrader_Skin();
            $upgrader = new \Core_Upgrader($skin);
            $result = $upgrader->upgrade($update);
            return is_wp_error($result) ? $result : 'WordPress core updated.';
        }

        if ($target === 'plugin') {
            wp_update_plugins();
            $file = self::resolve_plugin_file($slug);
            if (!$file) {
                return new \WP_Error('avonix_missing', 'Plugin not found: ' . $slug);
            }
            $skin = new \Automatic_Upgrader_Skin();
            $upgrader = new \Plugin_Upgrader($skin);
            $result = $upgrader->upgrade($file);
            if (is_wp_error($result)) {
                return $result;
            }
            if ($result === false) {
                return new \WP_Error(
                    'avonix_noupdate',
                    'No update available for this plugin (or upgrade failed).'
                );
            }
            return 'Plugin updated.';
        }

        if ($target === 'theme') {
            wp_update_themes();
            $skin = new \Automatic_Upgrader_Skin();
            $upgrader = new \Theme_Upgrader($skin);
            $result = $upgrader->upgrade($slug);
            if (is_wp_error($result)) {
                return $result;
            }
            if ($result === false) {
                return new \WP_Error(
                    'avonix_noupdate',
                    'No update available for this theme (or upgrade failed).'
                );
            }
            return 'Theme updated.';
        }

        return new \WP_Error('avonix_unsupported', 'Unsupported update target.');
    }

    /** Map slug or folder to plugin main file. */
    private static function resolve_plugin_file($slug)
    {
        $slug = trim((string) $slug);
        if ($slug === '') {
            return null;
        }
        if (substr_count($slug, '/') === 1 && substr($slug, -4) === '.php') {
            return $slug;
        }

        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        $plugins = get_plugins();
        if (isset($plugins[$slug])) {
            return $slug;
        }
        foreach (array_keys($plugins) as $file) {
            if ($file === $slug || strpos($file, $slug . '/') === 0) {
                return $file;
            }
            $dir = dirname($file);
            if ($dir === $slug) {
                return $file;
            }
        }
        return null;
    }

    private static function report($client, $job_id, $status, $detail = '')
    {
        $body = [
            'job_id' => $job_id,
            'status' => $status,
        ];
        if ($detail !== '') {
            if ($status === 'failed') {
                $body['error'] = $detail;
            } else {
                $body['detail'] = $detail;
            }
        }
        $client->forward('/api/v1/connector/commands/report', $body);
    }
}
