<?php
if (!defined('ABSPATH')) {
    exit;
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
        if ($code === 200) {
            update_option(AVONIX_OPT_STATUS, 'connected');
            return [true, 'Connected.'];
        }
        if ($code === 401) {
            update_option(AVONIX_OPT_STATUS, 'invalid key');
            return [false, 'That connector key was rejected.'];
        }

        update_option(AVONIX_OPT_STATUS, 'error: HTTP ' . $code);
        return [false, 'Unexpected response: HTTP ' . $code];
    }

    /** Forward a submission. Returns [ok, message]. */
    public function submit(array $payload)
    {
        if (!$this->is_configured()) {
            return [false, 'Connector is not configured.'];
        }

        $response = $this->post('/api/v1/connector/submit', $payload);

        if (is_wp_error($response)) {
            return [false, $response->get_error_message()];
        }

        $code = wp_remote_retrieve_response_code($response);
        if ($code === 200) {
            return [true, 'ok'];
        }
        if ($code === 429) {
            return [false, 'Too many submissions right now. Please try again shortly.'];
        }
        return [false, 'Could not send (HTTP ' . $code . ').'];
    }

    private function post($path, array $body)
    {
        return wp_remote_post($this->endpoint . $path, [
            'timeout' => 10,
            'headers' => [
                'Content-Type'  => 'application/json',
                // Bearer, not a query parameter: query strings end up in access
                // logs, browser history and referer headers.
                'Authorization' => 'Bearer ' . $this->key,
            ],
            'body' => wp_json_encode($body),
        ]);
    }
}
