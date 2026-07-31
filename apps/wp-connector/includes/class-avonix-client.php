<?php
if (!defined('ABSPATH')) {
    exit;
}

if (class_exists('Avonix_Client')) {
    return;
}

/**
 * Talks to the Avonix API. The only file that knows the wire format.
 */
class Avonix_Client
{
    private $key;
    private $endpoint;

    public function __construct()
    {
        $this->key = trim((string) get_option(AVONIX_OPT_KEY, ''));
        $this->endpoint = untrailingslashit(
            (string) get_option(AVONIX_OPT_ENDPOINT, 'https://app.avonix.ai')
        );
    }

    public function is_configured()
    {
        return $this->key !== '' && $this->endpoint !== '';
    }

    /** Handshake. Returns [ok, message]. */
    public function register()
    {
        if (!$this->is_configured()) {
            return [false, 'No connector key set.'];
        }

        $response = $this->post('/api/v1/connector/register', [
            'site_url' => home_url(),
            'version'  => AVONIX_VERSION,
        ]);

        if (is_wp_error($response)) {
            update_option(AVONIX_OPT_STATUS, 'error: ' . $response->get_error_message());
            return [false, $response->get_error_message()];
        }

        $code = wp_remote_retrieve_response_code($response);
        $data = json_decode(wp_remote_retrieve_body($response), true);
        $data = is_array($data) ? $data : [];

        if ($code === 200 && (($data['status'] ?? '') === 'uninstall' || ($data['action'] ?? '') === 'delete_plugin')) {
            update_option(AVONIX_OPT_STATUS, 'uninstalling');
            avonix_self_uninstall();
            return [true, 'Uninstalled — this site was removed in Avonix.'];
        }

        if ($code === 200) {
            update_option(AVONIX_OPT_STATUS, 'connected');
            update_option('avonix_reported_version', AVONIX_VERSION, false);
            do_action('avonix_after_register', $data);
            return [true, 'Connected.'];
        }
        if ($code === 401) {
            update_option(AVONIX_OPT_STATUS, 'invalid key');
            return [false, 'That connector key was rejected.'];
        }

        update_option(AVONIX_OPT_STATUS, 'error: HTTP ' . $code);
        return [false, 'Unexpected response: HTTP ' . $code];
    }

    /** Forward a submission. Returns [ok, message, data]. */
    public function submit(array $payload)
    {
        if (!$this->is_configured()) {
            return [false, 'Connector is not configured.', null];
        }

        $response = $this->post('/api/v1/connector/submit', $payload);

        if (is_wp_error($response)) {
            return [false, $response->get_error_message(), null];
        }

        $code = wp_remote_retrieve_response_code($response);
        $data = json_decode(wp_remote_retrieve_body($response), true);
        $data = is_array($data) ? $data : null;

        if ($code === 200) {
            return [true, 'ok', $data];
        }
        if ($code === 429) {
            return [false, 'Too many submissions right now. Please try again shortly.', $data];
        }
        return [false, 'Could not send (HTTP ' . $code . ').', $data];
    }

    /** One chat turn. Returns a shape the widget can render either way. */
    public function chat(array $payload)
    {
        if (!$this->is_configured()) {
            return ['reply' => 'Chat is not configured on this site yet.'];
        }

        $response = $this->post('/api/v1/connector/chat', $payload, 45);

        if (is_wp_error($response)) {
            return ['reply' => 'Sorry — we could not reach the assistant. Please try again.'];
        }

        $code = wp_remote_retrieve_response_code($response);
        $data = json_decode(wp_remote_retrieve_body($response), true);

        if ($code === 200 && (!empty($data['reply']) || !empty($data['blocks']))) {
            return [
                'reply'           => $data['reply'] ?? '',
                'blocks'          => isset($data['blocks']) && is_array($data['blocks']) ? $data['blocks'] : null,
                'conversation_id' => $data['conversation_id'] ?? null,
                'handoff_status'  => $data['handoff_status'] ?? null,
                'provider'        => $data['provider'] ?? null,
                'model'           => $data['model'] ?? null,
            ];
        }
        if ($code === 429) {
            return ['reply' => 'We are getting a lot of questions right now. Please try again shortly.'];
        }

        return [
            'reply'           => 'Sorry — we could not answer that just now, but your question has been passed on.',
            'conversation_id' => is_array($data) ? ($data['conversation_id'] ?? null) : null,
        ];
    }

    /** Poll for new agent/system messages. */
    public function chat_poll($conversation_id, $after = null)
    {
        if (!$this->is_configured()) {
            return ['messages' => []];
        }

        $qs = 'conversation_id=' . rawurlencode($conversation_id);
        if ($after) {
            $qs .= '&after=' . rawurlencode($after);
        }

        $response = $this->get('/api/v1/connector/chat/poll?' . $qs, 8);

        if (is_wp_error($response)) {
            return ['messages' => []];
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        $data = json_decode(wp_remote_retrieve_body($response), true);
        if ($code !== 200 || !is_array($data)) {
            return ['messages' => []];
        }
        return $data;
    }

    /**
     * Stream SSE from cloud to the browser (flush as received).
     */
    public function chat_stream(array $payload)
    {
        if (!$this->is_configured()) {
            echo "event: error\ndata: " . wp_json_encode(['message' => 'Not configured.']) . "\n\n";
            return;
        }

        if (!function_exists('curl_init')) {
            // Fallback: one-shot chat then fake a done event
            $data = $this->chat($payload);
            echo "event: done\ndata: " . wp_json_encode($data) . "\n\n";
            flush();
            return;
        }

        $ch = curl_init($this->endpoint . '/api/v1/connector/chat/stream');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->key,
                'Accept: text/event-stream',
            ],
            CURLOPT_POSTFIELDS     => wp_json_encode($payload),
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_TIMEOUT        => 90,
            CURLOPT_WRITEFUNCTION  => function ($ch, $chunk) {
                echo $chunk;
                if (function_exists('flush')) {
                    flush();
                }
                return strlen($chunk);
            },
        ]);
        $ok = curl_exec($ch);
        if ($ok === false) {
            echo "event: error\ndata: " . wp_json_encode(['message' => 'Stream failed.']) . "\n\n";
            flush();
        }
        curl_close($ch);
    }

    /**
     * GET published CEP chat widget config (ADR-011).
     */
    public function get_chat_config()
    {
        if (!$this->is_configured()) {
            return null;
        }

        $response = $this->get('/api/v1/connector/chat/config', 8);

        if (is_wp_error($response)) {
            return null;
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        if ($code !== 200) {
            return null;
        }

        $data = json_decode(wp_remote_retrieve_body($response), true);
        return is_array($data) ? $data : null;
    }

    /**
     * Forward arbitrary connector JSON. Returns [ok, decoded_body|null, http_code].
     * Used by tracking / form analytics / form AI proxies.
     */
    public function forward($path, array $body)
    {
        if (!$this->is_configured()) {
            return [false, null, 0];
        }

        $response = $this->post($path, $body);
        if (is_wp_error($response)) {
            return [false, null, 0];
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        $data = json_decode(wp_remote_retrieve_body($response), true);
        return [$code >= 200 && $code < 300, is_array($data) ? $data : null, $code];
    }

    /**
     * Authenticated GET of a binary path → temp file.
     * Returns [ok, absolute_path|null, error_message].
     */
    public function download_to_file($path, $timeout = 120)
    {
        if (!$this->is_configured()) {
            return [false, null, 'Connector is not configured.'];
        }

        $url = $this->endpoint . $path;
        $headers = [
            'Authorization' => 'Bearer ' . $this->key,
            'Accept'        => 'application/zip, application/octet-stream, */*',
        ];

        $tmp = wp_tempnam('avonix-plugin-');
        if (!$tmp) {
            return [false, null, 'Could not create a temporary file.'];
        }

        if ($this->is_local_endpoint() && function_exists('curl_init')) {
            $header_lines = [];
            foreach ($headers as $k => $v) {
                $header_lines[] = $k . ': ' . $v;
            }
            $fp = fopen($tmp, 'wb');
            if (!$fp) {
                @unlink($tmp);
                return [false, null, 'Could not open temporary file for writing.'];
            }
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_FILE           => $fp,
                CURLOPT_TIMEOUT        => $timeout,
                CURLOPT_CONNECTTIMEOUT => min(10, $timeout),
                CURLOPT_HTTPHEADER     => $header_lines,
                CURLOPT_FOLLOWLOCATION => true,
            ]);
            $ok = curl_exec($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);
            fclose($fp);
            if (!$ok || $code !== 200) {
                @unlink($tmp);
                return [false, null, $err !== '' ? $err : ('HTTP ' . $code)];
            }
            return [true, $tmp, null];
        }

        $restore = $this->allow_local_endpoint();
        $response = wp_remote_get($url, [
            'timeout'            => $timeout,
            'headers'            => $headers,
            'reject_unsafe_urls' => false,
        ]);
        $restore();

        if (is_wp_error($response)) {
            @unlink($tmp);
            return [false, null, $response->get_error_message()];
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        if ($code !== 200) {
            @unlink($tmp);
            return [false, null, 'HTTP ' . $code];
        }

        $body = wp_remote_retrieve_body($response);
        if ($body === '' || $body === null) {
            @unlink($tmp);
            return [false, null, 'Empty download body.'];
        }

        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
        if (file_put_contents($tmp, $body) === false) {
            @unlink($tmp);
            return [false, null, 'Could not write zip to disk.'];
        }

        return [true, $tmp, null];
    }

    /**
     * GET published CTA config for this site (ADR-009).
     * Returns decoded JSON array or null.
     */
    public function get_cta_config()
    {
        if (!$this->is_configured()) {
            return null;
        }

        $response = $this->get('/api/v1/connector/cta', 8);

        if (is_wp_error($response)) {
            return null;
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        if ($code !== 200) {
            return null;
        }

        $data = json_decode(wp_remote_retrieve_body($response), true);
        return is_array($data) ? $data : null;
    }

    /**
     * GET published popups for this site (ADR-010).
     */
    public function get_popups_config()
    {
        if (!$this->is_configured()) {
            return null;
        }

        $response = $this->get('/api/v1/connector/popups', 8);

        if (is_wp_error($response)) {
            return null;
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        if ($code !== 200) {
            return null;
        }

        $data = json_decode(wp_remote_retrieve_body($response), true);
        return is_array($data) ? $data : null;
    }

    /**
     * GET languages / translator switcher config for this site.
     */
    public function get_languages_config()
    {
        if (!$this->is_configured()) {
            return null;
        }

        $response = $this->get('/api/v1/connector/languages', 8);

        if (is_wp_error($response)) {
            return null;
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        if ($code !== 200) {
            return null;
        }

        $data = json_decode(wp_remote_retrieve_body($response), true);
        return is_array($data) ? $data : null;
    }

    private function get($path, $timeout = 10)
    {
        return $this->request('GET', $path, null, $timeout);
    }

    private function post($path, array $body, $timeout = 10)
    {
        return $this->request('POST', $path, $body, $timeout);
    }

    /**
     * @param string     $method
     * @param string     $path
     * @param array|null $body
     * @param int        $timeout
     * @return array|\WP_Error
     */
    private function request($method, $path, $body = null, $timeout = 10)
    {
        $url = $this->endpoint . $path;
        $headers = [
            'Authorization' => 'Bearer ' . $this->key,
            'Accept'        => 'application/json',
        ];
        if ($method === 'POST') {
            $headers['Content-Type'] = 'application/json';
        }

        // Local Avonix (loopback / LAN / non-80 ports): prefer PHP curl so we
        // are not blocked by WordPress "safe URL" / Local Network quirks.
        if ($this->is_local_endpoint() && function_exists('curl_init')) {
            return $this->curl_request($method, $url, $headers, $body, $timeout);
        }

        $restore = $this->allow_local_endpoint();
        $args = [
            'method'              => $method,
            'timeout'             => $timeout,
            'headers'             => $headers,
            'reject_unsafe_urls'  => false,
        ];
        if ($method === 'POST') {
            $args['body'] = wp_json_encode($body ?? []);
        }
        $response = wp_remote_request($url, $args);
        $restore();
        return $response;
    }

    /** True when the configured endpoint is a local/dev host. */
    private function is_local_endpoint()
    {
        $parsed = wp_parse_url($this->endpoint);
        $host = isset($parsed['host']) ? strtolower((string) $parsed['host']) : '';
        if ($host === '') {
            return false;
        }
        if ($host === 'localhost' || $host === '127.0.0.1' || $host === '::1' || $host === 'host.docker.internal') {
            return true;
        }
        // Private LAN ranges (Local WP → Mac host IP).
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return !filter_var(
                $host,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
            );
        }
        return (bool) preg_match('/\.local$/', $host);
    }

    /**
     * @param string     $method
     * @param string     $url
     * @param array      $headers
     * @param array|null $body
     * @param int        $timeout
     * @return array|\WP_Error WordPress-shaped response
     */
    private function curl_request($method, $url, array $headers, $body, $timeout)
    {
        $header_lines = [];
        foreach ($headers as $k => $v) {
            $header_lines[] = $k . ': ' . $v;
        }

        $ch = curl_init($url);
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => min(5, $timeout),
            CURLOPT_HTTPHEADER     => $header_lines,
            CURLOPT_CUSTOMREQUEST  => $method,
        ];
        if ($method === 'POST') {
            $opts[CURLOPT_POSTFIELDS] = wp_json_encode($body ?? []);
        }
        curl_setopt_array($ch, $opts);

        $raw = curl_exec($ch);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($raw === false || $errno) {
            $hint = '';
            if ($errno === 7) {
                $hint = ' Is Avonix running (npm run dev)? On Local WP use http://127.0.0.1:3000 — not a LAN IP.';
            }
            return new \WP_Error(
                'http_request_failed',
                'cURL error ' . $errno . ': ' . $error . $hint
            );
        }

        return [
            'headers'  => [],
            'body'     => $raw,
            'response' => [
                'code'    => $code,
                'message' => '',
            ],
            'cookies'  => [],
            'filename' => null,
        ];
    }

    /**
     * WordPress blocks loopback hosts and ports outside {80,443,8080}.
     * Local Avonix (`http://127.0.0.1:3000`) needs a temporary whitelist.
     *
     * @return callable restore function
     */
    private function allow_local_endpoint()
    {
        $parsed = wp_parse_url($this->endpoint);
        $host = isset($parsed['host']) ? (string) $parsed['host'] : '';
        $port = isset($parsed['port']) ? (int) $parsed['port'] : 0;

        $allow_host = static function ($is_external, $check_host) use ($host) {
            return ($host !== '' && $check_host === $host) ? true : $is_external;
        };
        $allow_port = static function ($ports) use ($port) {
            if ($port > 0 && is_array($ports) && !in_array($port, $ports, true)) {
                $ports[] = $port;
            }
            return $ports;
        };
        $allow_args = static function ($args) {
            $args['reject_unsafe_urls'] = false;
            return $args;
        };

        add_filter('http_request_host_is_external', $allow_host, 10, 2);
        add_filter('http_allowed_safe_ports', $allow_port, 10, 1);
        add_filter('http_request_args', $allow_args, 10, 1);

        return static function () use ($allow_host, $allow_port, $allow_args) {
            remove_filter('http_request_host_is_external', $allow_host, 10);
            remove_filter('http_allowed_safe_ports', $allow_port, 10);
            remove_filter('http_request_args', $allow_args, 10);
        };
    }
}
