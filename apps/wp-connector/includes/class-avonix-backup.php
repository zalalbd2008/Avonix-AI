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

        $this->report($client, $job_id, 'running', '', 'Starting backup…', 5);

        try {
            $include_db = !empty($job['include_database']);
            $include_uploads = !empty($job['include_uploads']);

            if ($include_db) {
                $this->report($client, $job_id, 'running', '', 'Dumping database…', 20);
            }

            $zip_path = $this->create_backup_zip(
                $include_db,
                $include_uploads,
                function ($pct, $label) use ($client, $job_id) {
                    $this->report($client, $job_id, 'running', '', $label, $pct);
                }
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
     * Create a ZIP backup of the site.
     *
     * @param bool          $include_db
     * @param bool          $include_uploads
     * @param callable|null $on_progress function(int $pct, string $label)
     */
    private function create_backup_zip($include_db, $include_uploads, $on_progress = null)
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
        $filename = 'avonix-backup-' . date('Y-m-d-His') . '.zip';
        $zip_path = $backup_dir . '/' . $filename;

        $zip = new \ZipArchive();
        if ($zip->open($zip_path, \ZipArchive::CREATE) !== true) {
            throw new \Exception('Cannot create ZIP file.');
        }

        // Database dump
        if ($include_db) {
            $notify(25, 'Dumping database…');
            $sql_path = $backup_dir . '/db-dump-' . uniqid() . '.sql';
            $this->dump_database($sql_path);
            if (file_exists($sql_path)) {
                $zip->addFile($sql_path, 'database.sql');
            }
            $notify(40, 'Database packed…');
        }

        // Uploads directory
        if ($include_uploads) {
            $notify(50, 'Packing uploads…');
            $uploads = wp_upload_dir();
            $uploads_base = $uploads['basedir'];
            if (is_dir($uploads_base)) {
                $this->add_directory_to_zip($zip, $uploads_base, 'uploads');
            }
            $notify(65, 'Uploads packed…');
        }

        // wp-config.php (for reference, sanitized)
        $notify(70, 'Finalizing archive…');
        $config_path = ABSPATH . 'wp-config.php';
        if (file_exists($config_path)) {
            $config_content = file_get_contents($config_path);
            $config_content = preg_replace(
                "/define\s*\(\s*['\"]DB_PASSWORD['\"].*?\)/",
                "define('DB_PASSWORD', '***REDACTED***')",
                $config_content
            );
            $zip->addFromString('wp-config.php.txt', $config_content);
        }

        $zip->close();

        if (isset($sql_path) && file_exists($sql_path)) {
            @unlink($sql_path);
        }

        return $zip_path;
    }

    /**
     * Dump the WordPress database to a SQL file.
     */
    private function dump_database($output_path)
    {
        global $wpdb;

        $tables = $wpdb->get_col("SHOW TABLES LIKE '{$wpdb->prefix}%'");
        if (empty($tables)) return;

        $handle = fopen($output_path, 'w');
        if (!$handle) return;

        fwrite($handle, "-- Avonix Backup Database Dump\n");
        fwrite($handle, "-- Generated: " . date('Y-m-d H:i:s') . "\n");
        fwrite($handle, "-- WordPress: " . get_bloginfo('version') . "\n\n");
        fwrite($handle, "SET NAMES utf8mb4;\n");
        fwrite($handle, "SET FOREIGN_KEY_CHECKS = 0;\n\n");

        foreach ($tables as $table) {
            // CREATE TABLE
            $create = $wpdb->get_row("SHOW CREATE TABLE `{$table}`", ARRAY_N);
            if ($create && isset($create[1])) {
                fwrite($handle, "DROP TABLE IF EXISTS `{$table}`;\n");
                fwrite($handle, $create[1] . ";\n\n");
            }

            // INSERT rows (batched)
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
