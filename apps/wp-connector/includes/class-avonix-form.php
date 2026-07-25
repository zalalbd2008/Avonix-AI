<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * The [avonix_form] shortcode: a lead form that posts through WordPress to the
 * Avonix API.
 *
 * Submissions go via admin-post rather than straight from the browser, so the
 * connector key never reaches the page. A key in client-side JavaScript is a key
 * anyone can read and use to post leads into someone else's CRM.
 */
class Avonix_Form
{
    public function __construct()
    {
        add_shortcode('avonix_form', [$this, 'render']);
        add_action('admin_post_nopriv_avonix_submit', [$this, 'handle']);
        add_action('admin_post_avonix_submit', [$this, 'handle']);
    }

    public function render($atts)
    {
        $atts = shortcode_atts([
            'title' => 'Get in touch',
            'id'    => '',
        ], $atts, 'avonix_form');
        $sent = isset($_GET['avonix_sent']) ? sanitize_text_field(wp_unslash($_GET['avonix_sent'])) : '';
        $form_id = sanitize_text_field((string) $atts['id']);

        ob_start();

        if ($sent === '1') {
            echo '<p class="avonix-success">Thanks — we\'ll be in touch.</p>';
            return ob_get_clean();
        }
        if ($sent === '0') {
            echo '<p class="avonix-error">Sorry, that did not send. Please try again.</p>';
        }
        ?>
        <form class="avonix-form" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>"<?php echo $form_id !== '' ? ' data-form-id="' . esc_attr($form_id) . '"' : ''; ?>>
            <input type="hidden" name="action" value="avonix_submit">
            <?php if ($form_id !== '') : ?>
                <input type="hidden" name="avonix_form_id" value="<?php echo esc_attr($form_id); ?>">
            <?php endif; ?>
            <?php wp_nonce_field('avonix_submit', 'avonix_nonce'); ?>
            <input type="hidden" name="avonix_page" value="<?php echo esc_attr(home_url(add_query_arg([], $GLOBALS['wp']->request ?? ''))); ?>">

            <h3><?php echo esc_html($atts['title']); ?></h3>

            <p>
                <label>Name<br><input type="text" name="avonix_name" required></label>
            </p>
            <p>
                <label>Email<br><input type="email" name="avonix_email" required></label>
            </p>
            <p>
                <label>Phone<br><input type="text" name="avonix_phone"></label>
            </p>
            <p>
                <label>Message<br><textarea name="avonix_message" rows="4"></textarea></label>
            </p>

            <?php // Honeypot. Hidden from people, filled in by bots. ?>
            <p style="position:absolute;left:-9999px" aria-hidden="true">
                <label>Leave this empty<input type="text" name="avonix_hp" tabindex="-1" autocomplete="off"></label>
            </p>

            <p><button type="submit">Send</button></p>
        </form>
        <?php
        return ob_get_clean();
    }

    public function handle()
    {
        if (!isset($_POST['avonix_nonce']) || !wp_verify_nonce(sanitize_key(wp_unslash($_POST['avonix_nonce'])), 'avonix_submit')) {
            wp_safe_redirect(add_query_arg('avonix_sent', '0', wp_get_referer() ?: home_url()));
            exit;
        }

        $field = function ($name) {
            return isset($_POST[$name]) ? sanitize_text_field(wp_unslash($_POST[$name])) : '';
        };

        $payload = [
            'name'     => $field('avonix_name'),
            'email'    => sanitize_email($field('avonix_email')),
            'phone'    => $field('avonix_phone'),
            'message'  => isset($_POST['avonix_message'])
                ? sanitize_textarea_field(wp_unslash($_POST['avonix_message']))
                : '',
            'page_url' => esc_url_raw($field('avonix_page')),
            'hp'       => $field('avonix_hp'),
        ];

        list($ok) = (new Avonix_Client())->submit($payload);

        wp_safe_redirect(add_query_arg('avonix_sent', $ok ? '1' : '0', wp_get_referer() ?: home_url()));
        exit;
    }
}
