<?php
if (!defined('ABSPATH')) {
    exit;
}

/** Settings → Avonix AI. Key, endpoint, connection status. */
class Avonix_Settings
{
    public function __construct()
    {
        add_action('admin_menu', [$this, 'menu']);
        add_action('admin_init', [$this, 'register']);
    }

    public function menu()
    {
        add_options_page(
            'Avonix AI',
            'Avonix AI',
            'manage_options',
            'avonix',
            [$this, 'render']
        );
    }

    public function register()
    {
        register_setting('avonix', AVONIX_OPT_KEY, [
            'sanitize_callback' => [$this, 'sanitize_key_value'],
            'default'           => '',
        ]);
        register_setting('avonix', AVONIX_OPT_ENDPOINT, [
            'sanitize_callback' => [$this, 'sanitize_endpoint'],
            'default'           => 'https://app.avonix.ai',
        ]);
        register_setting('avonix', AVONIX_OPT_CHAT_ENABLED, [
            'sanitize_callback' => fn($v) => $v === '1' ? '1' : '0',
            'default'           => '0',
        ]);
        register_setting('avonix', AVONIX_OPT_CHAT_TITLE, [
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => 'Ask us anything',
        ]);
        register_setting('avonix', AVONIX_OPT_CHAT_GREETING, [
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '',
        ]);
        register_setting('avonix', AVONIX_OPT_CHAT_COLOR, [
            'sanitize_callback' => 'sanitize_hex_color',
            'default'           => '#ff6600',
        ]);
    }

    /**
     * Ensure the endpoint is an absolute http(s) URL. Users often paste
     * `localhost:3000` during local dev — Requests then throws
     * "Only HTTP(S) requests are handled."
     */
    public function sanitize_endpoint($value)
    {
        $value = trim((string) $value);
        if ($value === '') {
            return 'https://app.avonix.ai';
        }
        if (!preg_match('#^https?://#i', $value)) {
            $value = 'http://' . $value;
        }
        $clean = esc_url_raw($value);
        return $clean !== '' ? untrailingslashit($clean) : 'https://app.avonix.ai';
    }

    /**
     * Keys look like avx_ + 40 hex characters. Rejecting anything else here
     * turns a typo into a visible error now, rather than silently failing
     * submissions later.
     */
    public function sanitize_key_value($value)
    {
        $value = trim((string) $value);
        if ($value === '') {
            return '';
        }
        if (!preg_match('/^avx_[0-9a-f]{40}$/', $value)) {
            add_settings_error(
                AVONIX_OPT_KEY,
                'avonix_bad_key',
                'That does not look like an Avonix connector key. It starts with "avx_".'
            );
            return (string) get_option(AVONIX_OPT_KEY, '');
        }
        return $value;
    }

    public function render()
    {
        if (!current_user_can('manage_options')) {
            return;
        }

        if (isset($_POST['avonix_test']) && check_admin_referer('avonix_test')) {
            list($ok, $message) = (new Avonix_Client())->register();
            printf(
                '<div class="notice notice-%s"><p>%s</p></div>',
                $ok ? 'success' : 'error',
                esc_html($message)
            );
        }

        $status = (string) get_option(AVONIX_OPT_STATUS, 'not connected');
        $key = (string) get_option(AVONIX_OPT_KEY, '');
        // Never echo the stored key back into HTML: anyone who can view source
        // on this page, or a cached copy of it, would have the site's identity.
        $masked = $key === '' ? '' : substr($key, 0, 12) . str_repeat('•', 12);
        ?>
        <div class="wrap">
            <h1>Avonix AI</h1>
            <p>Status: <strong><?php echo esc_html($status); ?></strong></p>

            <form method="post" action="options.php">
                <?php settings_fields('avonix'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="avonix_key">Connector key</label></th>
                        <td>
                            <input type="text" id="avonix_key" class="regular-text"
                                   name="<?php echo esc_attr(AVONIX_OPT_KEY); ?>"
                                   value="<?php echo esc_attr($key); ?>"
                                   placeholder="avx_…" autocomplete="off" spellcheck="false">
                            <p class="description">
                                <?php echo $masked === ''
                                    ? 'Shown once when the website was added in Avonix.'
                                    : 'Currently ' . esc_html($masked); ?>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="avonix_endpoint">Endpoint</label></th>
                        <td>
                            <input type="url" id="avonix_endpoint" class="regular-text"
                                   name="<?php echo esc_attr(AVONIX_OPT_ENDPOINT); ?>"
                                   value="<?php echo esc_attr(get_option(AVONIX_OPT_ENDPOINT, 'https://app.avonix.ai')); ?>"
                                   placeholder="http://127.0.0.1:3000">
                            <p class="description">
                                Must start with <code>http://</code> or <code>https://</code>.
                                On <strong>Local WP</strong> use <code>http://127.0.0.1:3000</code>
                                (same Mac as Avonix). Do not use a LAN IP like
                                <code>192.168.x.x</code> — Local often cannot reach it.
                                Avonix must be running (<code>npm run dev</code>).
                            </p>
                        </td>
                    </tr>
                </table>

                <h2>Chat widget</h2>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row">Show the widget</th>
                        <td>
                            <label>
                                <input type="checkbox" name="<?php echo esc_attr(AVONIX_OPT_CHAT_ENABLED); ?>"
                                       value="1" <?php checked(get_option(AVONIX_OPT_CHAT_ENABLED, '0'), '1'); ?>>
                                Answer visitor questions from this site's own content
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="avonix_chat_title">Header</label></th>
                        <td><input type="text" id="avonix_chat_title" class="regular-text"
                                   name="<?php echo esc_attr(AVONIX_OPT_CHAT_TITLE); ?>"
                                   value="<?php echo esc_attr(get_option(AVONIX_OPT_CHAT_TITLE, 'Ask us anything')); ?>"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="avonix_chat_greeting">Greeting</label></th>
                        <td><input type="text" id="avonix_chat_greeting" class="regular-text"
                                   name="<?php echo esc_attr(AVONIX_OPT_CHAT_GREETING); ?>"
                                   value="<?php echo esc_attr(get_option(AVONIX_OPT_CHAT_GREETING, '')); ?>"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="avonix_chat_color">Colour</label></th>
                        <td><input type="text" id="avonix_chat_color"
                                   name="<?php echo esc_attr(AVONIX_OPT_CHAT_COLOR); ?>"
                                   value="<?php echo esc_attr(get_option(AVONIX_OPT_CHAT_COLOR, '#ff6600')); ?>"></td>
                    </tr>
                </table>
                <?php submit_button('Save'); ?>
            </form>

            <form method="post">
                <?php wp_nonce_field('avonix_test'); ?>
                <button class="button" name="avonix_test" value="1">Test connection</button>
            </form>

            <h2>Adding a form</h2>
            <p>Put this shortcode on any page:</p>
            <p><code>[avonix_form]</code></p>
        </div>
        <?php
    }
}
