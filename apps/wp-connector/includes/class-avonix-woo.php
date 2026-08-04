<?php
/**
 * WooCommerce product sync → Avonix cloud (index + chat carousel).
 */

if (!defined('ABSPATH')) {
    exit;
}

class Avonix_Woo
{
    public function __construct()
    {
        add_action('avonix_heartbeat', [$this, 'maybe_sync'], 25);
        add_action('avonix_after_register', [$this, 'maybe_sync'], 25);
    }

    public function maybe_sync()
    {
        if (!function_exists('wc_get_products') || !post_type_exists('product')) {
            return;
        }

        $client = new Avonix_Client();
        if (!$client->is_configured()) {
            return;
        }

        $last = (int) get_option('avonix_woo_sync_ts', 0);
        $force = (bool) get_transient('avonix_woo_sync_force');

        // Train Now / cloud flag via chat config.
        if (!$force) {
            $cfg = $client->get_chat_config();
            if (is_array($cfg) && !empty($cfg['woo_sync'])) {
                $force = true;
            }
        }

        if (!$force && $last > 0 && (time() - $last) < 6 * HOUR_IN_SECONDS) {
            return;
        }

        $products = $this->collect_products();
        $client->forward('/api/v1/connector/woo/sync', [
            'woo_active' => true,
            'products'   => $products,
        ]);

        update_option('avonix_woo_sync_ts', time(), false);
        delete_transient('avonix_woo_sync_force');
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function collect_products()
    {
        $items = wc_get_products([
            'status' => 'publish',
            'limit'  => 50,
            'orderby'=> 'date',
            'order'  => 'DESC',
        ]);

        $out = [];
        foreach ((array) $items as $product) {
            if (!is_object($product) || !method_exists($product, 'is_visible') || !$product->is_visible()) {
                continue;
            }
            $img_id = $product->get_image_id();
            $img    = $img_id ? (string) wp_get_attachment_image_url($img_id, 'woocommerce_thumbnail') : '';
            $price_html = (string) $product->get_price_html();
            $price_html = (string) preg_replace('#<span class="screen-reader-text">.*?</span>#is', '', $price_html);
            $price      = trim(html_entity_decode(wp_strip_all_tags($price_html), ENT_QUOTES, 'UTF-8'));
            $permalink  = (string) $product->get_permalink();
            $add_url    = ('simple' === $product->get_type() && $product->is_purchasable() && $product->is_in_stock())
                ? add_query_arg('add-to-cart', $product->get_id(), $permalink)
                : $permalink;

            $out[] = [
                'id'          => (int) $product->get_id(),
                'title'       => wp_strip_all_tags((string) $product->get_name()),
                'url'         => $permalink,
                'image'       => esc_url_raw($img),
                'price'       => $price,
                'onSale'      => (bool) $product->is_on_sale(),
                'inStock'     => (bool) $product->is_in_stock(),
                'addUrl'      => esc_url_raw($add_url),
                'addText'     => wp_strip_all_tags((string) $product->add_to_cart_text()),
                'sku'         => (string) $product->get_sku(),
                'description' => trim(wp_strip_all_tags((string) $product->get_short_description())),
            ];
        }
        return $out;
    }
}
