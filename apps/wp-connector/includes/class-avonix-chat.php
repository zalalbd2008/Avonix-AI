<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Injects the chat widget and proxies its messages.
 *
 * The browser never sees the connector key. The widget posts to admin-ajax on
 * this site, and this class forwards the message with the key attached
 * server-side. Putting the key in the page would let anyone read it and write
 * into the agency's CRM as this site.
 */
class Avonix_Chat
{
    public function __construct()
    {
        add_action('wp_enqueue_scripts', [$this, 'enqueue']);
        add_action('wp_ajax_avonix_chat', [$this, 'proxy']);
        add_action('wp_ajax_nopriv_avonix_chat', [$this, 'proxy']);
    }

    public function enqueue()
    {
        if (get_option(AVONIX_OPT_CHAT_ENABLED, '0') !== '1') {
            return;
        }

        $client = new Avonix_Client();
        if (!$client->is_configured()) {
            return;
        }

        $endpoint = untrailingslashit((string) get_option(AVONIX_OPT_ENDPOINT, ''));

        wp_enqueue_script(
            'avonix-widget',
            $endpoint . '/widget.js',
            [],
            AVONIX_VERSION,
            true
        );

        wp_add_inline_script(
            'avonix-widget',
            'window.AVONIX_CHAT = ' . wp_json_encode([
                'proxy'    => admin_url('admin-ajax.php'),
                'nonce'    => wp_create_nonce('avonix_chat'),
                'title'    => get_option(AVONIX_OPT_CHAT_TITLE, 'Ask us anything'),
                'greeting' => get_option(AVONIX_OPT_CHAT_GREETING, ''),
                'color'    => get_option(AVONIX_OPT_CHAT_COLOR, '#ff6600'),
            ]) . ';',
            'before'
        );
    }

    /** Forwards one message, then returns the reply as JSON. */
    public function proxy()
    {
        // Nonces are per-session, so this is bot friction rather than
        // authentication — the real controls are the per-site rate limit and
        // AI quota on the server.
        if (!check_ajax_referer('avonix_chat', 'nonce', false)) {
            wp_send_json(['reply' => 'Your session expired. Please reload the page.'], 200);
        }

        $message = isset($_POST['message'])
            ? sanitize_textarea_field(wp_unslash($_POST['message']))
            : '';

        if ($message === '') {
            wp_send_json(['reply' => 'Please type a question.'], 200);
        }

        $conversation = isset($_POST['conversation_id'])
            ? sanitize_text_field(wp_unslash($_POST['conversation_id']))
            : '';

        $result = (new Avonix_Client())->chat([
            'message'         => $message,
            'conversation_id' => $conversation !== '' ? $conversation : null,
            'page_url'        => home_url(add_query_arg([], $GLOBALS['wp']->request ?? '')),
        ]);

        wp_send_json($result, 200);
    }
}
