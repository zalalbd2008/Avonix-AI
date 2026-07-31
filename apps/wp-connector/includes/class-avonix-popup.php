<?php
if (!defined('ABSPATH')) {
    exit;
}

if (class_exists('Avonix_Popup')) {
    return;
}

/**
 * Popup Experience injector (ADR-010).
 *
 * Cloud owns rules; this file evaluates published config and renders one winner.
 */
class Avonix_Popup
{
    public function __construct()
    {
        add_action('wp_enqueue_scripts', [$this, 'enqueue'], 35);
    }

    public function enqueue()
    {
        $client = new Avonix_Client();
        if (!$client->is_configured()) {
            return;
        }

        $config = $client->get_popups_config();
        if (!$config || empty($config['popups']) || !is_array($config['popups'])) {
            return;
        }

        // Form Builder HTML comes from the cloud (embedSnippet). Do not use
        // the legacy [avonix_form] shortcode — that is a different, bare form.
        $popups = [];
        foreach ($config['popups'] as $pop) {
            if (!is_array($pop)) {
                continue;
            }
            if (empty($pop['form_html'])) {
                $pop['form_html'] = '';
            }
            if (empty($pop['form_embed_url']) || !is_string($pop['form_embed_url'])) {
                $pop['form_embed_url'] = '';
            } else {
                $embed = esc_url_raw($pop['form_embed_url']);
                $pop['form_embed_url'] = (strpos($embed, 'http://') === 0 || strpos($embed, 'https://') === 0)
                    ? $embed
                    : '';
            }
            $popups[] = $pop;
        }

        $handle = 'avonix-popup';
        wp_register_script($handle, false, [], AVONIX_VERSION, true);
        wp_enqueue_script($handle);

        $payload = [
            'popups'            => $popups,
            'fonts'             => isset($config['fonts']) && is_array($config['fonts']) ? $config['fonts'] : null,
            'google_font_urls'  => isset($config['google_font_urls']) && is_array($config['google_font_urls'])
                ? array_values(array_filter($config['google_font_urls'], 'is_string'))
                : [],
            'path'              => $this->current_path(),
            'surface'           => $this->current_surface(),
            'logged_in'         => is_user_logged_in(),
            'returning'         => isset($_COOKIE['avonix_returning']) && $_COOKIE['avonix_returning'] === '1',
        ];

        if (!isset($_COOKIE['avonix_returning'])) {
            setcookie('avonix_returning', '1', time() + YEAR_IN_SECONDS, COOKIEPATH ?: '/', COOKIE_DOMAIN, is_ssl(), true);
        }

        // Google Fonts CDN only — never host font files on this WordPress site.
        foreach ($payload['google_font_urls'] as $i => $font_url) {
            if (!is_string($font_url) || strpos($font_url, 'fonts.googleapis.com') === false) {
                continue;
            }
            $font_handle = 'avonix-gfont-' . $i;
            wp_enqueue_style($font_handle, esc_url_raw($font_url), [], null);
        }

        wp_add_inline_script(
            $handle,
            // JSON_HEX_TAG prevents </script> inside form_html from breaking the
            // inline <script> block (Form Builder embeds include <script> tags).
            'window.AVONIX_POPUPS = ' . wp_json_encode($payload, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) . ';' . "\n" . $this->runtime_js(),
            'after'
        );

        wp_register_style($handle, false, [], AVONIX_VERSION);
        wp_enqueue_style($handle);
        wp_add_inline_style($handle, $this->runtime_css());
    }

    private function current_path()
    {
        $uri = isset($_SERVER['REQUEST_URI'])
            ? (string) wp_unslash($_SERVER['REQUEST_URI'])
            : '/';
        $path = (string) (parse_url($uri, PHP_URL_PATH) ?: '/');
        return $path === '' ? '/' : $path;
    }

    private function current_surface()
    {
        if (is_front_page()) {
            return 'homepage';
        }
        if (function_exists('is_shop') && is_shop()) {
            return 'shop';
        }
        if (function_exists('is_product') && is_product()) {
            return 'product';
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
        if (is_singular('post')) {
            return 'single_post';
        }
        if (is_home() || is_category() || is_tag()) {
            return 'blog';
        }
        if (is_404()) {
            return '404';
        }
        if (is_search()) {
            return 'search';
        }
        return '';
    }

    private function runtime_css()
    {
        return <<<'CSS'
.avonix-popup-root {
  position: fixed;
  inset: 0;
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.avonix-popup-root--bottom { align-items: flex-end; }
.avonix-popup-root--top { align-items: flex-start; }
.avonix-popup-root--left { justify-content: flex-start; }
.avonix-popup-root--right { justify-content: flex-end; }
.avonix-popup-shell {
  max-width: 100%;
  max-height: calc(100vh - 32px);
  max-height: calc(100dvh - 32px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.avonix-popup-card {
  position: relative;
  box-sizing: border-box;
  width: 550px !important;
  max-width: min(550px, calc(100vw - 32px)) !important;
  /* No max-height — height fits via scale. max-height+scroll was the scrollbar. */
  max-height: none !important;
  /* visible so form field borders + focus rings are not clipped */
  overflow: visible !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: #fff;
  color: #0f1c2e;
  border: 0 !important;
  outline: 0 !important;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 24px 64px rgba(15, 23, 42, 0.28);
  padding: 22px 22px 18px;
  font-family: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
  animation: avonix-pop-in 0.28s ease;
}
.avonix-popup-card::-webkit-scrollbar,
.avonix-popup-shell::-webkit-scrollbar,
.avonix-popup-body::-webkit-scrollbar,
.avonix-popup-form-wrap::-webkit-scrollbar,
.avonix-popup-form::-webkit-scrollbar,
.avonix-popup-card *::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
  background: transparent !important;
}
/* Form surface must not clip input borders / focus rings / float labels */
.avonix-popup-form-wrap,
.avonix-popup-form,
.avonix-popup-form .avonix-form,
.avonix-popup-form .avx-form,
.avonix-popup-form .avx-step,
.avonix-popup-form .avx-col,
.avonix-popup-form .avx-float,
.avonix-popup-form .avx-control {
  overflow: visible !important;
}
.avonix-popup-body {
  overflow-x: hidden !important;
  overflow-y: auto !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
  /* room for float labels; focus uses inset ring so it won't clip */
  padding-top: 10px;
  padding-bottom: 6px;
  padding-left: 2px;
  padding-right: 2px;
}
/* Inset focus ring — text fields only (not radio/checkbox) */
.avonix-popup-form .avonix-form input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="range"]):not([type="file"]):not([type="button"]):not([type="submit"]):focus,
.avonix-popup-form .avonix-form select:focus,
.avonix-popup-form .avonix-form textarea:focus,
.avonix-popup-form .avx-form input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="range"]):not([type="file"]):not([type="button"]):not([type="submit"]):focus,
.avonix-popup-form .avx-form select:focus,
.avonix-popup-form .avx-form textarea:focus {
  outline: 2px solid var(--avx-input-focus-border, #ff6600) !important;
  outline-offset: -2px !important;
  box-shadow: none !important;
}
.avonix-popup-form .avonix-form input[type="radio"],
.avonix-popup-form .avonix-form input[type="checkbox"],
.avonix-popup-form .avx-form input[type="radio"],
.avonix-popup-form .avx-form input[type="checkbox"],
.avonix-popup-root input[type="radio"],
.avonix-popup-root input[type="checkbox"] {
  -webkit-appearance: auto !important;
  appearance: auto !important;
  width: 16px !important;
  height: 16px !important;
  min-height: 0 !important;
  min-width: 0 !important;
  max-width: 18px !important;
  max-height: 18px !important;
  padding: 0 !important;
  margin: 2px 6px 0 0 !important;
  border: 0 !important;
  border-radius: 50% !important;
  outline: none !important;
  outline-offset: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  flex-shrink: 0 !important;
  accent-color: var(--avx-radio-on, #ff6600);
}
.avonix-popup-root input[type="checkbox"] {
  border-radius: 3px !important;
  accent-color: var(--avx-check-on, #ff6600);
}
.avonix-popup-root input[type="radio"]:focus,
.avonix-popup-root input[type="radio"]:focus-visible,
.avonix-popup-root input[type="radio"]:checked,
.avonix-popup-root input[type="checkbox"]:focus,
.avonix-popup-root input[type="checkbox"]:focus-visible,
.avonix-popup-root .avonix-form.avx-a11y-focus input[type="radio"]:focus-visible,
.avonix-popup-root .avonix-form.avx-a11y-focus input[type="checkbox"]:focus-visible {
  outline: none !important;
  outline-offset: 0 !important;
  box-shadow: none !important;
  border: 0 !important;
}
@keyframes avonix-pop-in {
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to { opacity: 1; transform: none; }
}
.avonix-popup-card h2 {
  margin: 0;
  font-size: 1.35rem;
  line-height: 1.2;
  letter-spacing: -0.03em;
  font-weight: 700;
}
.avonix-popup-card p {
  margin: 6px 0 0;
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.4;
}
.avonix-popup-card .avonix-popup-cta {
  display: block;
  width: 100%;
  margin-top: 10px;
  flex-shrink: 0;
  border: 0;
  border-radius: 11px;
  padding: 11px 14px;
  background: #e15d1a;
  color: #fff;
  font-weight: 650;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: center;
  text-decoration: none !important;
  box-shadow: 0 8px 20px rgba(225, 93, 26, 0.28);
}
.avonix-popup-card .avonix-popup-cta:hover {
  filter: brightness(1.04);
}
.avonix-popup-card .avonix-popup-cta-secondary {
  display: inline-block;
  margin-top: 8px;
  flex-shrink: 0;
  background: transparent;
  border: 0;
  padding: 0;
  color: #64748b;
  font-size: 0.78rem;
  text-decoration: underline;
  cursor: pointer;
}
.avonix-popup-card--grid-media {
  display: flex;
  flex-direction: row;
  padding: 0 !important;
  overflow: hidden;
  max-width: min(720px, 100%);
  width: min(720px, 100%);
}
.avonix-popup-card--grid-media.avonix-popup-card--media-right {
  flex-direction: row-reverse;
}
.avonix-popup-media {
  flex: 0 0 48%;
  min-height: 200px;
  max-height: calc(100dvh - 32px);
  background: #e8e4ef center / cover no-repeat;
}
.avonix-popup-body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  justify-content: flex-start;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.avonix-popup-body::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}
.avonix-popup-card--grid-media .avonix-popup-body,
.avonix-popup-card--grid-banner .avonix-popup-body {
  padding: 22px 22px 18px;
}
.avonix-popup-card--grid-banner {
  background: linear-gradient(180deg, #0b1220 50%, #c9a227 50%);
}
.avonix-popup-card--header-band {
  padding: 0 !important;
  background: #fff !important;
}
.avonix-popup-header {
  box-sizing: border-box;
  padding: 22px 24px 20px;
  background: linear-gradient(90deg, #1e1b4b 0%, #7c3aed 100%);
  color: #fff;
  flex-shrink: 0;
}
.avonix-popup-badge {
  display: inline-block;
  margin: 0 0 12px;
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.42);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  line-height: 1.2;
}
.avonix-popup-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.45rem;
  font-weight: 750;
  letter-spacing: -0.03em;
  line-height: 1.2;
}
.avonix-popup-header p {
  margin: 8px 0 0;
  color: #fff;
  font-size: 0.9rem;
  line-height: 1.4;
  opacity: 0.95;
}
.avonix-popup-card--header-band .avonix-popup-body {
  padding: 18px 22px 18px;
  background: #fff;
  gap: 12px;
}
.avonix-popup-card--header-band .avonix-popup-close {
  top: 12px;
  right: 12px;
  --avx-close-size: 30px;
  background: #ef4444;
  color: #fff;
}
.avonix-popup-card--header-band .avonix-popup-close:hover {
  background: #dc2626;
  color: #fff;
}
.avonix-popup-card--header-band .avonix-popup-cta {
  margin-top: 6px;
  border-radius: 6px;
  background: #a5b4fc;
  box-shadow: none;
  padding: 12px 14px;
  font-weight: 700;
}
.avonix-popup-card--header-band .avonix-popup-cta:hover {
  filter: brightness(0.97);
}
.avonix-popup-logo {
  max-height: 32px;
  width: auto;
  margin: 0 auto 2px;
  display: block;
  object-fit: contain;
  flex-shrink: 0;
}
.avonix-popup-close {
  --avx-close-size: 28px;
  position: absolute;
  top: 10px;
  right: 12px;
  width: var(--avx-close-size) !important;
  height: var(--avx-close-size) !important;
  min-width: var(--avx-close-size) !important;
  min-height: var(--avx-close-size) !important;
  max-width: var(--avx-close-size) !important;
  max-height: var(--avx-close-size) !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  border-radius: 50% !important;
  aspect-ratio: 1 / 1 !important;
  flex-shrink: 0 !important;
  appearance: none !important;
  -webkit-appearance: none !important;
  background: rgba(15, 23, 42, 0.05);
  color: #64748b;
  font-size: 0 !important;
  line-height: 0 !important;
  cursor: pointer;
  z-index: 2;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-sizing: border-box !important;
  overflow: hidden;
  text-align: center !important;
  transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
}
.avonix-popup-close__icon {
  display: block !important;
  width: 52% !important;
  height: 52% !important;
  max-width: 52% !important;
  max-height: 52% !important;
  margin: 0 !important;
  padding: 0 !important;
  flex-shrink: 0;
  pointer-events: none;
}
.avonix-popup-close__glyph {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  font-weight: 700;
  line-height: 1 !important;
  pointer-events: none;
}
.avonix-popup-close:hover {
  background: rgba(15, 23, 42, 0.1);
  color: #0f1c2e;
}
.avonix-popup-close--anim-spin { animation: avonix-close-spin 1.1s linear infinite; }
.avonix-popup-close--anim-pulse { animation: avonix-close-pulse 1.4s ease-in-out infinite; }
.avonix-popup-close--anim-bounce { animation: avonix-close-bounce 1s ease infinite; }
.avonix-popup-close--anim-fade { animation: avonix-close-fade 0.45s ease; }
.avonix-popup-close--hover-scale:hover { transform: scale(1.12); }
.avonix-popup-close--hover-rotate:hover { transform: rotate(90deg); }
.avonix-popup-close--hover-spin:hover { animation: avonix-close-spin 0.7s linear infinite; }
.avonix-popup-close--hover-pulse:hover { animation: avonix-close-pulse 0.9s ease-in-out infinite; }
@keyframes avonix-close-spin {
  to { transform: rotate(360deg); }
}
@keyframes avonix-close-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.85; }
}
@keyframes avonix-close-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes avonix-close-fade {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: none; }
}
.avonix-popup-components { margin-top: 2px; width: 100%; flex-shrink: 0; }
.avonix-popup-comp { margin-top: 6px; font-size: 12px; color: #64748b; }
.avonix-popup-columns {
  display: grid;
  width: 100%;
  gap: 12px;
}
.avonix-popup-column { min-width: 0; }
@media (max-width: 640px) {
  .avonix-popup-columns.avonix-popup-columns--stack {
    grid-template-columns: 1fr !important;
  }
}
.avonix-popup-form-wrap {
  margin-top: 2px;
  flex: 0 1 auto;
  min-height: 0;
  width: 100%;
}
.avonix-popup-form {
  margin-top: 0;
  height: 100%;
}
.avonix-popup-form [data-avx-ultimate],
.avonix-popup-form .avonix-form,
.avonix-popup-form .avx-form {
  max-width: 100% !important;
  margin-inline: 0 !important;
  --avx-field-gap: 8px !important;
  --avx-row-gap: 8px !important;
  --avx-col-gap: 10px !important;
  --avx-font-size: 13px !important;
  --avx-container-pad: 0 !important;
  --avx-container-my: 0 !important;
  --avx-container-shadow: none !important;
  --avx-form-bg: transparent !important;
  gap: 8px !important;
  font-size: 13px !important;
  background: transparent !important;
  box-shadow: none !important;
  border: 0 !important;
  padding: 0 !important;
}
.avonix-popup-form .avonix-form .avx-step,
.avonix-popup-form .avonix-form .avx-row,
.avonix-popup-form .avonix-form .avx-sec-body {
  gap: 8px 10px !important;
}
.avonix-popup-form .avonix-form label,
.avonix-popup-form .avonix-form .avx-label,
.avonix-popup-form .avonix-form .avx-float > span {
  font-size: 12px !important;
  margin-bottom: 3px !important;
  line-height: 1.25 !important;
}
.avonix-popup-form .avonix-form input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="range"]),
.avonix-popup-form .avonix-form select,
.avonix-popup-form .avonix-form textarea {
  padding: 8px 10px !important;
  font-size: 13px !important;
  line-height: 1.3 !important;
  min-height: 36px !important;
  border-radius: 9px !important;
  box-sizing: border-box !important;
}
.avonix-popup-form .avonix-form textarea {
  min-height: 52px !important;
  max-height: 64px !important;
  resize: none !important;
}
.avonix-popup-form .avonix-form .avx-choice,
.avonix-popup-form .avonix-form .avx-radio,
.avonix-popup-form .avonix-form .avx-check {
  gap: 6px 10px !important;
  font-size: 12.5px !important;
}
.avonix-popup-form .avonix-form .avx-nav,
.avonix-popup-form .avonix-form .avx-submit,
.avonix-popup-form .avonix-form button[type="submit"] {
  margin-top: 4px !important;
  padding: 10px 14px !important;
  font-size: 13px !important;
  border-radius: 10px !important;
}
.avonix-popup-form .avonix-form .avx-sec,
.avonix-popup-form .avonix-form .avx-section {
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  box-shadow: none !important;
}
.avonix-popup-form .avonix-form .avx-sec-body {
  padding-top: 0 !important;
}
/* Form name / step chrome never paint inside popup */
.avonix-popup-form .avx-step-title,
.avonix-popup-form .avx-form-title,
.avonix-popup-form .avx-mode-label {
  display: none !important;
}
/* Honeypot must never paint inside the card */
.avonix-popup-form input[name="hp"],
.avonix-popup-form-wrap input[name="hp"] {
  position: absolute !important;
  left: -9999px !important;
  width: 1px !important;
  height: 1px !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
/* Form CSS uses display:flex which overrides the HTML hidden attribute */
.avonix-popup-form-wrap .avx-logic-bar[hidden],
.avonix-popup-form-wrap .avx-draft-banner[hidden],
.avonix-popup-form-wrap .avx-budget[hidden],
.avonix-popup-form-wrap .avx-prev[hidden],
.avonix-popup-form-wrap .avx-next[hidden],
.avonix-popup-form-wrap .avx-otp[hidden],
.avonix-popup-form-wrap [hidden] {
  display: none !important;
}
/* Draft resume is page UX — hide in popup shell */
.avonix-popup-form-wrap .avx-draft {
  display: none !important;
}
.avonix-popup-card--form-only {
  width: 550px !important;
  max-width: min(550px, calc(100vw - 32px)) !important;
  padding: 20px 20px 16px;
}
.avonix-popup-card--form-only .avonix-popup-form-wrap {
  margin-top: 4px;
}
.avonix-popup-form-wrap.avonix-popup-form-wrap--no-nav .avx-nav {
  display: none !important;
}
/* After submit: same-size white popup card, black thanks text (keep dimmed backdrop) */
.avonix-popup-root:has(.avx-success),
.avonix-popup-root--success {
  align-items: center !important;
  justify-content: center !important;
}
.avonix-popup-card:has(.avx-success),
.avonix-popup-card--success {
  width: 550px !important;
  max-width: min(550px, calc(100vw - 32px)) !important;
  background: #fff !important;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 24px 64px rgba(15, 23, 42, 0.28) !important;
  border: 0 !important;
  padding: 28px 24px !important;
  overflow: visible !important;
  color: #0f172a !important;
}
.avonix-popup-card:has(.avx-success) .avonix-popup-header,
.avonix-popup-card--success .avonix-popup-header,
.avonix-popup-card:has(.avx-success) .avonix-popup-cta,
.avonix-popup-card--success .avonix-popup-cta,
.avonix-popup-card:has(.avx-success) .avonix-popup-cta-secondary,
.avonix-popup-card--success .avonix-popup-cta-secondary,
.avonix-popup-card:has(.avx-success) .avonix-popup-media,
.avonix-popup-card--success .avonix-popup-media,
.avonix-popup-card:has(.avx-success) .avonix-popup-logo,
.avonix-popup-card--success .avonix-popup-logo,
.avonix-popup-card:has(.avx-success) .avonix-popup-components,
.avonix-popup-card--success .avonix-popup-components,
.avonix-popup-card:has(.avx-success) .avonix-popup-body > h2,
.avonix-popup-card--success .avonix-popup-body > h2,
.avonix-popup-card:has(.avx-success) .avonix-popup-body > p,
.avonix-popup-card--success .avonix-popup-body > p {
  display: none !important;
}
.avonix-popup-card:has(.avx-success) .avonix-popup-body,
.avonix-popup-card--success .avonix-popup-body {
  padding: 0 !important;
  overflow: visible !important;
  background: transparent !important;
  gap: 0 !important;
  max-height: none !important;
  width: 100%;
  align-items: stretch !important;
}
.avonix-popup-card:has(.avx-success) .avonix-popup-form-wrap,
.avonix-popup-card--success .avonix-popup-form-wrap,
.avonix-popup-card:has(.avx-success) .avonix-popup-form,
.avonix-popup-card--success .avonix-popup-form {
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: visible !important;
  width: 100% !important;
  background: transparent !important;
}
.avonix-popup-card:has(.avx-success) .avx-success,
.avonix-popup-card--success .avx-success {
  display: flex !important;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 8px 4px 4px;
  text-align: left;
  background: #fff !important;
  border: 0 !important;
  box-shadow: none !important;
  color: #0f172a !important;
}
.avonix-popup-card:has(.avx-success) .avx-success-title,
.avonix-popup-card--success .avx-success-title {
  color: #0f172a !important;
  font-size: 22px !important;
  font-weight: 800 !important;
}
.avonix-popup-card:has(.avx-success) .avx-success-sub,
.avonix-popup-card--success .avx-success-sub,
.avonix-popup-card:has(.avx-success) .avx-success-brand,
.avonix-popup-card--success .avx-success-brand,
.avonix-popup-card:has(.avx-success) .avx-success-redirect,
.avonix-popup-card--success .avx-success-redirect,
.avonix-popup-card:has(.avx-success) .avx-success-next-title,
.avonix-popup-card--success .avx-success-next-title,
.avonix-popup-card:has(.avx-success) .avx-success-timeline strong,
.avonix-popup-card--success .avx-success-timeline strong,
.avonix-popup-card:has(.avx-success) .avx-success-timeline span,
.avonix-popup-card--success .avx-success-timeline span {
  color: #334155 !important;
}
.avonix-popup-card:has(.avx-success) .avonix-popup-close,
.avonix-popup-card--success .avonix-popup-close {
  position: absolute !important;
  top: 10px !important;
  right: 12px !important;
}
.avonix-popup-form--override {
  --avx-radius: inherit;
}
.avonix-popup-form-wrap--embed iframe {
  min-height: 220px !important;
  max-height: min(48vh, 360px) !important;
}
.avonix-popup-bar {
  width: min(960px, 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  max-height: none;
  overflow: visible;
}
@media (max-width: 640px) {
  .avonix-popup-root { padding: 12px; }
  .avonix-popup-card { width: 100%; border-radius: 16px; padding: 18px 16px 14px; }
  .avonix-popup-card--form-only { width: 100%; }
  .avonix-popup-card--grid-media.avonix-popup-card--stack-mobile {
    flex-direction: column !important;
  }
  .avonix-popup-card--grid-media.avonix-popup-card--stack-mobile .avonix-popup-media {
    flex: none;
    width: 100%;
    min-height: 140px;
    max-height: 160px;
  }
}
CSS;
    }

    private function runtime_js()
    {
        return <<<'JS'
(function () {
  var cfg = window.AVONIX_POPUPS;
  if (!cfg || !cfg.popups || !cfg.popups.length) return;

  function matchRule(path, rule) {
    if (!rule || !rule.value) return false;
    var v = rule.value;
    switch (rule.op) {
      case "equals": return path === v;
      case "starts_with": return path.indexOf(v) === 0;
      case "ends_with": return path.slice(-v.length) === v;
      case "contains": return path.indexOf(v) !== -1;
      case "regex":
        try { return new RegExp(v).test(path); } catch (e) { return false; }
      default: return false;
    }
  }

  function pageMatches(audience) {
    var t = (audience && audience.pageTarget) || { mode: "everywhere" };
    var path = cfg.path || "/";
    var surface = cfg.surface || "";
    var excludes = t.excludePaths || [];
    for (var i = 0; i < excludes.length; i++) {
      if (path.indexOf(excludes[i]) !== -1) return false;
    }
    if (t.mode === "everywhere" || !t.mode) return true;
    var ok = false;
    (t.surfaces || []).forEach(function (s) { if (s === surface) ok = true; });
    (t.rules || []).forEach(function (r) { if (matchRule(path, r)) ok = true; });
    if (t.mode === "include") return ok;
    if (t.mode === "exclude") return !ok;
    return true;
  }

  function deviceKind() {
    var w = window.innerWidth || 1200;
    if (w < 768) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  }

  function deviceMatches(pop) {
    var devices = (pop.payload && pop.payload.devices) || [];
    if (!devices.length) return true;
    return devices.indexOf(deviceKind()) !== -1;
  }

  function visitorMatches(audience) {
    var types = (audience && audience.visitorTypes) || [];
    if (!types.length) return true;
    var isNew = !cfg.returning;
    var logged = !!cfg.logged_in;
    for (var i = 0; i < types.length; i++) {
      var t = types[i];
      if (t === "new" && isNew) return true;
      if (t === "returning" && !isNew) return true;
      if (t === "logged_in" && logged) return true;
      if (t === "guest" && !logged) return true;
    }
    return false;
  }

  function utmMatches(audience) {
    var utm = audience && audience.utm;
    if (!utm || (!utm.source && !utm.campaign && !utm.medium)) return true;
    var q = {};
    try {
      window.location.search.replace(/^\?/, "").split("&").forEach(function (pair) {
        var p = pair.split("=");
        if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || "");
      });
    } catch (e) {}
    if (utm.source && q.utm_source !== utm.source) return false;
    if (utm.campaign && q.utm_campaign !== utm.campaign) return false;
    if (utm.medium && q.utm_medium !== utm.medium) return false;
    return true;
  }

  function scheduleMatches(schedule) {
    if (!schedule) return true;
    var now = Date.now();
    if (schedule.startAt) {
      var s = Date.parse(schedule.startAt);
      if (!isNaN(s) && now < s) return false;
    }
    if (schedule.endAt) {
      var e = Date.parse(schedule.endAt);
      if (!isNaN(e) && now > e) return false;
    }
    return true;
  }

  function conflictOk(conflicts) {
    conflicts = conflicts || {};
    if (conflicts.suppressIfChatOpen) {
      if (conflicts.suppressIfChatOpen) {
      var cepPanel = document.querySelector(".avonix-cep-panel");
      if (cepPanel && cepPanel.style.display === "flex") return false;
      var chat = document.querySelector(".avonix-chat-open, .avonix-chat-panel.is-open, [data-avonix-chat-open='1']");
      if (chat) return false;
    }
    }
    if (conflicts.suppressIfFormOpen) {
      var focus = document.activeElement;
      if (focus && (focus.tagName === "INPUT" || focus.tagName === "TEXTAREA" || focus.tagName === "SELECT")) {
        return false;
      }
    }
    return true;
  }

  function freqKey(id) { return "avonix_popup_seen_" + id; }

  function allowedByFrequency(pop) {
    var freq = (pop.payload && pop.payload.frequency) || { mode: "once" };
    var mode = freq.mode || "once";
    if (mode === "always") return true;
    try {
      var raw = localStorage.getItem(freqKey(pop.id));
      if (!raw) return true;
      var data = JSON.parse(raw);
      var now = Date.now();
      if (mode === "never_repeat" || mode === "once") return false;
      if (mode === "every_session") return !sessionStorage.getItem(freqKey(pop.id));
      if (mode === "once_daily") return !data.at || now - data.at > 86400000;
      if (mode === "once_weekly") return !data.at || now - data.at > 7 * 86400000;
      if (mode === "once_monthly") return !data.at || now - data.at > 30 * 86400000;
    } catch (e) {}
    return true;
  }

  function markSeen(pop) {
    try {
      localStorage.setItem(freqKey(pop.id), JSON.stringify({ at: Date.now() }));
      sessionStorage.setItem(freqKey(pop.id), "1");
    } catch (e) {}
  }

  function track(pop, action) {
    try {
      if (window.AvonixTrack && typeof window.AvonixTrack.push === "function") {
        window.AvonixTrack.push({
          type: "popup",
          popup_id: pop.id,
          action: action,
          name: pop.name,
          analytics_id: (pop.payload && pop.payload.analyticsId) || null
        });
      }
    } catch (e) {}
  }

  function fireAutomation(pop, action) {
    var auto = (pop.payload && pop.payload.automation) || {};
    var detail = {
      popupId: pop.id,
      action: action,
      tags: auto.tags || [],
      notifyEmail: auto.notifyEmail || null
    };
    try {
      document.dispatchEvent(new CustomEvent("avonix:popup-automation", { detail: detail }));
    } catch (e) {}
    if (auto.webhookUrl && (auto.onSubmitZapier || action === "view" === false)) {
      if (auto.onSubmitZapier || action === "cta" || action === "submit") {
        try {
          fetch(auto.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(detail),
            mode: "no-cors",
            keepalive: true
          });
        } catch (e) {}
      }
    }
  }

  function candidates() {
    return cfg.popups
      .filter(function (p) {
        var payload = p.payload || {};
        return pageMatches(payload.audience)
          && deviceMatches(p)
          && visitorMatches(payload.audience)
          && utmMatches(payload.audience)
          && scheduleMatches(payload.schedule)
          && conflictOk(payload.conflicts)
          && allowedByFrequency(p);
      })
      .sort(function (a, b) {
        return (a.priority_rank || 100) - (b.priority_rank || 100);
      });
  }

  var shown = false;

  function layoutClass(layout) {
    if (layout === "bottom_bar") return "avonix-popup-root--bottom";
    if (layout === "top_bar") return "avonix-popup-root--top";
    if (layout === "slide_left" || layout === "drawer") return "avonix-popup-root--left";
    if (layout === "slide_right") return "avonix-popup-root--right";
    return "";
  }

  function youtubeEmbed(url) {
    if (!url) return "";
    var m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if (m && m[1]) return "https://www.youtube.com/embed/" + m[1];
    if (/youtube\.com\/embed\//.test(url)) return url;
    return "";
  }

  function injectHtml(host, html) {
    host.innerHTML = html || "";
    // <link> from innerHTML does not load — hoist Google Fonts to <head>
    var links = host.querySelectorAll('link[rel="stylesheet"]');
    links.forEach(function (old) {
      var href = old.getAttribute("href") || "";
      if (href.indexOf("fonts.googleapis.com") === -1) return;
      if (document.querySelector('link[href="' + href.replace(/"/g, "") + '"]')) {
        old.remove();
        return;
      }
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      if (old.getAttribute("data-avonix-gfont")) {
        link.setAttribute("data-avonix-gfont", "1");
      }
      document.head.appendChild(link);
      old.remove();
    });
    var scripts = host.querySelectorAll("script");
    scripts.forEach(function (old) {
      var s = document.createElement("script");
      if (old.src) {
        s.src = old.src;
        s.async = old.async;
      } else {
        s.textContent = old.textContent;
      }
      Array.prototype.forEach.call(old.attributes || [], function (attr) {
        if (attr.name !== "src") s.setAttribute(attr.name, attr.value);
      });
      old.parentNode.replaceChild(s, old);
    });
  }

  function showPopup(pop) {
    if (shown || !pop) return;
    shown = true;
    markSeen(pop);
    track(pop, "view");

    var content = (pop.payload && pop.payload.content) || {};
    var close = (pop.payload && pop.payload.close) || {};
    var design = (pop.payload && pop.payload.design) || {};
    var behavior = (pop.payload && pop.payload.behavior) || {};
    var components = (pop.payload && pop.payload.components) || [];

    var root = document.createElement("div");
    root.className = ("avonix-popup-root " + layoutClass(design.layout)).trim();
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", content.headline || pop.name || "Popup");

    var hasForm = Boolean(pop.form_html);
    var hasEmbed = !hasForm && Boolean(pop.form_embed_url);
    var hasFormSurface = hasForm || hasEmbed;
    var replaceFormButtons = Boolean(content.replaceFormButtons);
    var grid = design.grid || {};
    var theme = design.theme || {};
    var gridMode = grid.mode || "stack";
    var gridAlign = grid.align || "left";
    var mediaPct = grid.mediaWidthPercent != null ? grid.mediaWidthPercent : 48;
    var mediaSide = grid.mediaSide || "left";
    var stackMobile = grid.stackOnMobile !== false;

    var card = document.createElement("div");
    var shell = document.createElement("div");
    shell.className = "avonix-popup-shell";
    card.className = "avonix-popup-card"
      + (design.layout === "bottom_bar" || design.layout === "top_bar" ? " avonix-popup-bar" : "")
      + (hasFormSurface && gridMode === "stack" ? " avonix-popup-card--form-only" : "")
      + (gridMode === "media_split" ? " avonix-popup-card--grid-media" : "")
      + (gridMode === "media_split" && mediaSide === "right" ? " avonix-popup-card--media-right" : "")
      + (gridMode === "media_split" && stackMobile ? " avonix-popup-card--stack-mobile" : "")
      + (gridMode === "banner_split" ? " avonix-popup-card--grid-banner" : "")
      + (gridMode === "header_band" ? " avonix-popup-card--header-band" : "");
    // Fixed product width — 550px (responsive on small screens).
    card.style.setProperty("width", "550px", "important");
    card.style.setProperty("max-width", "min(550px, calc(100vw - 32px))", "important");
    // Keep overflow visible so embedded form borders/focus rings are not clipped.
    card.style.setProperty("overflow", "visible", "important");
    card.style.setProperty("overflow-x", "visible", "important");
    card.style.setProperty("overflow-y", "visible", "important");
    if (design.minHeight) card.style.minHeight = design.minHeight + "px";
    // Prefer fitting the viewport over forcing a tall min-height.
    if (design.minHeight && design.minHeight > 480) {
      card.style.minHeight = "0";
    }
    if (design.radius != null) card.style.borderRadius = design.radius + "px";
    card.style.setProperty("border", "0", "important");
    card.style.setProperty("outline", "0", "important");
    if (gridMode !== "media_split" && gridMode !== "header_band" && design.padding != null) {
      card.style.padding = design.padding + "px";
    }
    if (gridMode === "header_band") {
      card.style.padding = "0";
      card.style.background = theme.backgroundColor || "#ffffff";
    }
    if (theme.backgroundColor && gridMode !== "banner_split" && gridMode !== "header_band") {
      card.style.background = theme.backgroundColor;
    }
    if (theme.textColor) card.style.color = theme.textColor;
    if (gridMode === "banner_split") {
      var topC = theme.splitTopColor || "#0b1220";
      var botC = theme.splitBottomColor || "#c9a227";
      card.style.background = "linear-gradient(180deg, " + topC + " 50%, " + botC + " 50%)";
    }
    if (design.shadow === false) card.style.boxShadow = "none";
    if (design.customCss) {
      try {
        var style = document.createElement("style");
        style.textContent = design.customCss;
        document.head.appendChild(style);
      } catch (e) {}
    }

    function dismiss(reason) {
      window.removeEventListener("resize", fitToViewport);
      document.documentElement.style.removeProperty("overflow");
      document.body.style.removeProperty("overflow");
      track(pop, reason || "dismiss");
      root.remove();
    }

    function fitToViewport() {
      if (!document.body.contains(root)) return;
      shell.style.transform = "";
      var pad = 32;
      var maxH = Math.max(240, (window.innerHeight || 800) - pad);
      var maxW = Math.max(240, (window.innerWidth || 1200) - pad);
      // Scroll inside body — keep card/form overflow visible so borders aren't clipped.
      card.style.setProperty("max-height", maxH + "px", "important");
      card.style.setProperty("overflow", "visible", "important");
      card.style.setProperty("overflow-x", "visible", "important");
      card.style.setProperty("overflow-y", "visible", "important");
      card.style.setProperty("width", "550px", "important");
      card.style.setProperty("max-width", "min(550px, calc(100vw - 32px))", "important");
      var nodes = card.querySelectorAll(".avonix-popup-body, .avonix-popup-form-wrap");
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].style.setProperty("overflow-x", "hidden", "important");
        nodes[i].style.setProperty("overflow-y", "auto", "important");
        nodes[i].style.setProperty("scrollbar-width", "none", "important");
        nodes[i].style.setProperty("-ms-overflow-style", "none", "important");
        nodes[i].style.setProperty("min-height", "0", "important");
        nodes[i].style.setProperty("padding-top", "6px", "important");
      }
      // Embedded Avonix form must not clip field borders / focus rings.
      var forms = card.querySelectorAll(
        ".avonix-popup-form, .avonix-popup-form .avonix-form, .avonix-popup-form .avx-form, .avonix-popup-form .avx-step, .avonix-popup-form .avx-col"
      );
      for (var j = 0; j < forms.length; j++) {
        forms[j].style.setProperty("overflow", "visible", "important");
      }
      var h = Math.max(card.scrollHeight, card.offsetHeight, 1);
      var w = Math.max(card.scrollWidth, card.offsetWidth, 1);
      var scale = Math.min(1, maxH / h, maxW / w);
      shell.style.transformOrigin = "center center";
      if (scale < 0.92) {
        shell.style.transform = "scale(" + Math.max(0.7, scale) + ")";
      }
    }

    function applyTextStyle(el, styleObj, defaults) {
      var s = styleObj || {};
      el.style.fontSize = (s.fontSize || defaults.fontSize) + "px";
      el.style.fontWeight = String(s.fontWeight || defaults.fontWeight);
      el.style.color = s.color || defaults.color;
      el.style.textAlign = s.align || defaults.align || gridAlign || "left";
      el.style.margin = "0";
      if (s.lineHeight) el.style.lineHeight = String(s.lineHeight);
      if (s.letterSpacing != null) el.style.letterSpacing = s.letterSpacing + "px";
      if (s.textTransform) el.style.textTransform = s.textTransform;
      var family = s.fontFamily || defaults.fontFamily;
      if (family && family !== "system") {
        el.style.fontFamily = "'" + String(family).replace(/'/g, "") + "', system-ui, sans-serif";
      }
    }

    function siteFont(kind) {
      var fonts = cfg.fonts || {};
      if (kind === "heading") {
        return fonts.headingFamily || fonts.primaryFamily || "";
      }
      return fonts.primaryFamily || "";
    }

    function wireCta(btn, cta) {
      btn.addEventListener("click", function (ev) {
        track(pop, "click");
        fireAutomation(pop, "cta");
        var act = (cta && cta.action) || (replaceFormButtons ? "submit_form" : "close_popup");
        if (act === "submit_form") {
          ev.preventDefault();
          if (formEl) {
            if (typeof formEl.requestSubmit === "function") formEl.requestSubmit();
            else {
              var submitBtn = formEl.querySelector('button[type="submit"], .avx-submit');
              if (submitBtn) submitBtn.click();
              else formEl.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
            }
          }
          return;
        }
        if (act === "close" || act === "close_popup") {
          ev.preventDefault();
          dismiss("close");
        }
        if (act === "live_chat" || act === "chat_now") {
          ev.preventDefault();
          var launcher = document.querySelector(".avonix-cep-launcher, .avonix-chat-launcher, #avonix-chat-open, [data-avonix='cep-chat'] .avonix-cep-launcher, [data-avonix-chat]");
          if (launcher) launcher.click();
          else if (window.AvonixCep && typeof window.AvonixCep.open === "function") window.AvonixCep.open();
          dismiss("chat");
        }
        if (act === "copy_coupon" && content.couponCode) {
          ev.preventDefault();
          try { navigator.clipboard.writeText(content.couponCode); } catch (e2) {}
        }
        if (act === "open_url" && cta && cta.url) {
          return;
        }
        try {
          document.dispatchEvent(new CustomEvent("avonix:popup", { detail: { popupId: pop.id, action: act } }));
        } catch (e3) {}
      });
    }

    if (close.showCloseButton !== false && !close.neverClose) {
      var x = document.createElement("button");
      x.type = "button";
      x.className = "avonix-popup-close";
      x.setAttribute("aria-label", "Close");
      var closeIcon = theme.closeIcon || "x";
      var closeSize = Number(theme.closeSize) || 28;
      if (!(closeSize >= 20 && closeSize <= 56)) closeSize = 28;
      // Perfect circle — lock box metrics (WP themes often pad/stretch buttons).
      x.style.cssText = [
        "position:absolute",
        "top:10px",
        "right:12px",
        "padding:0",
        "margin:0",
        "border:0",
        "border-radius:50%",
        "display:inline-flex",
        "align-items:center",
        "justify-content:center",
        "line-height:0",
        "font-size:0",
        "box-sizing:border-box",
        "overflow:hidden",
        "cursor:pointer",
        "z-index:2",
        "flex-shrink:0",
        "appearance:none",
        "-webkit-appearance:none"
      ].join(";");
      x.style.setProperty("--avx-close-size", closeSize + "px");
      if (theme.closeBackground) x.style.background = theme.closeBackground;
      if (theme.closeColor) x.style.color = theme.closeColor;

      // SVG X sits optically centered; text glyphs use a flex wrapper.
      if (closeIcon === "plus") {
        var gPlus = document.createElement("span");
        gPlus.className = "avonix-popup-close__glyph";
        gPlus.style.fontSize = Math.round(closeSize * 0.55) + "px";
        gPlus.textContent = "+";
        x.appendChild(gPlus);
      } else if (closeIcon === "circle_x") {
        var gCx = document.createElement("span");
        gCx.className = "avonix-popup-close__glyph";
        gCx.style.fontSize = Math.round(closeSize * 0.5) + "px";
        gCx.textContent = "⊗";
        x.appendChild(gCx);
      } else {
        var stroke = closeIcon === "x_bold" ? "2.6" : "2.2";
        x.innerHTML =
          '<svg class="avonix-popup-close__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
          '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="' +
          stroke +
          '" stroke-linecap="round"/>' +
          "</svg>";
      }

      var idleAnim = theme.closeAnimation || "none";
      if (idleAnim && idleAnim !== "none") {
        x.className += " avonix-popup-close--anim-" + idleAnim;
      }
      var hoverAnim = theme.closeHoverAnimation || "scale";
      if (hoverAnim && hoverAnim !== "none") {
        x.className += " avonix-popup-close--hover-" + hoverAnim;
      }
      var closeBg = theme.closeBackground || "";
      var closeFg = theme.closeColor || "";
      var closeHoverBg = theme.closeHoverBackground || "";
      var closeHoverFg = theme.closeHoverColor || "";
      if (closeHoverBg || closeHoverFg) {
        x.addEventListener("mouseenter", function () {
          if (closeHoverBg) x.style.background = closeHoverBg;
          if (closeHoverFg) x.style.color = closeHoverFg;
        });
        x.addEventListener("mouseleave", function () {
          if (closeBg) x.style.background = closeBg;
          else x.style.background = "";
          if (closeFg) x.style.color = closeFg;
          else x.style.color = "";
        });
      }
      x.addEventListener("click", function () { dismiss("close"); });
      card.appendChild(x);
    }

    var bodyFamily = design.googleFont || siteFont("body");
    if (bodyFamily && bodyFamily !== "system") {
      card.style.fontFamily = "'" + String(bodyFamily).replace(/'/g, "") + "', system-ui, sans-serif";
    }

    var bodyCol = document.createElement("div");
    bodyCol.className = "avonix-popup-body";
    bodyCol.style.textAlign = gridAlign;
    bodyCol.style.alignItems = gridAlign === "center" ? "center" : (gridAlign === "right" ? "flex-end" : "stretch");
    if (grid.gap != null) bodyCol.style.gap = grid.gap + "px";
    if (gridMode === "media_split" && design.padding != null) {
      bodyCol.style.padding = design.padding + "px";
    }

    var headerEl = null;
    var useHeaderBand = gridMode === "header_band" || Boolean(theme.headerBackgroundColor);
    if (useHeaderBand) {
      headerEl = document.createElement("div");
      headerEl.className = "avonix-popup-header";
      headerEl.style.textAlign = gridAlign;
      if (gridMode === "header_band") {
        var fromC = theme.splitTopColor || theme.headerBackgroundColor || "#1e1b4b";
        var toC = theme.splitBottomColor || theme.headerBackgroundColor || "#7c3aed";
        headerEl.style.background = "linear-gradient(90deg, " + fromC + " 0%, " + toC + " 100%)";
      } else {
        headerEl.style.background = theme.headerBackgroundColor;
      }
      if (content.scarcityText) {
        var badge = document.createElement("span");
        badge.className = "avonix-popup-badge";
        badge.textContent = content.scarcityText;
        headerEl.appendChild(badge);
      }
      if (content.headline || pop.name) {
        var hh = document.createElement("h2");
        hh.textContent = content.headline || pop.name || "Hello";
        applyTextStyle(hh, content.headlineStyle, {
          fontSize: 26,
          fontWeight: 700,
          color: "#0f172a",
          align: gridAlign,
          fontFamily: (content.headlineStyle && content.headlineStyle.fontFamily) || design.headingFont || design.googleFont || siteFont("heading"),
        });
        headerEl.appendChild(hh);
      }
      if (content.description) {
        var hp = document.createElement("p");
        hp.textContent = content.description;
        applyTextStyle(hp, content.descriptionStyle, {
          fontSize: 14,
          fontWeight: 400,
          color: "#ffffff",
          align: gridAlign,
          fontFamily: (content.descriptionStyle && content.descriptionStyle.fontFamily) || design.googleFont || siteFont("body"),
        });
        headerEl.appendChild(hp);
      }
      card.className += " avonix-popup-card--header-band";
      card.style.padding = "0";
    } else {
      if (content.logoUrl) {
        var logo = document.createElement("img");
        logo.className = "avonix-popup-logo";
        logo.src = content.logoUrl;
        logo.alt = "";
        bodyCol.appendChild(logo);
      }

      if (content.headline || (!hasFormSurface && pop.name)) {
        var h = document.createElement("h2");
        h.textContent = content.headline || pop.name || "Hello";
        applyTextStyle(h, content.headlineStyle, {
          fontSize: hasFormSurface ? 22 : 20,
          fontWeight: 700,
          color: theme.textColor || "#0f1c2e",
          align: gridAlign,
          fontFamily: (content.headlineStyle && content.headlineStyle.fontFamily) || design.headingFont || design.googleFont || siteFont("heading"),
        });
        h.style.flexShrink = "0";
        bodyCol.appendChild(h);
      }

      if (content.description) {
        var p = document.createElement("p");
        p.textContent = content.description;
        applyTextStyle(p, content.descriptionStyle, {
          fontSize: 13,
          fontWeight: 400,
          color: "#64748b",
          align: gridAlign,
          fontFamily: (content.descriptionStyle && content.descriptionStyle.fontFamily) || design.googleFont || siteFont("body"),
        });
        p.style.flexShrink = "0";
        bodyCol.appendChild(p);
      }
    }

    if (content.imageUrl && gridMode === "stack") {
      var img = document.createElement("img");
      img.src = content.imageUrl;
      img.alt = "";
      img.style.cssText = "margin-top:4px;max-width:100%;border-radius:10px;display:block;";
      bodyCol.appendChild(img);
    }

    if (components.length) {
      var wrap = document.createElement("div");
      wrap.className = "avonix-popup-components";
      if (gridMode === "multi_column") {
        wrap.className += " avonix-popup-columns";
        wrap.style.gridTemplateColumns = "repeat(" + (grid.columnCount || 2) + ", minmax(0, 1fr))";
        wrap.style.gap = (grid.gap != null ? grid.gap : 16) + "px";
        if (stackMobile) wrap.className += " avonix-popup-columns--stack";
      }
      function renderComp(c) {
        var el = document.createElement("div");
        el.className = "avonix-popup-comp";
        var props = c.props || {};
        if (c.kind === "columns") {
          el.className = "avonix-popup-columns";
          if (props.stackOnMobile !== false) el.className += " avonix-popup-columns--stack";
          var count = props.count || (c.children && c.children.length) || 2;
          el.style.gridTemplateColumns = "repeat(" + count + ", minmax(0, 1fr))";
          el.style.gap = (props.gap != null ? props.gap : 16) + "px";
          (c.children || []).forEach(function (col) {
            var colEl = document.createElement("div");
            colEl.className = "avonix-popup-column";
            if (col.colSpan) colEl.style.gridColumn = "span " + Math.min(12, Math.max(1, col.colSpan));
            (col.children || []).forEach(function (child) {
              colEl.appendChild(renderComp(child));
            });
            el.appendChild(colEl);
          });
          return el;
        }
        if (c.kind === "column") {
          el.className = "avonix-popup-column";
          (c.children || []).forEach(function (child) {
            el.appendChild(renderComp(child));
          });
          return el;
        }
        if (c.kind === "divider") {
          el.style.borderTop = "1px solid #e6e9f0";
          el.style.margin = "12px 0";
        } else if (c.kind === "spacer") {
          el.style.height = (props.height || 12) + "px";
        } else if (c.kind === "headline") {
          el.style.fontWeight = "700";
          el.style.fontSize = "18px";
          el.style.color = "inherit";
          el.textContent = props.text || props.label || "";
        } else if (c.kind === "paragraph") {
          el.style.fontSize = "14px";
          el.textContent = props.text || props.label || "";
        } else if (c.kind === "image" && props.src) {
          var imgEl = document.createElement("img");
          imgEl.src = String(props.src);
          imgEl.alt = props.alt ? String(props.alt) : "";
          imgEl.style.cssText = "max-width:100%;border-radius:10px;display:block;";
          el.appendChild(imgEl);
        } else if (c.kind === "video" || c.kind === "youtube") {
          var vurl = String(props.url || props.src || content.youtubeUrl || "");
          var embed = youtubeEmbed(vurl);
          if (embed) {
            var ifr = document.createElement("iframe");
            ifr.src = embed;
            ifr.title = "Video";
            ifr.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
            ifr.allowFullscreen = true;
            ifr.style.cssText = "width:100%;aspect-ratio:16/9;border:0;border-radius:10px;";
            el.appendChild(ifr);
          } else if (vurl) {
            el.textContent = vurl;
          }
        } else if (c.kind === "custom_html" && props.html) {
          injectHtml(el, String(props.html));
        } else if (c.kind === "countdown" && content.countdownEndsAt) {
          el.textContent = "Ends: " + content.countdownEndsAt;
        } else if (c.kind === "coupon" && content.couponCode) {
          el.style.fontWeight = "700";
          el.textContent = (content.discountLabel ? content.discountLabel + " · " : "") + content.couponCode;
        } else if (c.kind === "live_visitors") {
          el.textContent = (12 + Math.floor(Math.random() * 40)) + " people viewing this offer";
        } else {
          el.textContent = props.label ? String(props.label) : (props.text ? String(props.text) : String(c.kind || ""));
        }
        return el;
      }
      components.forEach(function (c) {
        if (gridMode === "multi_column" && c.kind === "columns") {
          var full = renderComp(c);
          full.style.gridColumn = "1 / -1";
          wrap.appendChild(full);
        } else {
          wrap.appendChild(renderComp(c));
        }
      });
      bodyCol.appendChild(wrap);
    }

    if (content.couponCode && !components.some(function (c) { return c.kind === "coupon"; })) {
      var code = document.createElement("p");
      code.style.fontWeight = "700";
      code.style.margin = "0";
      code.style.textAlign = gridAlign;
      code.textContent = (content.discountLabel ? content.discountLabel + ": " : "") + content.couponCode;
      bodyCol.appendChild(code);
    }

    var formEl = null;
    if (hasForm) {
      var formWrap = document.createElement("div");
      formWrap.className = "avonix-popup-form-wrap" + (replaceFormButtons ? " avonix-popup-form-wrap--no-nav" : "");
      formWrap.style.width = "100%";
      injectHtml(formWrap, pop.form_html);
      try {
        formEl = formWrap.querySelector("form.avonix-form, form[data-avx-ultimate], form");
        if (formEl) {
          var draftBtn = formEl.querySelector(".avx-draft");
          if (draftBtn) draftBtn.hidden = true;
          if (formEl.getAttribute("data-mode") === "single") {
            var nextBtn = formEl.querySelector(".avx-next");
            if (nextBtn) nextBtn.hidden = true;
          }
          if (replaceFormButtons) {
            var nav = formEl.querySelector(".avx-nav");
            if (nav) nav.hidden = true;
          }
        }
      } catch (e) {}
      formWrap.addEventListener("submit", function () {
        track(pop, "convert");
        fireAutomation(pop, "submit");
        if (behavior.redirectUrl) {
          setTimeout(function () { window.location.href = behavior.redirectUrl; }, 400);
        }
      }, true);
      bodyCol.appendChild(formWrap);
    } else if (hasEmbed) {
      var embedWrap = document.createElement("div");
      embedWrap.className = "avonix-popup-form-wrap avonix-popup-form-wrap--embed";
      embedWrap.style.width = "100%";
      var frame = document.createElement("iframe");
      frame.src = pop.form_embed_url;
      frame.title = content.headline || pop.name || "Form";
      frame.loading = "lazy";
      frame.referrerPolicy = "no-referrer-when-downgrade";
      frame.setAttribute("allow", "clipboard-write; payment");
      frame.style.cssText = "width:100%;min-height:200px;max-height:min(42vh,280px);border:0;border-radius:12px;background:#fff;";
      embedWrap.appendChild(frame);
      bodyCol.appendChild(embedWrap);
    }

    var showPopupCta = !hasFormSurface || (hasForm && replaceFormButtons);
    if (showPopupCta) {
      var cta = content.primaryCta || {
        label: replaceFormButtons ? "Send" : "Continue",
        action: replaceFormButtons ? "submit_form" : "close_popup",
      };
      var btn = document.createElement(cta.url && cta.action !== "submit_form" ? "a" : "button");
      if (cta.url && cta.action !== "submit_form") btn.href = cta.url;
      else btn.type = "button";
      btn.className = "avonix-popup-cta";
      btn.textContent = cta.label || "Continue";
      btn.style.width = "100%";
      if (theme.buttonBackground) btn.style.background = theme.buttonBackground;
      if (theme.buttonTextColor) btn.style.color = theme.buttonTextColor;
      if (theme.buttonRadius != null) btn.style.borderRadius = theme.buttonRadius + "px";
      if (theme.buttonHeight != null) {
        btn.style.height = theme.buttonHeight + "px";
        btn.style.padding = "0 14px";
        btn.style.lineHeight = "1";
        btn.style.boxSizing = "border-box";
      }
      if (theme.buttonFontSize != null) btn.style.fontSize = theme.buttonFontSize + "px";
      if (theme.buttonBorderColor) {
        btn.style.border = "2px solid " + theme.buttonBorderColor;
        if (!theme.buttonBackground) btn.style.background = "#fff";
      }
      wireCta(btn, cta);
      bodyCol.appendChild(btn);
    }

    if (content.secondaryCta && content.secondaryCta.label) {
      var sec = content.secondaryCta;
      var sbtn = document.createElement(sec.url && sec.action === "open_url" ? "a" : "button");
      if (sec.url && sec.action === "open_url") sbtn.href = sec.url;
      else sbtn.type = "button";
      sbtn.className = "avonix-popup-cta-secondary";
      sbtn.textContent = sec.label;
      if (theme.secondaryLinkColor) sbtn.style.color = theme.secondaryLinkColor;
      wireCta(sbtn, sec);
      bodyCol.appendChild(sbtn);
    }

    if (gridMode === "media_split") {
      var media = document.createElement("div");
      media.className = "avonix-popup-media";
      media.style.flex = "0 0 " + mediaPct + "%";
      if (theme.mediaBackgroundColor) media.style.backgroundColor = theme.mediaBackgroundColor;
      if (content.imageUrl) {
        media.style.backgroundImage = 'url("' + String(content.imageUrl).replace(/"/g, "%22") + '")';
      }
      card.appendChild(media);
      card.appendChild(bodyCol);
    } else if (useHeaderBand) {
      if (headerEl) card.appendChild(headerEl);
      card.appendChild(bodyCol);
    } else {
      card.appendChild(bodyCol);
    }

    var shellEl = shell;
    shellEl.appendChild(card);
    root.appendChild(shellEl);
    if (close.clickOutside !== false && !close.neverClose) {
      root.addEventListener("click", function (ev) {
        if (ev.target === root) dismiss("outside");
      });
    }
    if (close.esc !== false && !close.neverClose) {
      document.addEventListener("keydown", function onKey(ev) {
        if (ev.key === "Escape") {
          dismiss("esc");
          document.removeEventListener("keydown", onKey);
        }
      });
    }
    if (close.autoCloseMs) {
      setTimeout(function () { if (document.body.contains(root)) dismiss("auto"); }, close.autoCloseMs);
    }
    document.body.appendChild(root);
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    // Mark success state so the white card + black thanks text CSS applies.
    function promoteSuccessOverlay() {
      if (!root || !root.querySelector(".avx-success")) return;
      root.classList.add("avonix-popup-root--success");
      var sc = root.querySelector(".avonix-popup-card");
      if (sc) sc.classList.add("avonix-popup-card--success");
    }
    document.addEventListener("avonix:form-success", promoteSuccessOverlay);
    try {
      var successWatch = new MutationObserver(promoteSuccessOverlay);
      successWatch.observe(root, { childList: true, subtree: true });
    } catch (eWatch) {}
    // Runtime CSS kill-switch (beats stale caches / form embed overflow:auto).
    if (!document.getElementById("avonix-popup-kill-v5")) {
      var killCss = document.createElement("style");
      killCss.id = "avonix-popup-kill-v5";
      killCss.textContent =
        ".avonix-popup-card,.avonix-popup-form-wrap,.avonix-popup-form," +
        ".avonix-popup-form .avonix-form,.avonix-popup-form .avx-form,.avonix-popup-form .avx-step{" +
        "scrollbar-width:none!important;-ms-overflow-style:none!important}" +
        ".avonix-popup-body{overflow-x:hidden!important;overflow-y:auto!important;" +
        "scrollbar-width:none!important;-ms-overflow-style:none!important;min-height:0!important;" +
        "padding-top:6px!important}" +
        ".avonix-popup-card{width:550px!important;max-width:min(550px,calc(100vw - 32px))!important;overflow:visible!important;border:0!important;outline:0!important}" +
        ".avonix-popup-form-wrap,.avonix-popup-form,.avonix-popup-form .avonix-form," +
        ".avonix-popup-form .avx-form,.avonix-popup-form .avx-step,.avonix-popup-form .avx-col{" +
        "overflow:visible!important}" +
        ".avonix-popup-form .avonix-form input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=file]):not([type=button]):not([type=submit]):focus," +
        ".avonix-popup-form .avonix-form select:focus," +
        ".avonix-popup-form .avonix-form textarea:focus{outline:2px solid var(--avx-input-focus-border,#ff6600)!important;" +
        "outline-offset:-2px!important;box-shadow:none!important}" +
        ".avonix-popup-root input[type=radio],.avonix-popup-root input[type=checkbox]{" +
        "appearance:auto!important;-webkit-appearance:auto!important;" +
        "width:16px!important;height:16px!important;min-height:0!important;min-width:0!important;" +
        "max-width:18px!important;max-height:18px!important;padding:0!important;margin:2px 6px 0 0!important;" +
        "border:0!important;outline:none!important;outline-offset:0!important;box-shadow:none!important;" +
        "background:transparent!important;flex-shrink:0!important}" +
        ".avonix-popup-root input[type=radio]:focus,.avonix-popup-root input[type=radio]:focus-visible," +
        ".avonix-popup-root input[type=radio]:checked,.avonix-popup-root input[type=checkbox]:focus," +
        ".avonix-popup-root input[type=checkbox]:focus-visible," +
        ".avonix-popup-root .avx-a11y-focus input[type=radio]:focus-visible," +
        ".avonix-popup-root .avx-a11y-focus input[type=checkbox]:focus-visible{" +
        "outline:none!important;outline-offset:0!important;box-shadow:none!important;border:0!important}" +
        ".avonix-popup-card:has(.avx-success),.avonix-popup-card--success{" +
        "width:550px!important;max-width:min(550px,calc(100vw - 32px))!important;" +
        "background:#fff!important;color:#0f172a!important;padding:28px 24px!important;" +
        "box-shadow:0 1px 2px rgba(15,23,42,.04),0 24px 64px rgba(15,23,42,.28)!important}" +
        ".avonix-popup-card:has(.avx-success) .avonix-popup-header," +
        ".avonix-popup-card--success .avonix-popup-header," +
        ".avonix-popup-card:has(.avx-success) .avonix-popup-cta," +
        ".avonix-popup-card--success .avonix-popup-cta," +
        ".avonix-popup-card:has(.avx-success) .avonix-popup-cta-secondary," +
        ".avonix-popup-card--success .avonix-popup-cta-secondary," +
        ".avonix-popup-card:has(.avx-success) .avonix-popup-media," +
        ".avonix-popup-card--success .avonix-popup-media," +
        ".avonix-popup-card:has(.avx-success) .avonix-popup-body>h2," +
        ".avonix-popup-card--success .avonix-popup-body>h2," +
        ".avonix-popup-card:has(.avx-success) .avonix-popup-body>p," +
        ".avonix-popup-card--success .avonix-popup-body>p{display:none!important}" +
        ".avonix-popup-card:has(.avx-success) .avonix-popup-form-wrap," +
        ".avonix-popup-card--success .avonix-popup-form-wrap," +
        ".avonix-popup-card:has(.avx-success) .avonix-popup-form," +
        ".avonix-popup-card--success .avonix-popup-form," +
        ".avonix-popup-card:has(.avx-success) .avx-success," +
        ".avonix-popup-card--success .avx-success{display:block!important;visibility:visible!important;opacity:1!important}" +
        ".avonix-popup-card:has(.avx-success) .avx-success," +
        ".avonix-popup-card--success .avx-success{" +
        "background:#fff!important;border:0!important;box-shadow:none!important;color:#0f172a!important;padding:8px 4px!important}" +
        ".avonix-popup-card:has(.avx-success) .avx-success-title," +
        ".avonix-popup-card--success .avx-success-title{color:#0f172a!important}" +
        ".avonix-popup-card:has(.avx-success) .avx-success-sub," +
        ".avonix-popup-card--success .avx-success-sub," +
        ".avonix-popup-card:has(.avx-success) .avx-success-brand," +
        ".avonix-popup-card--success .avx-success-brand{color:#334155!important}" +
        ".avonix-popup-root *::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}";
      document.head.appendChild(killCss);
    }
    fitToViewport();
    setTimeout(fitToViewport, 60);
    setTimeout(fitToViewport, 280);
    setTimeout(fitToViewport, 600);
    window.addEventListener("resize", fitToViewport);
  }

  function arm(pop) {
    var triggers = (pop.payload && pop.payload.triggers) || {};
    var fired = false;
    function fire() {
      if (fired || shown) return;
      fired = true;
      showPopup(pop);
    }

    var hasAny =
      triggers.onLoad ||
      (triggers.delayMs && triggers.delayMs[0]) ||
      (triggers.scrollPercent && triggers.scrollPercent[0]) ||
      (triggers.inactivityMs && triggers.inactivityMs[0]) ||
      (triggers.clickSelectors && triggers.clickSelectors[0]) ||
      (triggers.exitIntent && (triggers.exitIntent.desktop || triggers.exitIntent.mobileBack || triggers.exitIntent.closeTab));

    // Empty triggers → treat as on-load (so published popups always have a path)
    if (!hasAny) {
      setTimeout(fire, 600);
      return;
    }

    if (triggers.onLoad) {
      setTimeout(fire, (triggers.delayMs && triggers.delayMs[0]) || 400);
      return;
    }
    if (triggers.delayMs && triggers.delayMs[0]) setTimeout(fire, triggers.delayMs[0]);
    if (triggers.scrollPercent && triggers.scrollPercent[0]) {
      var target = Number(triggers.scrollPercent[0]) || 50;
      function onScroll() {
        var doc = document.documentElement;
        var max = (doc.scrollHeight - window.innerHeight) || 1;
        var pct = (window.scrollY / max) * 100;
        if (pct >= target) {
          window.removeEventListener("scroll", onScroll);
          fire();
        }
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
    if (triggers.inactivityMs && triggers.inactivityMs[0]) {
      var idle = Number(triggers.inactivityMs[0]) || 30000;
      var timer = setTimeout(fire, idle);
      ["mousemove", "keydown", "scroll", "click", "touchstart"].forEach(function (evt) {
        window.addEventListener(evt, function () {
          clearTimeout(timer);
          timer = setTimeout(fire, idle);
        }, { passive: true });
      });
    }
    if (triggers.clickSelectors && triggers.clickSelectors[0]) {
      document.addEventListener("click", function (ev) {
        try {
          if (ev.target && ev.target.closest && ev.target.closest(triggers.clickSelectors[0])) fire();
        } catch (e) {}
      });
    }
    if (triggers.exitIntent && triggers.exitIntent.desktop) {
      function onExit(ev) {
        if (ev.clientY <= 0) {
          document.removeEventListener("mouseout", onExit);
          fire();
        }
      }
      document.addEventListener("mouseout", onExit);
    }
  }

  var list = candidates();
  if (!list.length) {
    try { console.info("[Avonix Popup] no matching popups for this page/session"); } catch (e) {}
    return;
  }
  arm(list[0]);
})();
JS;
    }
}
