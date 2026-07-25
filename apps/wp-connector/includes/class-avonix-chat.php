<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Injects the CEP chat widget and proxies its messages (ADR-011 P1).
 *
 * Surfaces: floating bubble (auto) + inline wizard shortcode [avonix_chat].
 * The browser never sees the connector key.
 */
class Avonix_Chat
{
    public function __construct()
    {
        add_action('wp_enqueue_scripts', [$this, 'enqueue']);
        add_shortcode('avonix_chat', [$this, 'shortcode']);
        add_action('wp_ajax_avonix_chat', [$this, 'proxy']);
        add_action('wp_ajax_nopriv_avonix_chat', [$this, 'proxy']);
        add_action('wp_ajax_avonix_chat_poll', [$this, 'proxy_poll']);
        add_action('wp_ajax_nopriv_avonix_chat_poll', [$this, 'proxy_poll']);
        add_action('wp_ajax_avonix_chat_stream', [$this, 'proxy_stream']);
        add_action('wp_ajax_nopriv_avonix_chat_stream', [$this, 'proxy_stream']);
    }

    private function build_payload($surface = 'bubble')
    {
        $payload = [
            'proxy'       => admin_url('admin-ajax.php'),
            'nonce'       => wp_create_nonce('avonix_chat'),
            'surface'     => $surface,
            'title'       => get_option(AVONIX_OPT_CHAT_TITLE, 'Ask us anything'),
            'greeting'    => get_option(AVONIX_OPT_CHAT_GREETING, ''),
            'color'       => get_option(AVONIX_OPT_CHAT_COLOR, '#ff6600'),
            'placeholder' => 'Type a message…',
            'theme'       => [
                'primaryColor'    => get_option(AVONIX_OPT_CHAT_COLOR, '#ff6600'),
                'headerColor'     => get_option(AVONIX_OPT_CHAT_COLOR, '#ff6600'),
                'pulse'           => true,
                'onlineIndicator' => true,
            ],
            'triggers'    => ['delayMs' => 0],
            'modules'     => [
                'leadForm'      => true,
                'transferAgent' => true,
                'sounds'        => true,
                'streaming'     => true,
            ],
            'quick_replies' => [],
        ];

        $client = new Avonix_Client();
        $cloud = $client->get_chat_config();
        if (!is_array($cloud)) {
            return $payload;
        }

        $w = null;
        if ($surface === 'wizard' && !empty($cloud['wizard']) && is_array($cloud['wizard'])) {
            $w = $cloud['wizard'];
        } elseif (!empty($cloud['widget']) && is_array($cloud['widget'])) {
            $w = $cloud['widget'];
        }

        if (!$w) {
            return $payload;
        }

        if (!empty($w['title'])) {
            $payload['title'] = $w['title'];
        }
        if (isset($w['greeting'])) {
            $payload['greeting'] = (string) $w['greeting'];
        }
        if (!empty($w['placeholder'])) {
            $payload['placeholder'] = $w['placeholder'];
        }
        if (!empty($w['theme']) && is_array($w['theme'])) {
            $payload['theme'] = array_merge($payload['theme'], $w['theme']);
            if (!empty($w['theme']['primaryColor'])) {
                $payload['color'] = $w['theme']['primaryColor'];
            }
        }
        if (!empty($w['triggers']) && is_array($w['triggers'])) {
            $payload['triggers'] = $w['triggers'];
        }
        if (!empty($w['modules']) && is_array($w['modules'])) {
            $payload['modules'] = array_merge($payload['modules'], $w['modules']);
        }
        if (!empty($w['id'])) {
            $payload['widget_id'] = $w['id'];
        }
        if (!empty($w['bot_avatar_url'])) {
            $payload['bot_avatar_url'] = $w['bot_avatar_url'];
        }
        if (!empty($w['agent_avatar_url'])) {
            $payload['agent_avatar_url'] = $w['agent_avatar_url'];
        }
        if (!empty($w['lead_form']) && is_array($w['lead_form'])) {
            $payload['lead_form'] = $w['lead_form'];
        }
        if (!empty($w['quick_replies']) && is_array($w['quick_replies'])) {
            $payload['quick_replies'] = $w['quick_replies'];
        }
        if (!empty($w['surface'])) {
            $payload['surface'] = $w['surface'];
        }

        return $payload;
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
        $payload = $this->build_payload('bubble');

        wp_enqueue_script(
            'avonix-widget',
            $endpoint . '/widget.js',
            [],
            AVONIX_VERSION,
            true
        );

        wp_add_inline_script(
            'avonix-widget',
            'window.AVONIX_CHAT = ' . wp_json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ';',
            'before'
        );
    }

    /**
     * Inline Chat Wizard: [avonix_chat] or [avonix_chat surface="wizard"]
     */
    public function shortcode($atts)
    {
        if (get_option(AVONIX_OPT_CHAT_ENABLED, '0') !== '1') {
            return '';
        }

        $client = new Avonix_Client();
        if (!$client->is_configured()) {
            return '';
        }

        $atts = shortcode_atts(
            [
                'surface' => 'wizard',
            ],
            $atts,
            'avonix_chat'
        );

        $endpoint = untrailingslashit((string) get_option(AVONIX_OPT_ENDPOINT, ''));
        $payload = $this->build_payload('wizard');
        $payload['surface'] = 'wizard';
        $payload['mount'] = '#avonix-chat-wizard';

        // Ensure script is present even if bubble enqueue skipped somehow
        wp_enqueue_script(
            'avonix-widget',
            $endpoint . '/widget.js',
            [],
            AVONIX_VERSION,
            true
        );
        wp_add_inline_script(
            'avonix-widget',
            'window.AVONIX_CHAT = ' . wp_json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ';',
            'before'
        );

        return '<div id="avonix-chat-wizard" data-avonix-chat-wizard class="avonix-chat-wizard" style="width:100%;min-height:420px;"></div>';
    }

    /** Forwards one message, then returns the reply as JSON. */
    public function proxy()
    {
        if (!check_ajax_referer('avonix_chat', 'nonce', false)) {
            wp_send_json(['reply' => 'Your session expired. Please reload the page.'], 200);
        }

        $message = isset($_POST['message'])
            ? sanitize_textarea_field(wp_unslash($_POST['message']))
            : '';

        $chat_action = isset($_POST['chat_action'])
            ? sanitize_text_field(wp_unslash($_POST['chat_action']))
            : '';

        if ($message === '' && $chat_action === '') {
            wp_send_json(['reply' => 'Please type a question.'], 200);
        }

        $conversation = isset($_POST['conversation_id'])
            ? sanitize_text_field(wp_unslash($_POST['conversation_id']))
            : '';

        $widget_id = isset($_POST['widget_id'])
            ? sanitize_text_field(wp_unslash($_POST['widget_id']))
            : '';

        $surface = isset($_POST['surface'])
            ? sanitize_text_field(wp_unslash($_POST['surface']))
            : 'bubble';

        $payload = [
            'message'         => $message !== '' ? $message : ($chat_action === 'transfer_agent' ? 'Talk to a human' : 'Form'),
            'conversation_id' => $conversation !== '' ? $conversation : null,
            'widget_id'       => $widget_id !== '' ? $widget_id : null,
            'surface'         => $surface,
            'page_url'        => home_url('/'),
        ];
        if ($chat_action === 'transfer_agent' || $chat_action === 'start_form') {
            $payload['action'] = $chat_action;
        }

        $result = (new Avonix_Client())->chat($payload);
        wp_send_json($result, 200);
    }

    /** Poll for agent / system messages after a cursor. */
    public function proxy_poll()
    {
        if (!check_ajax_referer('avonix_chat', 'nonce', false)) {
            wp_send_json(['messages' => []], 200);
        }

        $conversation = isset($_POST['conversation_id'])
            ? sanitize_text_field(wp_unslash($_POST['conversation_id']))
            : '';
        if ($conversation === '') {
            wp_send_json(['messages' => []], 200);
        }

        $after = isset($_POST['after'])
            ? sanitize_text_field(wp_unslash($_POST['after']))
            : '';

        $result = (new Avonix_Client())->chat_poll($conversation, $after !== '' ? $after : null);
        wp_send_json($result, 200);
    }

    /** SSE stream proxy (token events → browser). */
    public function proxy_stream()
    {
        if (!check_ajax_referer('avonix_chat', 'nonce', false)) {
            status_header(403);
            header('Content-Type: text/event-stream');
            echo "event: error\ndata: " . wp_json_encode(['message' => 'Session expired.']) . "\n\n";
            exit;
        }

        $message = isset($_POST['message'])
            ? sanitize_textarea_field(wp_unslash($_POST['message']))
            : '';
        if ($message === '') {
            status_header(400);
            header('Content-Type: text/event-stream');
            echo "event: error\ndata: " . wp_json_encode(['message' => 'Empty message.']) . "\n\n";
            exit;
        }

        $conversation = isset($_POST['conversation_id'])
            ? sanitize_text_field(wp_unslash($_POST['conversation_id']))
            : '';
        $surface = isset($_POST['surface'])
            ? sanitize_text_field(wp_unslash($_POST['surface']))
            : 'bubble';

        // Disable buffering so tokens flush to the browser.
        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        header('Content-Type: text/event-stream; charset=utf-8');
        header('Cache-Control: no-cache, no-transform');
        header('X-Accel-Buffering: no');

        (new Avonix_Client())->chat_stream([
            'message'         => $message,
            'conversation_id' => $conversation !== '' ? $conversation : null,
            'surface'         => $surface,
        ]);
        exit;
    }
}
