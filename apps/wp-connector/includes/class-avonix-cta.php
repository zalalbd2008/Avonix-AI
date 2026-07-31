<?php
if (!defined('ABSPATH')) {
    exit;
}

if (class_exists('Avonix_Cta')) {
    return;
}

/**
 * Smart Buttons injector (ADR-009) — Nexus Lead Suite bottom-nav parity.
 *
 * Liquid sticky footer bar on mobile/tablet (≤1023px). Config from cloud.
 * Connector key never reaches the page.
 */
class Avonix_Cta
{
    public function __construct()
    {
        add_action('wp_enqueue_scripts', [$this, 'enqueue'], 30);
    }

    public function enqueue()
    {
        $client = new Avonix_Client();
        if (!$client->is_configured()) {
            return;
        }

        $config = $client->get_cta_config();
        if (!$config || empty($config['groups']) || !is_array($config['groups'])) {
            return;
        }

        $handle = 'avonix-cta';
        wp_register_script($handle, false, [], AVONIX_VERSION, true);
        wp_enqueue_script($handle);

        // Font Awesome 6 — any custom FA icon name from Button Studio
        wp_enqueue_style(
            'avonix-fa',
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
            [],
            '6.5.2'
        );

        $global_fs = 14;
        foreach ($config['groups'] as $g) {
            if (!is_array($g) || empty($g['buttons']) || !is_array($g['buttons'])) {
                continue;
            }
            foreach ($g['buttons'] as $b) {
                if (!empty($b['style']['fontSize'])) {
                    $global_fs = max($global_fs, (int) $b['style']['fontSize']);
                }
            }
        }
        $global_fs = max(10, min(32, $global_fs));

        $payload = [
            'groups'         => $config['groups'],
            'path'           => $this->current_path(),
            'surface'        => $this->current_surface(),
            'globalFontSize' => $global_fs,
            'icons'          => $this->icon_svgs(),
        ];

        wp_add_inline_script(
            $handle,
            'window.AVONIX_CTA = ' . wp_json_encode($payload) . ';' . "\n" . $this->runtime_js(),
            'after'
        );

        wp_register_style($handle, false, [], AVONIX_VERSION);
        wp_enqueue_style($handle);
        wp_add_inline_style($handle, $this->runtime_css($global_fs));
    }

    private function current_path()
    {
        $uri = isset($_SERVER['REQUEST_URI'])
            ? (string) wp_unslash($_SERVER['REQUEST_URI'])
            : '/';
        $path = (string) wp_parse_url($uri, PHP_URL_PATH);
        return $path !== '' ? $path : '/';
    }

    private function current_surface()
    {
        if (function_exists('is_front_page') && is_front_page()) {
            return 'homepage';
        }
        if (function_exists('is_home') && is_home()) {
            return 'blog';
        }
        if (function_exists('is_singular') && is_singular('post')) {
            return 'single_post';
        }
        if (function_exists('is_404') && is_404()) {
            return '404';
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
        if (function_exists('is_product') && is_product()) {
            return 'product';
        }
        if (function_exists('is_shop') && is_shop()) {
            return 'shop';
        }
        return '';
    }

    /** Hardcoded SVGs — same keys as Nexus Smart Buttons. */
    private function icon_svgs()
    {
        return [
            'call'        => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.06 3.18a1 1 0 01-.23 1.05l-1.38 1.38a16.06 16.06 0 006.93 6.93l1.38-1.38a1 1 0 011.05-.23l3.18 1.06A1 1 0 0121 16.72V19a2 2 0 01-2 2h-1C9.16 21 3 14.84 3 7V5z"/></svg>',
            'mail'        => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
            'message'     => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6a2 2 0 012-2h14a2 2 0 012 2v10z"/></svg>',
            'whatsapp'    => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.86 11.86 0 0012.04 0C5.5 0 .2 5.3.2 11.82c0 2.08.55 4.11 1.6 5.9L0 24l6.43-1.68a11.8 11.8 0 005.6 1.43h.01c6.54 0 11.84-5.3 11.84-11.82 0-3.16-1.23-6.13-3.46-8.45zM12.04 21.5h-.01a9.8 9.8 0 01-5-1.37l-.36-.21-3.81 1 1.02-3.71-.23-.38a9.77 9.77 0 01-1.5-5.21c0-5.4 4.4-9.8 9.84-9.8 2.63 0 5.1 1.02 6.96 2.88a9.75 9.75 0 012.88 6.95c0 5.4-4.4 9.8-9.79 9.8z"/></svg>',
            'location'    => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/></svg>',
            'appointment' => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
            'download'    => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>',
            'popup'       => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>',
            'cta'         => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 15l-6 6m0 0l-3-9 9-3-6 6z"/></svg>',
            'event'       => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>',
            'arrow'       => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>',
            'ai-chat'     => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2m0 14v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M3 12h2m14 0h2M4.9 19.1l1.4-1.4m11.4-11.4l1.4-1.4M9 12a3 3 0 106 0 3 3 0 00-6 0z"/></svg>',
            'live-chat'   => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6a2 2 0 012-2h14a2 2 0 012 2v10z"/></svg>',
            'phone'       => null, // alias → call
        ];
    }

    private function runtime_css($global_fs)
    {
        $fs = (int) $global_fs;
        return <<<CSS
/* Avonix Smart Buttons — liquid footer (Nexus bottom-nav parity) */
.avonix-bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999990;
  background: #ffffff;
  border-top: 1px solid rgba(0,0,0,0.10);
  box-shadow: 0 -4px 24px rgba(0,0,0,0.10);
  padding: 1px;
  padding-bottom: max(1px, env(safe-area-inset-bottom));
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}
@media (max-width: 1023px) {
  .avonix-bottom-nav { display: block; }
}
.avonix-bottom-nav__inner {
  container-type: inline-size;
  --avx-nav-gap: 1px;
  --avx-nav-fs-min: 10px;
  --avx-nav-fs-max: {$fs}px;
  --avx-nav-inner-min: 256px;
  --avx-nav-inner-max: 700px;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--avx-nav-gap);
  justify-content: flex-start;
  align-items: stretch;
  width: 100%;
  max-width: 100%;
}
.avonix-bottom-nav__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35em;
  text-decoration: none !important;
  font-weight: 600;
  box-sizing: border-box;
  cursor: pointer;
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
  overflow: visible;
  border: 0;
  font-size: clamp(
    var(--avx-nav-fs-min),
    calc(
      var(--avx-nav-fs-min)
      + (100cqw - var(--avx-nav-inner-min))
      * (var(--avx-nav-fs-max) - var(--avx-nav-fs-min))
      / (var(--avx-nav-inner-max) - var(--avx-nav-inner-min))
    ),
    var(--avx-nav-fs-max)
  );
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease, opacity 0.18s ease;
}
.avonix-bottom-nav__btn--inline {
  flex: 1 1 0%;
  min-width: max-content;
  max-width: 100%;
}
.avonix-bottom-nav__btn--block {
  flex: 0 0 100%;
  width: 100%;
  max-width: 100%;
}
.avonix-bottom-nav__btn svg,
.avonix-bottom-nav__btn i,
.avonix-bottom-nav__btn img.avonix-cta-icon {
  flex-shrink: 0;
  width: 1.2em;
  height: 1.2em;
}
.avonix-bottom-nav__btn i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05em;
  width: auto;
  height: auto;
  line-height: 1;
}
.avonix-bottom-nav__btn img.avonix-cta-icon {
  object-fit: contain;
}
.avonix-bottom-nav__btn--lift:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.18); }
.avonix-bottom-nav__btn--scale:hover { transform: scale(1.05); }
.avonix-bottom-nav__btn--glow:hover { box-shadow: 0 0 20px rgba(99,102,241,0.55); }
.avonix-bottom-nav__btn--darken:hover { filter: brightness(0.88); }
.avonix-bottom-nav__btn--shake:hover { animation: avonix-nav-shake 0.4s ease; }
.avonix-bottom-nav__btn--rotate:hover { transform: rotate(3deg); }
@keyframes avonix-nav-shake {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}
@media (prefers-reduced-motion: reduce) {
  .avonix-bottom-nav__btn { transition: none !important; }
  .avonix-bottom-nav__btn--shake:hover { animation: none; }
}
body.avonix-cta-padded {
  padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important;
}
CSS;
    }

    private function runtime_js()
    {
        return <<<'JS'
(function () {
  var cfg = window.AVONIX_CTA;
  if (!cfg || !cfg.groups || !cfg.groups.length) return;

  var ICONS = cfg.icons || {};
  ICONS.phone = ICONS.phone || ICONS.call;

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

  function pageMatches(settings) {
    var t = (settings && settings.pageTarget) || { mode: "everywhere" };
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

  function collectButtons() {
    var ranked = cfg.groups.slice().sort(function (a, b) {
      return (a.priority_rank || 100) - (b.priority_rank || 100);
    });
    var out = [];
    var maxVisible = null;
    for (var i = 0; i < ranked.length; i++) {
      var g = ranked[i];
      if (!pageMatches(g.settings)) continue;
      var groupBtns = (g.buttons || []).slice().sort(function (a, b) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
      groupBtns.forEach(function (b) { out.push(b); });
      if (maxVisible == null && g.settings && g.settings.maxVisible != null) {
        maxVisible = Number(g.settings.maxVisible);
      }
      // Exclusive: this matching group owns the footer — skip lower-priority groups
      if (g.settings && g.settings.exclusive) break;
    }
    // Optional cap: only when maxVisible is an explicit positive number
    if (maxVisible != null && !isNaN(maxVisible) && maxVisible > 0) {
      out = out.slice(0, maxVisible);
    }
    return out;
  }

  function hrefFor(btn) {
    var action = btn.action || {};
    var eventName = btn.event_name || btn.eventName || "";
    if (eventName || (action.url && String(action.url).indexOf("popup:") === 0)) return "#";
    var t = action.type;
    if (t === "phone" && action.phone) return "tel:" + String(action.phone).replace(/\s+/g, "");
    if (t === "sms" && action.phone) {
      return "sms:" + String(action.phone).replace(/\s+/g, "") + (action.message ? "?body=" + encodeURIComponent(action.message) : "");
    }
    if (t === "email" && action.email) return "mailto:" + action.email;
    if (t === "whatsapp" && action.phone) {
      return "https://wa.me/" + String(action.phone).replace(/\D+/g, "") + (action.message ? "?text=" + encodeURIComponent(action.message) : "");
    }
    if (action.url) return action.url;
    return "#";
  }

  function runAction(btn, ev) {
    var action = btn.action || {};
    var eventName = btn.event_name || btn.eventName || "";
    if (eventName || action.type === "open_popup") {
      ev.preventDefault();
      try {
        document.dispatchEvent(new CustomEvent("avonix:popup", { detail: { eventName: eventName || action.popupId } }));
      } catch (e) {}
      return;
    }
    if (action.type === "ai_chat" || action.type === "live_chat") {
      ev.preventDefault();
      var launcher = document.querySelector(".avonix-chat-launcher, #avonix-chat-open, [data-avonix-chat]");
      if (launcher) launcher.click();
      return;
    }
    if (action.type === "scroll_top") {
      ev.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function track(btn) {
    try {
      if (window.AvonixTrack && typeof window.AvonixTrack.push === "function") {
        window.AvonixTrack.push({
          type: "button",
          label: btn.label || btn.name,
          css_class: "avx-smart-" + (btn.id || ""),
          purpose: (btn.action && btn.action.type) || "smart_button",
          page_path: cfg.path || "/"
        });
      }
    } catch (e) {}
  }

  function styleNum(v, fallback) {
    var n = parseInt(v, 10);
    return isNaN(n) ? fallback : n;
  }

  function render() {
    var buttons = collectButtons();
    var existing = document.getElementById("avonix-cta-root");
    if (existing) existing.remove();
    document.body.classList.remove("avonix-cta-padded");
    if (!buttons.length) return;

    var nav = document.createElement("nav");
    nav.id = "avonix-cta-root";
    nav.className = "avonix-bottom-nav";
    nav.setAttribute("aria-label", "Smart Buttons");

    var inner = document.createElement("div");
    inner.className = "avonix-bottom-nav__inner";
    if (cfg.globalFontSize) {
      inner.style.setProperty("--avx-nav-fs-max", cfg.globalFontSize + "px");
    }

    buttons.forEach(function (btn) {
      var style = btn.style || {};
      var bg = style.bg || "#10b981";
      var text = style.text || style.color || "#ffffff";
      var padV = styleNum(style.paddingVertical, 12);
      var padH = styleNum(style.paddingHorizontal, 24);
      var radius = styleNum(style.radius, 8);
      var hover = style.hoverEffect || style.animation || "glow";
      var mode = style.displayMode === "block" ? "block" : "inline";
      var effects = ["lift", "scale", "glow", "darken", "shake", "rotate"];
      var hoverClass = effects.indexOf(hover) !== -1 ? " avonix-bottom-nav__btn--" + hover : "";

      var a = document.createElement("a");
      a.className = "avonix-bottom-nav__btn avonix-bottom-nav__btn--" + mode + hoverClass;
      a.href = hrefFor(btn);
      a.setAttribute("aria-label", btn.aria_label || btn.label || btn.name || "Button");
      a.style.backgroundColor = bg;
      a.style.color = text;
      a.style.padding = padV + "px " + padH + "px";
      a.style.borderRadius = radius + "px";

      var iconKey = btn.icon_key || "none";
      var iconPack = btn.icon_pack || (btn.design && btn.design.icon && btn.design.icon.pack) || "fa";
      var faStyle = btn.icon_fa_style || (btn.design && btn.design.icon && btn.design.icon.faStyle) || "solid";
      var customUrl = btn.icon_custom_url || (btn.design && btn.design.icon && btn.design.icon.customUrl) || "";
      var faPrefix = faStyle === "brands" ? "fa-brands" : faStyle === "regular" ? "fa-regular" : "fa-solid";

      if (iconPack === "custom" && customUrl) {
        var img = document.createElement("img");
        img.className = "avonix-cta-icon";
        img.src = customUrl;
        img.alt = "";
        img.setAttribute("aria-hidden", "true");
        a.appendChild(img);
      } else if (iconKey && iconKey !== "none" && iconKey !== "custom") {
        var faSlug = String(iconKey).replace(/^fa-/, "");
        if (iconPack === "fa" || !ICONS[faSlug === "phone" ? "call" : faSlug]) {
          var iEl = document.createElement("i");
          iEl.className = faPrefix + " fa-" + faSlug;
          iEl.setAttribute("aria-hidden", "true");
          a.appendChild(iEl);
        } else {
          var legacyKey = faSlug === "phone" ? "call" : faSlug;
          var wrap = document.createElement("span");
          wrap.innerHTML = ICONS[legacyKey];
          if (wrap.firstChild) a.appendChild(wrap.firstChild);
        }
      }

      var span = document.createElement("span");
      span.textContent = btn.label || btn.name || "Button";
      a.appendChild(span);

      a.addEventListener("click", function (ev) {
        track(btn);
        runAction(btn, ev);
      });

      inner.appendChild(a);
    });

    nav.appendChild(inner);
    document.body.appendChild(nav);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      document.body.classList.add("avonix-cta-padded");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
  window.addEventListener("resize", function () {
    clearTimeout(window.__avonixCtaResize);
    window.__avonixCtaResize = setTimeout(render, 150);
  });
})();
JS;
    }
}
