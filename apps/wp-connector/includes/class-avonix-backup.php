<?php
if (!defined('ABSPATH')) {
    exit;
}

if (class_exists('Avonix_Backup')) {
    return;
}

/**
 * Handles backup commands from the Avonix cloud.
 *
 * Flow:
 * 1. Poll /api/v1/connector/commands for pending backup jobs
 * 2. Create a ZIP of the WordPress site (DB dump + uploads)
 * 3. Upload to the specified destination (Google Drive, host, Dropbox, etc.)
 * 4. Report completion to /api/v1/connector/commands/report
 */
class Avonix_Backup
{
    public function __construct()
    {
        // Poll for commands on heartbeat
        add_action('avonix_heartbeat', [$this, 'check_commands'], 20);

        // Dedicated 5-minute cron — backups should not wait for hourly heartbeat
        add_action('avonix_backup_poll', [$this, 'check_commands']);

        // Run immediately when register sees pending jobs in the cloud
        add_action('avonix_after_register', [$this, 'maybe_check_after_register'], 10, 1);

        // Also check on admin_init (throttled)
        add_action('admin_init', [$this, 'maybe_check_commands']);

        // Front-end visits can wake WP-Cron when a backup is queued
        add_action('wp', [$this, 'maybe_check_on_frontend']);

        // AJAX endpoint for manual trigger from WP admin
        add_action('wp_ajax_avonix_run_backup', [$this, 'ajax_run_backup']);

        // Cloud push trigger — Avonix dashboard "Backup now"
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('avonix_backup_immediate', [$this, 'check_commands']);
    }

    /**
     * REST route the Avonix cloud calls to start a queued backup immediately.
     */
    public function register_rest_routes()
    {
        register_rest_route('avonix/v1', '/backup/run', [
            'methods'             => 'POST',
            'callback'            => [$this, 'rest_run_backup'],
            'permission_callback' => '__return_true',
        ]);
    }

    /**
     * Validate trigger token with Avonix, then run backup in the background.
     */
    public function rest_run_backup(\WP_REST_Request $request)
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

        list($ok, , $code) = $client->forward('/api/v1/connector/trigger/backup', [
            'token'  => $token,
            'job_id' => $job_id,
        ]);

        if (!$ok) {
            return new \WP_Error(
                'avonix_trigger_rejected',
                'Backup trigger was rejected by Avonix.',
                ['status' => $code >= 400 ? $code : 403]
            );
        }

        if (!wp_next_scheduled('avonix_backup_immediate')) {
            wp_schedule_single_event(time(), 'avonix_backup_immediate');
        }
        if (function_exists('spawn_cron')) {
            spawn_cron();
        }

        return new \WP_REST_Response([
            'status'  => 'accepted',
            'message' => 'Backup started.',
        ], 202);
    }

    /**
     * After a successful register handshake, run pending backups immediately.
     */
    public function maybe_check_after_register($data)
    {
        if (!is_array($data)) {
            return;
        }
        $pending = (int) ($data['pending_backups'] ?? 0);
        if ($pending > 0) {
            $this->check_commands();
        }
    }

    /**
     * Throttled backup poll on public page loads (helps when WP-Cron is lazy).
     */
    public function maybe_check_on_frontend()
    {
        if (is_admin() || wp_doing_ajax() || wp_doing_cron()) {
            return;
        }
        if (get_transient('avonix_backup_frontend_check')) {
            return;
        }
        set_transient('avonix_backup_frontend_check', 1, 2 * MINUTE_IN_SECONDS);
        $this->check_commands();
    }

    /**
     * Throttled command check on admin pages.
     */
    public function maybe_check_commands()
    {
        if (get_transient('avonix_backup_check')) {
            return;
        }
        set_transient('avonix_backup_check', 1, 2 * MINUTE_IN_SECONDS);
        $this->check_commands();
    }

    /**
     * Poll the cloud for pending commands.
     */
    public function check_commands()
    {
        $client = new Avonix_Client();
        if (!$client->is_configured()) {
            return;
        }

        $response = $this->api_get($client, '/api/v1/connector/commands');
        if (!$response || !is_array($response) || empty($response['commands'])) {
            return;
        }

        foreach ($response['commands'] as $command) {
            if (!is_array($command)) continue;
            if (($command['type'] ?? '') !== 'backup') continue;

            $this->run_backup($client, $command);
        }
    }

    /**
     * Execute a single backup job.
     */
    private function run_backup($client, array $job)
    {
        $job_id = $job['id'] ?? '';
        if (!$job_id) return;

        @set_time_limit(0);
        if (function_exists('wp_raise_memory_limit')) {
            wp_raise_memory_limit('admin');
        }

        $this->report($client, $job_id, 'running', '', 'Starting full site backup…', 5);

        try {
            $include_db = !empty($job['include_database']);
            $include_uploads = !empty($job['include_uploads']);
            // Default to full site when the cloud sends the flag (or omit = true for older jobs after update).
            $include_full = array_key_exists('include_full_site', $job)
                ? !empty($job['include_full_site'])
                : true;
            $archive_name = isset($job['archive_name']) ? (string) $job['archive_name'] : '';

            if ($include_db) {
                $this->report($client, $job_id, 'running', '', 'Dumping database…', 15);
            }

            $zip_path = $this->create_backup_zip(
                $include_db,
                $include_uploads,
                $include_full,
                function ($pct, $label) use ($client, $job_id) {
                    $this->report($client, $job_id, 'running', '', $label, $pct);
                },
                $archive_name
            );

            if (!$zip_path || !file_exists($zip_path)) {
                $this->report($client, $job_id, 'failed', '', 'Failed to create backup archive.', 0);
                return;
            }

            $size = filesize($zip_path);
            $size_label = $this->format_size($size);

            $destination = $job['destination'] ?? 'host';
            $credentials = $job['credentials'] ?? [];
            $upload_ok = false;
            $detail = '';

            $this->report(
                $client,
                $job_id,
                'running',
                $size_label,
                'Uploading to ' . $destination . '…',
                75
            );

            switch ($destination) {
                case 'google_drive':
                    $result = $this->upload_google_drive($zip_path, $credentials);
                    $upload_ok = $result['ok'];
                    $detail = $result['detail'];
                    break;

                case 'dropbox':
                    $result = $this->upload_dropbox($zip_path, $credentials);
                    $upload_ok = $result['ok'];
                    $detail = $result['detail'];
                    break;

                case 's3':
                    $result = $this->upload_via_webhook($zip_path, $credentials);
                    $upload_ok = $result['ok'];
                    $detail = $result['detail'];
                    break;

                case 'host':
                default:
                    $result = $this->store_locally($zip_path);
                    $upload_ok = $result['ok'];
                    $detail = $result['detail'];
                    break;
            }

            if ($destination !== 'host' && file_exists($zip_path)) {
                @unlink($zip_path);
            }

            if ($upload_ok) {
                $this->report($client, $job_id, 'success', $size_label, $detail, 100);
            } else {
                $this->report($client, $job_id, 'failed', $size_label, $detail ?: 'Upload failed.', 0);
            }

        } catch (\Exception $e) {
            $this->report($client, $job_id, 'failed', '', 'Error: ' . $e->getMessage(), 0);
            if (isset($zip_path) && file_exists($zip_path)) {
                @unlink($zip_path);
            }
        }
    }

    /**
     * Create the final backup package (one zip / folder of component archives).
     *
     * Layout (Updraft-style components, single package):
     *   {name}/
     *     RESTORE.txt
     *     {name}-db.sql
     *     {name}-plugins.zip
     *     {name}-themes.zip
     *     {name}-uploads.zip
     *     {name}-mu-plugins.zip
     *     {name}-others.zip   (core + remaining wp-content + root files)
     *
     * @param bool          $include_db
     * @param bool          $include_uploads
     * @param bool          $include_full
     * @param callable|null $on_progress function(int $pct, string $label)
     * @param string        $archive_name optional base name without .zip
     */
    private function create_backup_zip($include_db, $include_uploads, $include_full = true, $on_progress = null, $archive_name = '')
    {
        if (!class_exists('ZipArchive')) {
            throw new \Exception('ZipArchive extension is not available.');
        }

        $notify = function ($pct, $label) use ($on_progress) {
            if (is_callable($on_progress)) {
                call_user_func($on_progress, $pct, $label);
            }
        };

        $backup_dir = $this->backup_directory();
        $safe = $this->sanitize_archive_name($archive_name);
        if ($safe === '') {
            $safe = $this->sanitize_archive_name(get_bloginfo('name'));
        }
        if ($safe === '') {
            $safe = 'avonix-backup';
        }
        $stamp = date('Ymd-His');
        $folder = $safe . '-' . $stamp;
        $filename = $folder . '.zip';
        $zip_path = $backup_dir . '/' . $filename;

        $work = $backup_dir . '/tmp-' . uniqid('bkp_', true);
        if (!wp_mkdir_p($work)) {
            throw new \Exception('Cannot create temporary backup workspace.');
        }

        $component_dir = $work . '/' . $folder;
        wp_mkdir_p($component_dir);

        $prefix = $folder;
        $temps = [];

        try {
            file_put_contents(
                $component_dir . '/RESTORE.txt',
                $this->restore_instructions($folder)
            );

            if ($include_db) {
                $notify(12, 'Dumping database…');
                $sql_path = $component_dir . '/' . $prefix . '-db.sql';
                $this->dump_database($sql_path);
                $temps[] = $sql_path;
                $notify(22, 'Database ready…');
            }

            if ($include_full) {
                $content = WP_CONTENT_DIR;

                $notify(28, 'Packing plugins…');
                $plugins_zip = $component_dir . '/' . $prefix . '-plugins.zip';
                $this->zip_path_to_file(
                    $content . '/plugins',
                    $plugins_zip,
                    'plugins',
                    [$backup_dir]
                );
                $notify(38, 'Plugins packed…');

                $notify(42, 'Packing themes…');
                $themes_zip = $component_dir . '/' . $prefix . '-themes.zip';
                $this->zip_path_to_file(
                    $content . '/themes',
                    $themes_zip,
                    'themes',
                    [$backup_dir]
                );
                $notify(50, 'Themes packed…');

                $notify(54, 'Packing uploads…');
                $uploads_zip = $component_dir . '/' . $prefix . '-uploads.zip';
                $uploads = wp_upload_dir();
                $this->zip_path_to_file(
                    $uploads['basedir'],
                    $uploads_zip,
                    'uploads',
                    [$backup_dir, $work]
                );
                $notify(62, 'Uploads packed…');

                $notify(65, 'Packing mu-plugins…');
                $mu_zip = $component_dir . '/' . $prefix . '-mu-plugins.zip';
                $mu_dir = $content . '/mu-plugins';
                if (is_dir($mu_dir)) {
                    $this->zip_path_to_file($mu_dir, $mu_zip, 'mu-plugins', [$backup_dir]);
                } else {
                    // Empty placeholder so restore layout stays consistent
                    $z = new \ZipArchive();
                    if ($z->open($mu_zip, \ZipArchive::CREATE) === true) {
                        $z->addFromString('mu-plugins/.gitkeep', '');
                        $z->close();
                    }
                }
                $notify(70, 'mu-plugins packed…');

                $notify(72, 'Packing others (core + configs)…');
                $others_zip = $component_dir . '/' . $prefix . '-others.zip';
                $this->zip_others_component($others_zip, $backup_dir, $work, $notify);
                $notify(82, 'Others packed…');
            } elseif ($include_uploads) {
                $notify(40, 'Packing uploads…');
                $uploads_zip = $component_dir . '/' . $prefix . '-uploads.zip';
                $uploads = wp_upload_dir();
                $this->zip_path_to_file(
                    $uploads['basedir'],
                    $uploads_zip,
                    'uploads',
                    [$backup_dir, $work]
                );
                $notify(65, 'Uploads packed…');
            }

            $notify(88, 'Building final backup package…');
            $final = new \ZipArchive();
            if ($final->open($zip_path, \ZipArchive::CREATE) !== true) {
                throw new \Exception('Cannot create final backup zip.');
            }

            $this->add_directory_to_zip($final, $component_dir, $folder);
            $final->close();
            $notify(94, 'Final package ready…');
        } finally {
            $this->rrmdir($work);
        }

        return $zip_path;
    }

    /**
     * Zip a directory into a standalone component archive.
     */
    private function zip_path_to_file($source_dir, $dest_zip, $prefix_inside, array $exclude_roots = [])
    {
        $zip = new \ZipArchive();
        if ($zip->open($dest_zip, \ZipArchive::CREATE) !== true) {
            throw new \Exception('Cannot create component zip: ' . basename($dest_zip));
        }

        if (!is_dir($source_dir)) {
            $zip->addFromString($prefix_inside . '/.gitkeep', '');
            $zip->close();
            return;
        }

        $exclude_reals = [];
        foreach ($exclude_roots as $root) {
            $r = realpath($root);
            if ($r) $exclude_reals[] = $r;
        }

        $this->add_directory_to_zip_filtered($zip, $source_dir, $prefix_inside, $exclude_reals);
        $zip->close();
    }

    /**
     * Everything except plugins / themes / uploads / mu-plugins (those are separate).
     */
    private function zip_others_component($dest_zip, $backup_dir, $work_dir, $notify)
    {
        $zip = new \ZipArchive();
        if ($zip->open($dest_zip, \ZipArchive::CREATE) !== true) {
            throw new \Exception('Cannot create others.zip');
        }

        $root = rtrim(ABSPATH, '/\\');
        $backup_real = realpath($backup_dir);
        $work_real = realpath($work_dir);
        $content = realpath(WP_CONTENT_DIR);

        $skip_content_children = ['plugins', 'themes', 'uploads', 'mu-plugins'];

        $exclude_path_parts = [
            '/wp-content/cache/',
            '/wp-content/upgrade/',
            '/wp-content/updraft/',
            '/wp-content/ai1wm-backups/',
            '/wp-content/backups-dup-lite/',
            '/wp-content/backup-db/',
            '/wp-content/uploads/avonix-backups/',
            '/avonix-backups/',
        ];

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($root, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );

        $max_file = 512 * 1024 * 1024;
        $count = 0;

        foreach ($iterator as $file) {
            /** @var \SplFileInfo $file */
            $real = realpath($file->getPathname());
            if ($real === false) continue;
            if ($backup_real && strpos($real, $backup_real) === 0) continue;
            if ($work_real && strpos($real, $work_real) === 0) continue;

            $rel = substr($real, strlen($root) + 1);
            if ($rel === false || $rel === '') continue;
            $rel_unix = str_replace('\\', '/', $rel);

            // Skip dedicated component trees under wp-content
            if ($content && strpos($real, $content) === 0) {
                $after = ltrim(substr($real, strlen($content)), '/\\');
                $top = explode('/', str_replace('\\', '/', $after))[0];
                if (in_array($top, $skip_content_children, true)) {
                    continue;
                }
            }

            if (strpos($rel_unix, '.git/') === 0 || $rel_unix === '.git') continue;
            if (strpos($rel_unix, 'node_modules/') === 0) continue;

            $check = '/' . $rel_unix . '/';
            $skip = false;
            foreach ($exclude_path_parts as $part) {
                if (strpos($check, $part) !== false) {
                    $skip = true;
                    break;
                }
            }
            if ($skip) continue;

            if ($file->isDir()) {
                $zip->addEmptyDir('others/' . $rel_unix);
                continue;
            }
            if (!$file->isFile()) continue;
            if ($file->getSize() > $max_file) continue;

            $zip->addFile($real, 'others/' . $rel_unix);
            $count++;
            if ($count % 400 === 0) {
                $notify(min(80, 72 + (int) ($count / 800)), 'Packing others… (' . number_format($count) . ')');
            }
        }

        $zip->close();
    }

    private function add_directory_to_zip_filtered(\ZipArchive $zip, $dir, $prefix, array $exclude_reals)
    {
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );

        $max_file = 512 * 1024 * 1024;
        $root = realpath($dir);
        if ($root === false) return;

        foreach ($iterator as $file) {
            /** @var \SplFileInfo $file */
            $real = realpath($file->getPathname());
            if ($real === false) continue;

            foreach ($exclude_reals as $ex) {
                if (strpos($real, $ex) === 0) {
                    continue 2;
                }
            }

            // Skip nested avonix-backups under uploads
            if (strpos(str_replace('\\', '/', $real), '/avonix-backups/') !== false) {
                continue;
            }

            $rel = substr($real, strlen($root) + 1);
            if ($rel === false || $rel === '') continue;
            $rel_unix = str_replace('\\', '/', $rel);

            if ($file->isDir()) {
                $zip->addEmptyDir($prefix . '/' . $rel_unix);
                continue;
            }
            if (!$file->isFile()) continue;
            if ($file->getSize() > $max_file) continue;

            $zip->addFile($real, $prefix . '/' . $rel_unix);
        }
    }

    private function rrmdir($dir)
    {
        if (!is_dir($dir)) return;
        $items = scandir($dir);
        if ($items === false) return;
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            $path = $dir . '/' . $item;
            if (is_dir($path)) {
                $this->rrmdir($path);
            } else {
                @unlink($path);
            }
        }
        @rmdir($dir);
    }

    private function sanitize_archive_name($raw)
    {
        $raw = trim((string) $raw);
        $raw = preg_replace('/\.zip$/i', '', $raw);
        $cleaned = preg_replace('/[^\p{L}\p{N}\s._-]+/u', '', $raw);
        if ($cleaned === null) {
            $cleaned = preg_replace('/[^A-Za-z0-9\s._-]+/', '', $raw);
        }
        $cleaned = preg_replace('/\s+/', '_', (string) $cleaned);
        $cleaned = preg_replace('/_+/', '_', (string) $cleaned);
        $cleaned = trim((string) $cleaned, '._-');
        return substr($cleaned, 0, 80);
    }

    private function restore_instructions($folder = '')
    {
        $folder = $folder ?: 'backup-folder';
        return <<<TXT
Avonix Component Backup
=======================

This package is ONE final zip. Inside it is a folder of separate component files
(like UpdraftPlus), so you can restore selectively or all at once.

{$folder}/
  RESTORE.txt
  {$folder}-db.sql
  {$folder}-plugins.zip
  {$folder}-themes.zip
  {$folder}-uploads.zip
  {$folder}-mu-plugins.zip
  {$folder}-others.zip     ← wp-admin, wp-includes, wp-config, root, other wp-content

Full restore
------------
1. Import {$folder}-db.sql into MySQL.
2. Unpack {$folder}-others.zip → copy "others/" contents into the WordPress root.
3. Unpack plugins.zip → wp-content/plugins/
4. Unpack themes.zip → wp-content/themes/
5. Unpack uploads.zip → wp-content/uploads/
6. Unpack mu-plugins.zip → wp-content/mu-plugins/ (if used)
7. Fix wp-config.php DB credentials if the host changed.
8. Settings → Permalinks → Save.

Keep this archive private — it contains credentials and all site data.
TXT;
    }

    /**
     * Dump the WordPress database to a SQL file (all tables in the DB).
     */
    private function dump_database($output_path)
    {
        global $wpdb;

        $tables = $wpdb->get_col('SHOW TABLES');
        if (empty($tables)) return;

        $handle = fopen($output_path, 'w');
        if (!$handle) return;

        fwrite($handle, "-- Avonix Full Site Database Dump\n");
        fwrite($handle, "-- Generated: " . date('Y-m-d H:i:s') . "\n");
        fwrite($handle, "-- WordPress: " . get_bloginfo('version') . "\n");
        fwrite($handle, "-- Site URL: " . home_url() . "\n\n");
        fwrite($handle, "SET NAMES utf8mb4;\n");
        fwrite($handle, "SET FOREIGN_KEY_CHECKS = 0;\n\n");

        foreach ($tables as $table) {
            $create = $wpdb->get_row("SHOW CREATE TABLE `{$table}`", ARRAY_N);
            if ($create && isset($create[1])) {
                fwrite($handle, "DROP TABLE IF EXISTS `{$table}`;\n");
                fwrite($handle, $create[1] . ";\n\n");
            }

            $offset = 0;
            $batch = 500;
            while (true) {
                $rows = $wpdb->get_results(
                    $wpdb->prepare(
                        "SELECT * FROM `{$table}` LIMIT %d OFFSET %d",
                        $batch,
                        $offset
                    ),
                    ARRAY_A
                );
                if (empty($rows)) break;

                foreach ($rows as $row) {
                    $values = array_map(function ($v) use ($wpdb) {
                        if ($v === null) return 'NULL';
                        return "'" . $wpdb->_real_escape($v) . "'";
                    }, array_values($row));
                    $cols = array_map(function ($c) {
                        return "`{$c}`";
                    }, array_keys($row));
                    fwrite($handle, "INSERT INTO `{$table}` (" . implode(',', $cols) . ") VALUES (" . implode(',', $values) . ");\n");
                }
                $offset += $batch;
            }
            fwrite($handle, "\n");
        }

        fwrite($handle, "SET FOREIGN_KEY_CHECKS = 1;\n");
        fclose($handle);
    }

    /**
     * Upload to Google Drive using OAuth tokens.
     */
    private function upload_google_drive($file_path, $credentials)
    {
        $access_token = $credentials['access_token'] ?? '';
        $refresh_token = $credentials['refresh_token'] ?? '';
        $client_id = $credentials['client_id'] ?? '';
        $client_secret = $credentials['client_secret'] ?? '';

        if (!$access_token && !$refresh_token) {
            // Fallback to webhook if available
            if (!empty($credentials['webhook_url'])) {
                return $this->upload_via_webhook($file_path, $credentials);
            }
            return ['ok' => false, 'detail' => 'No Drive credentials. Connect Google Drive in Backups settings.'];
        }

        // Try with current token, refresh if 401
        $result = $this->drive_upload_attempt($file_path, $access_token);
        if ($result['ok']) {
            return $result;
        }

        // Refresh token and retry
        if ($refresh_token && $client_id && $client_secret) {
            $new_token = $this->refresh_google_token($refresh_token, $client_id, $client_secret);
            if ($new_token) {
                return $this->drive_upload_attempt($file_path, $new_token);
            }
        }

        return ['ok' => false, 'detail' => 'Drive upload failed. Re-authorize in Backups → Connect Google Drive.'];
    }

    /**
     * Attempt to upload a file to Google Drive.
     */
    private function drive_upload_attempt($file_path, $access_token)
    {
        if (!$access_token) {
            return ['ok' => false, 'detail' => 'No access token.'];
        }

        $filename = basename($file_path);
        $filesize = filesize($file_path);

        // Step 1: Create the file metadata (get folder or create one)
        $folder_id = $this->get_or_create_drive_folder($access_token);

        // Step 2: Resumable upload for large files
        $metadata = [
            'name' => $filename,
            'mimeType' => 'application/zip',
        ];
        if ($folder_id) {
            $metadata['parents'] = [$folder_id];
        }

        // Initiate resumable upload
        $init_url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
        $init_response = wp_remote_post($init_url, [
            'timeout' => 30,
            'headers' => [
                'Authorization' => 'Bearer ' . $access_token,
                'Content-Type' => 'application/json',
                'X-Upload-Content-Type' => 'application/zip',
                'X-Upload-Content-Length' => (string) $filesize,
            ],
            'body' => wp_json_encode($metadata),
        ]);

        if (is_wp_error($init_response)) {
            return ['ok' => false, 'detail' => 'Drive init failed: ' . $init_response->get_error_message()];
        }

        $init_code = wp_remote_retrieve_response_code($init_response);
        if ($init_code === 401) {
            return ['ok' => false, 'detail' => 'Token expired.'];
        }
        if ($init_code !== 200) {
            $body = wp_remote_retrieve_body($init_response);
            return ['ok' => false, 'detail' => "Drive init HTTP {$init_code}: {$body}"];
        }

        $upload_url = wp_remote_retrieve_header($init_response, 'location');
        if (!$upload_url) {
            return ['ok' => false, 'detail' => 'No upload URL returned by Drive.'];
        }

        // Step 3: Upload the actual file
        $file_content = file_get_contents($file_path);
        if ($file_content === false) {
            return ['ok' => false, 'detail' => 'Cannot read backup file.'];
        }

        $upload_response = wp_remote_request($upload_url, [
            'method' => 'PUT',
            'timeout' => 300,
            'headers' => [
                'Content-Type' => 'application/zip',
                'Content-Length' => (string) $filesize,
            ],
            'body' => $file_content,
        ]);

        if (is_wp_error($upload_response)) {
            return ['ok' => false, 'detail' => 'Drive upload failed: ' . $upload_response->get_error_message()];
        }

        $upload_code = wp_remote_retrieve_response_code($upload_response);
        if ($upload_code === 200 || $upload_code === 201) {
            $data = json_decode(wp_remote_retrieve_body($upload_response), true);
            $file_id = $data['id'] ?? 'unknown';
            return ['ok' => true, 'detail' => "Uploaded to Google Drive (file: {$file_id})"];
        }

        return ['ok' => false, 'detail' => "Drive upload HTTP {$upload_code}"];
    }

    /**
     * Get or create the "Avonix Backups" folder on Drive.
     */
    private function get_or_create_drive_folder($access_token)
    {
        // Search for existing folder
        $query = "name='Avonix Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false";
        $search_url = 'https://www.googleapis.com/drive/v3/files?q=' . rawurlencode($query) . '&fields=files(id)';

        $response = wp_remote_get($search_url, [
            'timeout' => 15,
            'headers' => ['Authorization' => 'Bearer ' . $access_token],
        ]);

        if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
            $data = json_decode(wp_remote_retrieve_body($response), true);
            if (!empty($data['files'][0]['id'])) {
                return $data['files'][0]['id'];
            }
        }

        // Create folder
        $create_response = wp_remote_post('https://www.googleapis.com/drive/v3/files', [
            'timeout' => 15,
            'headers' => [
                'Authorization' => 'Bearer ' . $access_token,
                'Content-Type' => 'application/json',
            ],
            'body' => wp_json_encode([
                'name' => 'Avonix Backups',
                'mimeType' => 'application/vnd.google-apps.folder',
            ]),
        ]);

        if (!is_wp_error($create_response) && wp_remote_retrieve_response_code($create_response) === 200) {
            $data = json_decode(wp_remote_retrieve_body($create_response), true);
            return $data['id'] ?? null;
        }

        return null;
    }

    /**
     * Refresh a Google OAuth access token.
     */
    private function refresh_google_token($refresh_token, $client_id, $client_secret)
    {
        $response = wp_remote_post('https://oauth2.googleapis.com/token', [
            'timeout' => 15,
            'body' => [
                'client_id' => $client_id,
                'client_secret' => $client_secret,
                'refresh_token' => $refresh_token,
                'grant_type' => 'refresh_token',
            ],
        ]);

        if (is_wp_error($response)) return null;
        if (wp_remote_retrieve_response_code($response) !== 200) return null;

        $data = json_decode(wp_remote_retrieve_body($response), true);
        return $data['access_token'] ?? null;
    }

    /**
     * Upload via webhook (generic — S3 proxy, Apps Script, etc.)
     */
    private function upload_via_webhook($file_path, $credentials)
    {
        $url = $credentials['webhook_url'] ?? '';
        if (!$url) {
            return ['ok' => false, 'detail' => 'No webhook URL configured.'];
        }

        $file_content = file_get_contents($file_path);
        if ($file_content === false) {
            return ['ok' => false, 'detail' => 'Cannot read backup file.'];
        }

        $response = wp_remote_post($url, [
            'timeout' => 300,
            'headers' => [
                'Content-Type' => 'application/zip',
                'X-Avonix-Filename' => basename($file_path),
            ],
            'body' => $file_content,
        ]);

        if (is_wp_error($response)) {
            return ['ok' => false, 'detail' => 'Webhook failed: ' . $response->get_error_message()];
        }

        $code = wp_remote_retrieve_response_code($response);
        if ($code >= 200 && $code < 300) {
            return ['ok' => true, 'detail' => 'Uploaded via webhook'];
        }

        return ['ok' => false, 'detail' => "Webhook HTTP {$code}"];
    }

    /**
     * Upload to Dropbox using access token.
     */
    private function upload_dropbox($file_path, $credentials)
    {
        $token = $credentials['access_token'] ?? '';
        if (!$token) {
            return ['ok' => false, 'detail' => 'No Dropbox access token.'];
        }

        $filename = basename($file_path);
        $file_content = file_get_contents($file_path);
        if ($file_content === false) {
            return ['ok' => false, 'detail' => 'Cannot read backup file.'];
        }

        $response = wp_remote_post('https://content.dropboxapi.com/2/files/upload', [
            'timeout' => 300,
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type' => 'application/octet-stream',
                'Dropbox-API-Arg' => wp_json_encode([
                    'path' => '/Avonix Backups/' . $filename,
                    'mode' => 'add',
                    'autorename' => true,
                ]),
            ],
            'body' => $file_content,
        ]);

        if (is_wp_error($response)) {
            return ['ok' => false, 'detail' => 'Dropbox error: ' . $response->get_error_message()];
        }

        $code = wp_remote_retrieve_response_code($response);
        if ($code === 200) {
            $data = json_decode(wp_remote_retrieve_body($response), true);
            $path = $data['path_display'] ?? $filename;
            return ['ok' => true, 'detail' => "Uploaded to Dropbox: {$path}"];
        }

        return ['ok' => false, 'detail' => "Dropbox HTTP {$code}"];
    }

    /**
     * Store backup locally on the host.
     */
    private function store_locally($zip_path)
    {
        $backup_dir = $this->backup_directory();
        $filename = basename($zip_path);
        $dest = $backup_dir . '/' . $filename;

        // If already in the backup dir, just keep it
        if (realpath($zip_path) === realpath($dest)) {
            return ['ok' => true, 'detail' => "Stored locally: {$filename}"];
        }

        if (rename($zip_path, $dest)) {
            return ['ok' => true, 'detail' => "Stored locally: {$filename}"];
        }

        if (copy($zip_path, $dest)) {
            @unlink($zip_path);
            return ['ok' => true, 'detail' => "Stored locally: {$filename}"];
        }

        return ['ok' => false, 'detail' => 'Cannot move backup to storage directory.'];
    }

    /**
     * Report job status back to the cloud.
     */
    private function report($client, $job_id, $status, $size_label = '', $detail = '', $progress = null)
    {
        $payload = [
            'job_id' => $job_id,
            'status' => $status,
        ];
        if ($size_label) $payload['size_label'] = $size_label;
        if ($detail) $payload['detail'] = $detail;
        if ($progress !== null) $payload['progress'] = (int) $progress;

        $client->forward('/api/v1/connector/commands/report', $payload);
    }

    /**
     * AJAX handler for manual backup trigger.
     */
    public function ajax_run_backup()
    {
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Not authorized.');
        }

        check_ajax_referer('avonix_backup', 'nonce');

        $this->check_commands();

        wp_send_json_success('Backup check complete.');
    }

    /**
     * GET helper using the client.
     */
    private function api_get($client, $path)
    {
        list($ok, $data, $code) = $client->forward($path, []);
        // forward uses POST, we need GET — use a direct approach
        $key = trim((string) get_option(AVONIX_OPT_KEY, ''));
        $endpoint = untrailingslashit((string) get_option(AVONIX_OPT_ENDPOINT, 'https://app.avonix.ai'));

        $response = wp_remote_get($endpoint . $path, [
            'timeout' => 15,
            'headers' => [
                'Authorization' => 'Bearer ' . $key,
                'Accept' => 'application/json',
            ],
        ]);

        if (is_wp_error($response)) return null;
        $code = wp_remote_retrieve_response_code($response);
        if ($code !== 200) return null;

        return json_decode(wp_remote_retrieve_body($response), true);
    }

    /**
     * Ensure backup directory exists with .htaccess protection.
     */
    private function backup_directory()
    {
        $upload = wp_upload_dir();
        $dir = $upload['basedir'] . '/avonix-backups';

        if (!is_dir($dir)) {
            wp_mkdir_p($dir);
        }

        // Protect from direct access
        $htaccess = $dir . '/.htaccess';
        if (!file_exists($htaccess)) {
            file_put_contents($htaccess, "deny from all\n");
        }

        $index = $dir . '/index.php';
        if (!file_exists($index)) {
            file_put_contents($index, "<?php // Silence is golden.\n");
        }

        return $dir;
    }

    /**
     * Add a directory recursively to a ZipArchive.
     */
    private function add_directory_to_zip(\ZipArchive $zip, $dir, $prefix)
    {
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::LEAVES_ONLY
        );

        $max_size = 200 * 1024 * 1024; // Skip files > 200MB
        $total = 0;
        $max_total = 2 * 1024 * 1024 * 1024; // 2GB total cap

        foreach ($iterator as $file) {
            if (!$file->isFile()) continue;
            $size = $file->getSize();
            if ($size > $max_size) continue;
            $total += $size;
            if ($total > $max_total) break;

            $relative = $prefix . '/' . substr($file->getRealPath(), strlen($dir) + 1);
            $zip->addFile($file->getRealPath(), $relative);
        }
    }

    /**
     * Format file size for human display.
     */
    private function format_size($bytes)
    {
        if ($bytes >= 1073741824) return round($bytes / 1073741824, 1) . ' GB';
        if ($bytes >= 1048576) return round($bytes / 1048576, 1) . ' MB';
        if ($bytes >= 1024) return round($bytes / 1024, 1) . ' KB';
        return $bytes . ' B';
    }
}
