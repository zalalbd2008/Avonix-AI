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
    /** Query flag for the standalone iframe document. */
    const CHAT_EMBED_QUERY = 'avonix_chat_embed';

    /** @var bool */
    private static $suppress_floating = false;

    /** @var bool */
    private static $inline_rendered = false;

    public function __construct()
    {
        add_action('template_redirect', [$this, 'maybe_serve_chat_embed'], 0);
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

    /** Whether an inline shortcode asked to hide the floating bubble. */
    public static function should_suppress_floating()
    {
        return self::$suppress_floating;
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
        if (!empty($w['faq']) && is_array($w['faq'])) {
            $payload['faq'] = $w['faq'];
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

        if (!empty($cloud['fab_group']) && is_array($cloud['fab_group'])) {
            $payload['fab_group'] = $cloud['fab_group'];
        }

        return $payload;
    }

    /**
     * Prefer the plugin-bundled widget.js (ships with connector updates).
     * Falls back to the cloud endpoint copy when the local file is missing.
     */
    private function widget_script()
    {
        $local = dirname(AVONIX_PLUGIN_FILE) . '/assets/js/widget.js';
        if (is_readable($local)) {
            return [
                'src'     => plugins_url('assets/js/widget.js', AVONIX_PLUGIN_FILE),
                'version' => (string) filemtime($local),
            ];
        }

        $endpoint = untrailingslashit((string) get_option(AVONIX_OPT_ENDPOINT, ''));
        return [
            'src'     => $endpoint !== '' ? $endpoint . '/widget.js' : '',
            'version' => AVONIX_VERSION,
        ];
    }

    public function enqueue()
    {
        if (self::$suppress_floating) {
            return;
        }

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

        $script = $this->widget_script();
        if ($script['src'] === '') {
            return;
        }

        wp_enqueue_script(
            'avonix-widget',
            $script['src'],
            [],
            $script['version'],
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

        if (!empty($payload['fab_group']) && is_array($payload['fab_group'])) {
            avonix_enqueue_fab_stack($payload['fab_group']);
        } else {
            avonix_enqueue_fab_stack();
        }
    }

    /**
     * Inline / iframe chat: [avonix_chat]
     *
     * Attributes (Nexus parity):
     *   height, max_width, full_width, mode=inline|iframe, hide_floating, surface
     */
    public function shortcode($atts)
    {
        $client = new Avonix_Client();
        if (!$client->is_configured()) {
            return '';
        }

        $atts = shortcode_atts(
            [
                'surface'       => 'wizard',
                'height'        => '680',
                'width'         => '100%',
                'max_width'     => 'none',
                'full_width'    => 'no',
                'mode'          => 'inline',
                // Default: keep floating bubble + inline embed together.
                'hide_floating' => 'no',
            ],
            $atts,
            'avonix_chat'
        );

        $payload = $this->build_payload('wizard');
        $cloudOn = !empty($payload['widget_id']);
        $localOn = get_option(AVONIX_OPT_CHAT_ENABLED, '0') === '1';
        if ($cloudOn && !$localOn) {
            update_option(AVONIX_OPT_CHAT_ENABLED, '1', false);
            $localOn = true;
        }
        if (!$localOn && !$cloudOn) {
            return current_user_can('manage_options')
                ? '<p class="avonix-chat-embed-notice">Avonix chat is off. Enable Live Chat in the Avonix dashboard or Settings → Avonix.</p>'
                : '';
        }

        if (strtolower(trim((string) $atts['hide_floating'])) === 'yes') {
            self::$suppress_floating = true;
        }

        $height_px = max(320, min(1200, (int) $atts['height']));
        if ($height_px < 320) {
            $height_px = 680;
        }
        $width = $this->sanitize_css_length((string) $atts['width'], '100%');
        $max_width = $this->sanitize_css_length((string) $atts['max_width'], 'none');
        $is_bleed = strtolower(trim((string) $atts['full_width'])) !== 'no';
        $box_style = sprintf(
            'width:%s;max-width:%s;--avx-chat-h:%dpx;',
            $width,
            $max_width,
            $height_px
        );

        $css_url = plugins_url('assets/css/chat-embed.css', AVONIX_PLUGIN_FILE);
        wp_enqueue_style('avonix-chat-embed', $css_url, [], AVONIX_VERSION);

        $hide_float = strtolower(trim((string) $atts['hide_floating'])) === 'yes';

        if ($hide_float) {
            // Enqueue may have already printed AVONIX_CHAT for the FAB — force it off.
            wp_add_inline_script(
                'avonix-widget',
                'window.AVONIX_CHAT=Object.assign(window.AVONIX_CHAT||{},{show_bubble:false});',
                'before'
            );
        }

        if (strtolower(trim((string) $atts['mode'])) === 'iframe') {
            $title = get_option(AVONIX_OPT_CHAT_TITLE, 'Chat');
            return sprintf(
                '<div class="avonix-chat-embed%1$s" style="%2$s">'
                    . '<div class="avonix-chat-embed__frame">'
                        . '<iframe src="%3$s" title="%4$s" loading="lazy" allow="microphone; clipboard-write"></iframe>'
                    . '</div>'
                . '</div>',
                $is_bleed ? ' is-bleed' : '',
                esc_attr($box_style),
                esc_url($this->chat_embed_url()),
                esc_attr((string) $title)
            );
        }

        if (self::$inline_rendered) {
            return current_user_can('manage_options')
                ? '<p class="avonix-chat-embed-notice">Avonix: only one inline chat can run per page.</p>'
                : '';
        }
        self::$inline_rendered = true;

        return $this->render_inline_wizard($payload, $box_style, $is_bleed, $height_px, $hide_float);
    }

    /** Standalone document for iframe embeds (?avonix_chat_embed=1). */
    public function maybe_serve_chat_embed()
    {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        if (empty($_GET[self::CHAT_EMBED_QUERY])) {
            return;
        }

        nocache_headers();

        $client = new Avonix_Client();
        if (!$client->is_configured()) {
            status_header(404);
            wp_die(esc_html__('Chat unavailable', 'avonix'), esc_html__('Chat unavailable', 'avonix'), ['response' => 404]);
        }

        $payload = $this->build_payload('wizard');
        $cloudOn = !empty($payload['widget_id']);
        $localOn = get_option(AVONIX_OPT_CHAT_ENABLED, '0') === '1';
        if (!$localOn && !$cloudOn) {
            status_header(404);
            wp_die(
                esc_html__('Live chat is turned off.', 'avonix'),
                esc_html__('Chat unavailable', 'avonix'),
                ['response' => 404]
            );
        }

        self::$suppress_floating = true;

        $payload['surface'] = 'wizard';
        $payload['mount'] = '#avonix-chat-wizard';
        $payload['embed'] = true;
        $payload['embed_doc'] = true;

        $bubble = $this->build_payload('bubble');
        if (!empty($bubble['theme']) && is_array($bubble['theme'])) {
            $payload['bubble_theme'] = $bubble['theme'];
            $payload['theme'] = array_merge($payload['theme'] ?? [], $bubble['theme']);
        }
        $payload['path'] = Avonix_Page_Target::current_path();
        $payload['wp_surface'] = Avonix_Page_Target::current_surface();

        $script = $this->widget_script();
        add_action(
            'wp_enqueue_scripts',
            function () use ($script, $payload) {
                if ($script['src'] !== '') {
                    wp_enqueue_script(
                        'avonix-widget',
                        $script['src'],
                        [],
                        $script['version'],
                        true
                    );
                    wp_add_inline_script(
                        'avonix-widget',
                        'window.AVONIX_CHAT = ' . wp_json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ';',
                        'before'
                    );
                }
                $css = plugins_url('assets/css/chat-embed.css', AVONIX_PLUGIN_FILE);
                wp_enqueue_style('avonix-chat-embed', $css, [], AVONIX_VERSION);
            },
            20
        );

        $avonix_chat_embed_html = '<div id="avonix-chat-wizard" data-avonix-chat-wizard class="avonix-chat-wizard avonix-chat-wizard--embed-doc" style="display:flex;flex-direction:column;width:100%;height:100%;min-height:100%;max-width:100%;box-sizing:border-box;"></div>';

        $partial = dirname(AVONIX_PLUGIN_FILE) . '/assets/partials/chat-embed.php';
        if (file_exists($partial)) {
            require $partial;
        }
        exit;
    }

    private function chat_embed_url()
    {
        return add_query_arg(self::CHAT_EMBED_QUERY, '1', home_url('/'));
    }

    private function render_inline_wizard(array $payload, $box_style, $is_bleed, $height_px, $hide_float = true)
    {
        $payload['surface'] = 'wizard';
        $payload['mount'] = '#avonix-chat-wizard';
        $payload['embed'] = true;
        if ($hide_float) {
            $payload['show_bubble'] = false;
        }

        $bubble = $this->build_payload('bubble');
        if (!$hide_float && isset($bubble['show_bubble'])) {
            $payload['show_bubble'] = !empty($bubble['show_bubble']);
        }
        if (!empty($bubble['page_target']) && is_array($bubble['page_target'])) {
            $payload['page_target'] = $bubble['page_target'];
        }
        if (!empty($bubble['theme']) && is_array($bubble['theme'])) {
            $payload['bubble_theme'] = $bubble['theme'];
            $payload['theme'] = array_merge($payload['theme'] ?? [], $bubble['theme']);
        }
        $payload['path'] = Avonix_Page_Target::current_path();
        $payload['wp_surface'] = Avonix_Page_Target::current_surface();

        $script = $this->widget_script();
        if ($script['src'] !== '') {
            wp_enqueue_script(
                'avonix-widget',
                $script['src'],
                [],
                $script['version'],
                true
            );
        }
        wp_add_inline_script(
            'avonix-widget',
            'window.AVONIX_CHAT = ' . wp_json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ';',
            'before'
        );

        $inner = sprintf(
            '<div id="avonix-chat-wizard" data-avonix-chat-wizard class="avonix-chat-wizard" style="display:flex;flex-direction:column;width:100%%;height:clamp(320px,145cqw,%1$dpx);min-height:320px;max-height:%1$dpx;max-width:100%%;box-sizing:border-box;"></div>',
            (int) $height_px
        );

        return sprintf(
            '<div class="avonix-chat-inline%1$s"><div class="avonix-chat-inline__box" style="%2$s">%3$s</div></div>',
            $is_bleed ? ' is-bleed' : '',
            esc_attr($box_style),
            $inner
        );
    }

    private function sanitize_css_length($raw, $fallback)
    {
        $raw = trim((string) $raw);
        if ($raw === '' || strtolower($raw) === 'none' || strtolower($raw) === 'auto') {
            return $raw === '' ? $fallback : strtolower($raw);
        }
        if (preg_match('/^\d+(\.\d+)?(px|%|rem|em|vw|vh)$/i', $raw)) {
            return $raw;
        }
        if (is_numeric($raw)) {
            return $raw . 'px';
        }
        return $fallback;
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

        $email = isset($_POST['email'])
            ? sanitize_email(wp_unslash($_POST['email']))
            : '';
        $name = isset($_POST['name'])
            ? sanitize_text_field(wp_unslash($_POST['name']))
            : '';
        $phone = isset($_POST['phone'])
            ? sanitize_text_field(wp_unslash($_POST['phone']))
            : '';

        $payload = [
            'message'         => $message !== ''
                ? $message
                : ($chat_action === 'transfer_agent'
                    ? 'Talk to a human'
                    : ($chat_action === 'prechat_lead' ? '' : 'Form')),
            'conversation_id' => $conversation !== '' ? $conversation : null,
            'widget_id'       => $widget_id !== '' ? $widget_id : null,
            'surface'         => $surface,
            'page_url'        => home_url('/'),
        ];
        if ($email !== '') {
            $payload['email'] = $email;
        }
        if ($name !== '') {
            $payload['name'] = $name;
        }
        if ($phone !== '') {
            $payload['phone'] = substr($phone, 0, 50);
        }
        if (
            $chat_action === 'transfer_agent' ||
            $chat_action === 'start_form' ||
            $chat_action === 'prechat_lead'
        ) {
            $payload['action'] = $chat_action;
        }

        $attachment_name = isset($_POST['attachment_name'])
            ? sanitize_text_field(wp_unslash($_POST['attachment_name']))
            : '';
        $attachment_content = isset($_POST['attachment_content'])
            ? wp_unslash($_POST['attachment_content'])
            : '';
        $attachment_encoding = isset($_POST['attachment_encoding'])
            ? sanitize_text_field(wp_unslash($_POST['attachment_encoding']))
            : 'text';
        if ($attachment_name !== '' && $attachment_content !== '') {
            $payload['attachment_name'] = substr($attachment_name, 0, 200);
            $payload['attachment_content'] = substr($attachment_content, 0, 500000);
            $payload['attachment_encoding'] = $attachment_encoding === 'base64' ? 'base64' : 'text';
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
            'email'           => isset($_POST['email'])
                ? sanitize_email(wp_unslash($_POST['email']))
                : '',
            'name'            => isset($_POST['name'])
                ? sanitize_text_field(wp_unslash($_POST['name']))
                : '',
            'phone'           => isset($_POST['phone'])
                ? substr(sanitize_text_field(wp_unslash($_POST['phone'])), 0, 50)
                : '',
            'attachment_name' => isset($_POST['attachment_name'])
                ? substr(sanitize_text_field(wp_unslash($_POST['attachment_name'])), 0, 200)
                : '',
            'attachment_content' => isset($_POST['attachment_content'])
                ? substr(wp_unslash($_POST['attachment_content']), 0, 500000)
                : '',
            'attachment_encoding' => isset($_POST['attachment_encoding'])
                ? sanitize_text_field(wp_unslash($_POST['attachment_encoding']))
                : 'text',
        ]);
        exit;
    }
}
