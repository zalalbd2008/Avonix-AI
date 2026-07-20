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
            'sanitize_callback' => 'esc_url_raw',
            'default'           => 'https://app.avonix.ai',
        ]);
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
                                   value="<?php echo esc_attr(get_option(AVONIX_OPT_ENDPOINT, 'https://app.avonix.ai')); ?>">
                        </td>
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
