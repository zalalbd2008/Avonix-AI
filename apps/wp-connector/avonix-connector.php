<?php
/**
 * Plugin Name:       Avonix AI Connector
 * Description:       Sends this site's form submissions and chat leads to Avonix AI.
 * Version:           1.3.54
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

define('AVONIX_VERSION', '1.3.54');
define('AVONIX_PLUGIN_FILE', __FILE__);
define('AVONIX_OPT_KEY', 'avonix_connector_key');
define('AVONIX_OPT_ENDPOINT', 'avonix_endpoint');
define('AVONIX_OPT_STATUS', 'avonix_status');
define('AVONIX_OPT_CHAT_ENABLED', 'avonix_chat_enabled');
define('AVONIX_OPT_CHAT_TITLE', 'avonix_chat_title');
define('AVONIX_OPT_CHAT_GREETING', 'avonix_chat_greeting');
define('AVONIX_OPT_CHAT_COLOR', 'avonix_chat_color');

require_once __DIR__ . '/includes/class-avonix-client.php';
require_once __DIR__ . '/includes/class-avonix-page-target.php';
require_once __DIR__ . '/includes/class-avonix-settings.php';
require_once __DIR__ . '/includes/class-avonix-form.php';
require_once __DIR__ . '/includes/class-avonix-chat.php';
require_once __DIR__ . '/includes/class-avonix-tracking.php';
require_once __DIR__ . '/includes/class-avonix-cta.php';
require_once __DIR__ . '/includes/class-avonix-popup.php';
require_once __DIR__ . '/includes/class-avonix-languages.php';
require_once __DIR__ . '/includes/class-avonix-accessibility.php';
require_once __DIR__ . '/includes/class-avonix-backup.php';
require_once __DIR__ . '/includes/class-avonix-updates.php';

/**
 * Called when Avonix cloud says this site was deleted — deactivate and remove
 * the plugin from WordPress.
 */
function avonix_self_uninstall()
{
    // Clear scheduled work and options first.
    wp_clear_scheduled_hook('avonix_heartbeat');
    wp_clear_scheduled_hook('avonix_backup_poll');
    delete_option(AVONIX_OPT_KEY);
    delete_option(AVONIX_OPT_ENDPOINT);
    delete_option(AVONIX_OPT_STATUS);
    delete_option(AVONIX_OPT_CHAT_ENABLED);
    delete_option(AVONIX_OPT_CHAT_TITLE);
    delete_option(AVONIX_OPT_CHAT_GREETING);
    delete_option(AVONIX_OPT_CHAT_COLOR);
    delete_option('avonix_reported_version');
    delete_transient('avonix_uninstall_check');
    delete_transient('avonix_version_register');

    if (!function_exists('deactivate_plugins') || !function_exists('delete_plugins')) {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
    }
    if (!function_exists('request_filesystem_credentials')) {
        require_once ABSPATH . 'wp-admin/includes/file.php';
    }

    $plugin = plugin_basename(AVONIX_PLUGIN_FILE);
    deactivate_plugins($plugin, true);

    // Best-effort file removal. Some hosts disallow delete_plugins without FS creds.
    delete_plugins([$plugin]);
}

add_action('plugins_loaded', function () {
    new Avonix_Settings();
    new Avonix_Form();
    new Avonix_Chat();
    new Avonix_Tracking();
    new Avonix_Cta();
    new Avonix_Popup();
    new Avonix_Languages();
    new Avonix_Accessibility();
    new Avonix_Backup();
    new Avonix_Updates();
});

/** Poll for pending backup jobs every 5 minutes (independent of hourly heartbeat). */
add_filter('cron_schedules', function ($schedules) {
    if (!isset($schedules['avonix_five_minutes'])) {
        $schedules['avonix_five_minutes'] = [
            'interval' => 5 * MINUTE_IN_SECONDS,
            'display'  => 'Every 5 minutes (Avonix)',
        ];
    }
    return $schedules;
});

/** Register with the cloud on activation so the dashboard turns green immediately. */
register_activation_hook(__FILE__, function () {
    // Never let a network/API failure block activation.
    try {
        if (class_exists('Avonix_Client')) {
            (new Avonix_Client())->register();
        }
    } catch (\Throwable $e) {
        // Ignore — admin can reconnect from settings.
    }
    if (!wp_next_scheduled('avonix_heartbeat')) {
        wp_schedule_event(time() + 300, 'hourly', 'avonix_heartbeat');
    }
    if (!wp_next_scheduled('avonix_backup_poll')) {
        wp_schedule_event(time() + 60, 'avonix_five_minutes', 'avonix_backup_poll');
    }
});

register_deactivation_hook(__FILE__, function () {
    wp_clear_scheduled_hook('avonix_heartbeat');
    wp_clear_scheduled_hook('avonix_backup_poll');
});

/** Hourly heartbeat: keeps "last seen" honest and re-connects after a key change. */
add_action('avonix_heartbeat', function () {
    (new Avonix_Client())->register();
});

/**
 * After a zip replace / remote update, activation hooks may not run.
 * If the plugin version changed, register immediately so Avonix Updates
 * reflects the real version without waiting for the hourly heartbeat.
 */
add_action('init', function () {
    if (!get_option(AVONIX_OPT_KEY)) {
        return;
    }
    if (!wp_next_scheduled('avonix_backup_poll')) {
        wp_schedule_event(time() + 60, 'avonix_five_minutes', 'avonix_backup_poll');
    }

    $reported = (string) get_option('avonix_reported_version', '');
    if ($reported === AVONIX_VERSION) {
        return;
    }
    if (get_transient('avonix_version_register')) {
        return;
    }
    set_transient('avonix_version_register', 1, 60);
    $client = new Avonix_Client();
    list($ok) = $client->register();
    if ($ok) {
        update_option('avonix_reported_version', AVONIX_VERSION, false);
    }
}, 5);

/**
 * Faster uninstall check while an admin is in wp-admin (throttled).
 */
add_action('admin_init', function () {
    if (!get_option(AVONIX_OPT_KEY)) {
        return;
    }
    if (get_transient('avonix_uninstall_check')) {
        return;
    }
    set_transient('avonix_uninstall_check', 1, 5 * MINUTE_IN_SECONDS);
    $client = new Avonix_Client();
    list($ok) = $client->register();
    if ($ok) {
        update_option('avonix_reported_version', AVONIX_VERSION, false);
    }
});
