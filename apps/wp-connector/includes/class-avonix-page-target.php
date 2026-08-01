<?php
if (!defined('ABSPATH')) {
    exit;
}

if (class_exists('Avonix_Page_Target')) {
    return;
}

/**
 * Shared page visibility matching for Chat / Languages / Accessibility.
 * Mirrors CTA / Popup pageTarget semantics.
 */
class Avonix_Page_Target
{
    public static function current_path()
    {
        $uri = isset($_SERVER['REQUEST_URI'])
            ? (string) wp_unslash($_SERVER['REQUEST_URI'])
            : '/';
        $path = (string) wp_parse_url($uri, PHP_URL_PATH);
        return $path !== '' ? $path : '/';
    }

    public static function current_surface()
    {
        if (function_exists('is_front_page') && is_front_page()) {
            return 'homepage';
        }
        if (function_exists('is_home') && is_home()) {
            return 'blog';
        }
        if (function_exists('is_singular') && is_singular('product')) {
            return 'product';
        }
        if (function_exists('is_singular') && (is_singular('post') || is_page())) {
            return 'single_post';
        }
        if (function_exists('is_post_type_archive') && function_exists('is_shop') && is_shop()) {
            return 'shop';
        }
        if (function_exists('is_cart') && is_cart()) {
            return 'cart';
        }
        if (function_exists('is_checkout') && is_checkout()) {
            return 'checkout';
        }
        if (function_exists('is_account_page') && is_account_page()) {
            return 'account';
        }
        if (function_exists('is_404') && is_404()) {
            return '404';
        }
        return '';
    }

    /**
     * @param array|null $target page_target from connector config
     * @param string     $path
     * @param string     $surface
     */
    public static function matches($target, $path = null, $surface = null)
    {
        if (!is_array($target) || empty($target)) {
            return true;
        }
        $path = $path !== null ? $path : self::current_path();
        $surface = $surface !== null ? $surface : self::current_surface();

        $excludes = isset($target['excludePaths']) && is_array($target['excludePaths'])
            ? $target['excludePaths']
            : (isset($target['exclude_paths']) && is_array($target['exclude_paths'])
                ? $target['exclude_paths']
                : []);
        foreach ($excludes as $ex) {
            $ex = trim((string) $ex);
            if ($ex === '') {
                continue;
            }
            if (substr($ex, -1) === '*') {
                $prefix = rtrim(substr($ex, 0, -1), '/');
                if ($prefix === '' || strpos($path, $prefix) === 0) {
                    return false;
                }
            } elseif ($path === $ex || strpos($path, $ex) === 0) {
                return false;
            }
        }

        $mode = isset($target['mode']) ? (string) $target['mode'] : 'everywhere';
        if ($mode === 'everywhere' || $mode === '') {
            return true;
        }

        $ok = false;
        $surfaces = isset($target['surfaces']) && is_array($target['surfaces'])
            ? $target['surfaces']
            : [];
        foreach ($surfaces as $s) {
            if ((string) $s === $surface) {
                $ok = true;
                break;
            }
        }

        $rules = isset($target['rules']) && is_array($target['rules'])
            ? $target['rules']
            : [];
        foreach ($rules as $rule) {
            if (self::match_rule($path, $rule)) {
                $ok = true;
                break;
            }
        }

        if ($mode === 'include') {
            return $ok;
        }
        if ($mode === 'exclude') {
            return !$ok;
        }
        return true;
    }

    private static function match_rule($path, $rule)
    {
        if (!is_array($rule) || empty($rule['value'])) {
            return false;
        }
        $v = (string) $rule['value'];
        $op = isset($rule['op']) ? (string) $rule['op'] : 'equals';
        switch ($op) {
            case 'equals':
                return $path === $v;
            case 'starts_with':
                return strpos($path, $v) === 0;
            case 'ends_with':
                return substr($path, -strlen($v)) === $v;
            case 'contains':
                return strpos($path, $v) !== false;
            case 'regex':
                return @preg_match('/' . str_replace('/', '\/', $v) . '/', $path) === 1;
            default:
                return false;
        }
    }
}
