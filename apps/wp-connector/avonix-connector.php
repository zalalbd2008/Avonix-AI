<?php
/**
 * Plugin Name:       Avonix AI Connector
 * Description:       Sends this site's form submissions and chat leads to Avonix AI.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * License:           GPL-2.0-or-later
 *
 * Per 00-Foundation/PRODUCT_RULES.md:28 — "The WordPress plugin is only a
 * connector. Business logic must never depend entirely on the plugin."
 *
 * So this file does four things and nothing else: hold the key, register with
 * the cloud, render a form, and forward submissions. No CRM, no dashboards, no
 * business rules. Everything that could change lives on the server, where it can
 * be changed without asking 500 sites to update.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('AVONIX_VERSION', '1.0.0');
define('AVONIX_OPT_KEY', 'avonix_connector_key');
define('AVONIX_OPT_ENDPOINT', 'avonix_endpoint');
define('AVONIX_OPT_STATUS', 'avonix_status');
define('AVONIX_OPT_CHAT_ENABLED', 'avonix_chat_enabled');
define('AVONIX_OPT_CHAT_TITLE', 'avonix_chat_title');
define('AVONIX_OPT_CHAT_GREETING', 'avonix_chat_greeting');
define('AVONIX_OPT_CHAT_COLOR', 'avonix_chat_color');

require_once __DIR__ . '/includes/class-avonix-client.php';
require_once __DIR__ . '/includes/class-avonix-settings.php';
require_once __DIR__ . '/includes/class-avonix-form.php';
require_once __DIR__ . '/includes/class-avonix-chat.php';

add_action('plugins_loaded', function () {
    new Avonix_Settings();
    new Avonix_Form();
    new Avonix_Chat();
});

/** Register with the cloud on activation so the dashboard turns green immediately. */
register_activation_hook(__FILE__, function () {
    (new Avonix_Client())->register();
    if (!wp_next_scheduled('avonix_heartbeat')) {
        wp_schedule_event(time() + 300, 'hourly', 'avonix_heartbeat');
    }
});

register_deactivation_hook(__FILE__, function () {
    wp_clear_scheduled_hook('avonix_heartbeat');
});

/** Hourly heartbeat: keeps "last seen" honest and re-connects after a key change. */
add_action('avonix_heartbeat', function () {
    (new Avonix_Client())->register();
});
