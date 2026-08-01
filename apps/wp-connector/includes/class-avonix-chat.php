<?php
if (!defined('ABSPATH')) {
    exit;
}

if (class_exists('Avonix_Chat')) {
    return;
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
        add_filter('script_loader_tag', [$this, 'script_tag'], 10, 3);
    }

    /**
     * Mark the chat widget script so page optimizers leave it alone.
     */
    public function script_tag($tag, $handle, $src)
    {
        if ($handle !== 'avonix-widget') {
            return $tag;
        }
        if (strpos($tag, 'data-no-optimize') === false) {
            $tag = str_replace('<script ', '<script data-no-optimize="1" data-cfasync="false" ', $tag);
        }
        return $tag;
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
        if (!empty($w['page_target']) && is_array($w['page_target'])) {
            $payload['page_target'] = $w['page_target'];
        }

        $payload['path'] = Avonix_Page_Target::current_path();
        $payload['wp_surface'] = Avonix_Page_Target::current_surface();
        $payload['show_bubble'] = Avonix_Page_Target::matches(
            isset($payload['page_target']) && is_array($payload['page_target'])
                ? $payload['page_target']
                : null,
            $payload['path'],
            $payload['wp_surface']
        );

        return $payload;
    }

    public function enqueue()
    {
        $client = new Avonix_Client();
        if (!$client->is_configured()) {
            return;
        }

        $localOn = get_option(AVONIX_OPT_CHAT_ENABLED, '0') === '1';
        $payload = $this->build_payload('bubble');

        // Cloud "Enabled on site" + published bubble must show even when the WP
        // checkbox was never ticked (default is off).
        $cloudOn = !empty($payload['widget_id']);
        if ($cloudOn && !$localOn) {
            update_option(AVONIX_OPT_CHAT_ENABLED, '1', false);
            $localOn = true;
        }
        if (!$localOn && !$cloudOn) {
            return;
        }

        $endpoint = untrailingslashit((string) get_option(AVONIX_OPT_ENDPOINT, ''));
        if ($endpoint === '') {
            return;
        }

        wp_enqueue_script(
            'avonix-widget',
            $endpoint . '/widget.js',
            [],
            AVONIX_VERSION,
            true
        );

        // Keep LiteSpeed / optimizers from combining or deferring the external widget.
        wp_script_add_data('avonix-widget', 'data-no-optimize', '1');
        wp_script_add_data('avonix-widget', 'strategy', 'defer');

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
        $client = new Avonix_Client();
        if (!$client->is_configured()) {
            return '';
        }

        $atts = shortcode_atts(
            [
                'surface' => 'wizard',
                'height'  => '560px',
            ],
            $atts,
            'avonix_chat'
        );

        $endpoint = untrailingslashit((string) get_option(AVONIX_OPT_ENDPOINT, ''));
        $payload = $this->build_payload('wizard');
        $cloudOn = !empty($payload['widget_id']);
        $localOn = get_option(AVONIX_OPT_CHAT_ENABLED, '0') === '1';
        if ($cloudOn && !$localOn) {
            update_option(AVONIX_OPT_CHAT_ENABLED, '1', false);
            $localOn = true;
        }
        if (!$localOn && !$cloudOn) {
            return '';
        }

        $payload['surface'] = 'wizard';
        $payload['mount'] = '#avonix-chat-wizard';
        $payload['embed'] = true;

        // Keep floating bubble settings from the site bubble widget.
        $bubble = $this->build_payload('bubble');
        if (isset($bubble['show_bubble'])) {
            $payload['show_bubble'] = !empty($bubble['show_bubble']);
        }
        if (!empty($bubble['page_target']) && is_array($bubble['page_target'])) {
            $payload['page_target'] = $bubble['page_target'];
        }
        if (!empty($bubble['theme']) && is_array($bubble['theme'])) {
            // Bubble must win placement (leftPercent/topPercent/position) so the
            // floating FAB stays where the studio saved it — wizard theme must
            // not overwrite those keys (that pinned the icon to the top-left).
            $payload['bubble_theme'] = $bubble['theme'];
            $payload['theme'] = array_merge($payload['theme'] ?? [], $bubble['theme']);
        }
        $payload['path'] = Avonix_Page_Target::current_path();
        $payload['wp_surface'] = Avonix_Page_Target::current_surface();

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

        $height = isset($atts['height']) ? preg_replace('/[^0-9.%]/', '', (string) $atts['height']) : '';
        if ($height === '') {
            $height = '560px';
        } elseif (is_numeric($height)) {
            $height .= 'px';
        }

        return '<div id="avonix-chat-wizard" data-avonix-chat-wizard class="avonix-chat-wizard" style="display:flex;flex-direction:column;width:100%;height:' . esc_attr($height) . ';min-height:' . esc_attr($height) . ';max-width:100%;box-sizing:border-box;"></div>';
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
