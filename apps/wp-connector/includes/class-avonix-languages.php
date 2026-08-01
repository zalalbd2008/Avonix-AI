<?php
if (!defined('ABSPATH')) {
    exit;
}

if (class_exists('Avonix_Languages')) {
    return;
}

/**
 * Floating language switcher + page translation for visitors.
 *
 * Config from Avonix cloud. When engine ≠ none, uses Google Website Translator
 * (client-side) so the live site translates immediately without a CMS rewrite.
 */
class Avonix_Languages
{
    public function __construct()
    {
        add_action('wp_enqueue_scripts', [$this, 'enqueue'], 32);
    }

    public function enqueue()
    {
        $client = new Avonix_Client();
        if (!$client->is_configured()) {
            return;
        }

        $config = $client->get_languages_config();
        if (
            !$config
            || empty($config['enabled'])
            || empty($config['switcher']['enabled'])
            || empty($config['locales'])
            || !is_array($config['locales'])
        ) {
            return;
        }

        $path = Avonix_Page_Target::current_path();
        $surface = Avonix_Page_Target::current_surface();
        $page_target = isset($config['page_target']) && is_array($config['page_target'])
            ? $config['page_target']
            : [
                'mode' => 'everywhere',
                'excludePaths' => isset($config['exclude_paths']) && is_array($config['exclude_paths'])
                    ? $config['exclude_paths']
                    : [],
            ];
        if (!Avonix_Page_Target::matches($page_target, $path, $surface)) {
            return;
        }

        $handle = 'avonix-languages';
        wp_register_script($handle, false, [], AVONIX_VERSION, true);
        wp_enqueue_script($handle);

        $payload = [
            'enabled'           => true,
            'defaultLocale'     => $config['default_locale'] ?? 'en',
            'fallbackLocale'    => $config['fallback_locale'] ?? 'en',
            'engine'            => $config['engine'] ?? 'avonix-ai',
            'locales'           => $config['locales'],
            'switcher'          => $config['switcher'],
            'detection'         => $config['detection'] ?? [],
            'excludeSelectors'  => $config['exclude_selectors'] ?? [],
            'neverTranslate'    => $config['never_translate'] ?? [],
            'path'              => $path,
        ];

        wp_add_inline_script(
            $handle,
            'window.AVONIX_LANG = ' . wp_json_encode($payload) . ';' . "\n" . $this->runtime_js(),
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
        $path = (string) wp_parse_url($uri, PHP_URL_PATH);
        return $path !== '' ? $path : '/';
    }

    private function runtime_css()
    {
        return <<<'CSS'
#avonix-lang-root {
  position: fixed;
  z-index: 99990;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  pointer-events: none;
}
#avonix-lang-root * { box-sizing: border-box; }
#avonix-lang-root .avonix-lang-stack {
  position: relative;
  width: var(--avonix-lang-size, 44px);
  height: var(--avonix-lang-size, 44px);
  pointer-events: auto;
  overflow: visible;
}
#avonix-lang-root .avonix-lang-panel {
  position: absolute;
  bottom: calc(100% + 8px);
  width: 220px;
  max-height: min(280px, 50vh);
  overflow: auto;
  background: #fff;
  border: 1px solid #e8edf5;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(11, 30, 58, 0.16);
  z-index: 2;
}
#avonix-lang-root .avonix-lang-stack.is-start .avonix-lang-panel { left: 0; }
#avonix-lang-root .avonix-lang-stack.is-end .avonix-lang-panel { right: 0; }
#avonix-lang-root .avonix-lang-stack.is-below .avonix-lang-panel {
  bottom: auto;
  top: calc(100% + 8px);
}
#avonix-lang-root .avonix-lang-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-size: 12px;
  color: #5b6b7c;
}
#avonix-lang-root .avonix-lang-row:hover { background: #f8fafc; }
#avonix-lang-root .avonix-lang-row.is-active {
  background: color-mix(in srgb, var(--avonix-lang-primary, #e15d1a) 8%, #fff);
  color: #0b1e3a;
  font-weight: 650;
}
#avonix-lang-root .avonix-lang-flag { font-size: 15px; line-height: 1; }
#avonix-lang-root .avonix-lang-btn {
  position: absolute;
  left: 0;
  top: 0;
  display: grid;
  place-items: center;
  width: var(--avonix-lang-size, 44px);
  height: var(--avonix-lang-size, 44px);
  border: 0;
  border-radius: var(--avonix-lang-radius, 50%);
  cursor: pointer;
  color: #fff;
  background: var(--avonix-lang-primary, #e15d1a);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--avonix-lang-primary, #e15d1a) 35%, transparent);
  transition: filter 0.15s ease;
  z-index: 1;
}
#avonix-lang-root .avonix-lang-btn:hover { filter: brightness(1.05); }
#avonix-lang-root .avonix-lang-btn:focus-visible {
  outline: 2px solid #0b1e3a;
  outline-offset: 2px;
}
#avonix-lang-root .avonix-lang-tip {
  position: absolute;
  top: 50%;
  z-index: 0;
  max-width: 0;
  overflow: hidden;
  pointer-events: none;
  white-space: nowrap;
  border-radius: 6px;
  background: #fff;
  color: #2a2f38;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.14);
  opacity: 0;
  transform: translateY(-50%);
  transition: opacity 0.15s ease, max-width 0.18s ease, padding 0.18s ease, transform 0.15s ease;
}
#avonix-lang-root .avonix-lang-stack.is-start .avonix-lang-tip {
  left: 100%;
  transform: translateY(-50%) translateX(-4px);
}
#avonix-lang-root .avonix-lang-stack.is-end .avonix-lang-tip {
  right: 100%;
  transform: translateY(-50%) translateX(4px);
}
#avonix-lang-root .avonix-lang-stack:hover .avonix-lang-tip,
#avonix-lang-root .avonix-lang-stack:focus-within .avonix-lang-tip {
  max-width: 200px;
  opacity: 1;
  padding: 6px 10px;
}
#avonix-lang-root .avonix-lang-stack.is-start:hover .avonix-lang-tip,
#avonix-lang-root .avonix-lang-stack.is-start:focus-within .avonix-lang-tip {
  transform: translateY(-50%) translateX(8px);
}
#avonix-lang-root .avonix-lang-stack.is-end:hover .avonix-lang-tip,
#avonix-lang-root .avonix-lang-stack.is-end:focus-within .avonix-lang-tip {
  transform: translateY(-50%) translateX(-8px);
}
#avonix-lang-root .avonix-lang-btn[aria-expanded="true"] ~ .avonix-lang-tip {
  display: none !important;
}
#avonix-lang-root .avonix-lang-glyph {
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  user-select: none;
}
/* Hide Google's default banner / gadget chrome */
.goog-te-banner-frame, .goog-te-balloon-frame, #goog-gt-tt, .goog-tooltip,
.goog-te-spinner-pos, .skiptranslate iframe.skiptranslate {
  display: none !important;
}
body { top: 0 !important; }
.goog-te-gadget { font-size: 0 !important; }
#avonix-gt-host { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
CSS;
    }

    private function runtime_js()
    {
        return <<<'JS'
(function () {
  var CFG = window.AVONIX_LANG;
  if (!CFG || !CFG.enabled || !CFG.switcher || !CFG.switcher.enabled) return;
  if (!CFG.locales || !CFG.locales.length) return;

  var KEY = "avonix_lang";
  var sw = CFG.switcher;
  // Editable: outer = iconSize + 2×padding (same formula as Live Chat / Accessibility).
  var iconSize = Math.round(Number(sw.icon_size));
  if (!isFinite(iconSize)) iconSize = 22;
  iconSize = Math.max(0, Math.min(100, iconSize));
  var pad = Math.round(Number(sw.button_padding));
  if (!isFinite(pad)) pad = 11;
  pad = Math.max(0, Math.min(100, pad));
  var outer = Math.max(1, iconSize + pad * 2);
  var primary = String(sw.primary_color || "#e15d1a").trim() || "#e15d1a";

  /** Read free % placement — never treat 0 as missing (|| default was breaking left/top). */
  function readPlacementPercents() {
    var pl = sw.placement || {};
    var x = Number(pl.xPercent != null ? pl.xPercent : pl.x_percent);
    var y = Number(pl.yPercent != null ? pl.yPercent : pl.y_percent);
    if (!isFinite(x) || !isFinite(y)) {
      var pos = String(sw.position || "").toLowerCase().replace(/_/g, "-");
      if (!isFinite(x)) {
        x = pos.indexOf("left") >= 0 ? 3 : 97;
      }
      if (!isFinite(y)) {
        y = pos.indexOf("bottom") >= 0 ? 97 : 3;
      }
    }
    return {
      xPct: Math.max(0, Math.min(100, x)),
      yPct: Math.max(0, Math.min(100, y)),
    };
  }

  function googleCode(code) {
    var map = { zh: "zh-CN", tw: "zh-TW", pt: "pt", he: "iw", nb: "no" };
    return map[code] || code;
  }

  function readChoice() {
    try {
      return localStorage.getItem(KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function writeChoice(code) {
    try {
      if (CFG.detection && CFG.detection.rememberChoice === false) return;
      localStorage.setItem(KEY, code);
    } catch (e) {}
  }

  function setGoogTrans(from, to) {
    var v = "/" + from + "/" + to;
    var domain = location.hostname;
    document.cookie = "googtrans=" + v + ";path=/";
    document.cookie = "googtrans=" + v + ";path=/;domain=." + domain;
  }

  function clearGoogTrans() {
    var domain = location.hostname;
    document.cookie = "googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "googtrans=;path=/;domain=." +
      domain +
      ";expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }

  function applyNeverTranslate() {
    var list = CFG.neverTranslate || [];
    if (!list.length) return;
    var walk = document.body;
    if (!walk) return;
    var re = new RegExp(
      "(" +
        list
          .map(function (s) {
            return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          })
          .join("|") +
        ")",
      "gi"
    );
    var tw = document.createTreeWalker(walk, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (tw.nextNode()) nodes.push(tw.currentNode);
    nodes.forEach(function (node) {
      if (!node.nodeValue || !re.test(node.nodeValue)) return;
      re.lastIndex = 0;
      if (node.parentElement && node.parentElement.closest(".notranslate, [data-no-translate], #avonix-lang-root")) {
        return;
      }
      var span = document.createElement("span");
      span.className = "notranslate";
      span.textContent = node.nodeValue;
      node.parentNode.replaceChild(span, node);
    });
  }

  function applyExcludeSelectors() {
    (CFG.excludeSelectors || []).forEach(function (sel) {
      try {
        document.querySelectorAll(sel).forEach(function (el) {
          el.classList.add("notranslate");
          el.setAttribute("translate", "no");
        });
      } catch (e) {}
    });
  }

  function readGoogTransTo() {
    var m = document.cookie.match(/(?:^|; )googtrans=\/[^/;]+\/([^;]+)/);
    return m ? decodeURIComponent(m[1]).toLowerCase() : "";
  }

  function ourCodeFromGoogle(g) {
    g = String(g || "").toLowerCase();
    if (g === "zh-cn") return "zh";
    if (g === "iw") return "he";
    var short = g.split("-")[0];
    var hit = CFG.locales.find(function (l) {
      return googleCode(l.code).toLowerCase() === g || l.code === short;
    });
    return hit ? hit.code : "";
  }

  // Default page language until the visitor clicks a locale.
  // Do not browser-detect or force-translate on load.
  var current = CFG.defaultLocale || (CFG.locales[0] && CFG.locales[0].code) || "en";
  var activeGoogle = ourCodeFromGoogle(readGoogTransTo());
  if (activeGoogle) {
    current = activeGoogle;
  } else {
    clearGoogTrans();
  }

  var open = false;
  var root = document.createElement("div");
  root.id = "avonix-lang-root";
  root.setAttribute("translate", "no");
  root.className = "notranslate";
  root.style.setProperty("--avonix-lang-size", outer + "px");
  root.style.setProperty("--avonix-lang-primary", primary);

  var stack = document.createElement("div");
  stack.className = "avonix-lang-stack";

  function placeLang() {
    var pct = readPlacementPercents();
    var xPct = pct.xPct;
    var yPct = pct.yPct;
    var vw = window.innerWidth || document.documentElement.clientWidth || 360;
    var vh = window.innerHeight || document.documentElement.clientHeight || 640;
    // Same math as studio / accessibility: % of (viewport − launcher).
    var maxX = Math.max(0, vw - outer);
    var maxY = Math.max(0, vh - outer);
    var x = Math.round((xPct / 100) * maxX);
    var y = Math.round((yPct / 100) * maxY);
    x = Math.min(vw - outer, Math.max(0, x));
    y = Math.min(vh - outer, Math.max(0, y));
    root.style.left = x + "px";
    root.style.top = y + "px";
    root.style.right = "auto";
    root.style.bottom = "auto";
    var openLeft = xPct >= 50;
    var nearTop = yPct < 28;
    stack.classList.toggle("is-end", openLeft);
    stack.classList.toggle("is-start", !openLeft);
    stack.classList.toggle("is-below", nearTop);
    var r = Math.max(6, Math.round(outer * (10 / 44)));
    root.style.setProperty(
      "--avonix-lang-radius",
      openLeft ? r + "px 0 0 " + r + "px" : "0 " + r + "px " + r + "px 0"
    );
  }

  var panel = document.createElement("div");
  panel.className = "avonix-lang-panel";
  panel.hidden = true;
  var list = document.createElement("div");
  CFG.locales.forEach(function (loc) {
    var row = document.createElement("button");
    row.type = "button";
    row.className = "avonix-lang-row" + (loc.code === current ? " is-active" : "");
    row.setAttribute("data-code", loc.code);
    var html = "";
    if (sw.show_flags) {
      html += '<span class="avonix-lang-flag">' + (loc.flag || "🌐") + "</span>";
    }
    var name = sw.show_native_names ? loc.native || loc.label : loc.label;
    if (sw.show_codes) name += " (" + loc.code + ")";
    html += "<span>" + name + "</span>";
    row.innerHTML = html;
    list.appendChild(row);
  });
  panel.appendChild(list);

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "avonix-lang-btn";
  btn.setAttribute("aria-label", "Language");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML =
    '<span class="avonix-lang-glyph" style="font-size:' +
    iconSize +
    'px">A文</span>';

  var tip = document.createElement("span");
  tip.className = "avonix-lang-tip";
  tip.setAttribute("aria-hidden", "true");
  tip.textContent = "Language";

  stack.appendChild(panel);
  stack.appendChild(btn);
  stack.appendChild(tip);
  root.appendChild(stack);

  var gtHost = document.createElement("div");
  gtHost.id = "avonix-gt-host";
  root.appendChild(gtHost);

  function ensureOnBody() {
    if (!document.body) return;
    if (root.parentNode !== document.body) {
      document.body.appendChild(root);
    }
    placeLang();
  }

  function mount() {
    ensureOnBody();
    applyExcludeSelectors();
    applyNeverTranslate();
    setTimeout(placeLang, 120);
    setTimeout(placeLang, 600);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
  window.addEventListener("resize", placeLang);
  window.addEventListener("orientationchange", placeLang);

  function setOpen(v) {
    open = !!v;
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  btn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
  });
  panel.addEventListener("click", function (e) {
    e.stopPropagation();
    var t = e.target;
    var row = t && t.closest ? t.closest("[data-code]") : null;
    if (!row) return;
    selectLang(row.getAttribute("data-code"));
  });
  document.addEventListener(
    "pointerdown",
    function (e) {
      if (!open) return;
      if (root.contains(e.target)) return;
      setOpen(false);
    },
    true
  );

  var translateReady = false;
  var pendingCode = null;

  function loadGoogle(cb) {
    if (window.google && window.google.translate) {
      cb();
      return;
    }
    if (document.getElementById("avonix-gt-script")) {
      var n = 0;
      var iv = setInterval(function () {
        n++;
        if ((window.google && window.google.translate) || n > 40) {
          clearInterval(iv);
          cb();
        }
      }, 150);
      return;
    }
    window.googleTranslateElementInit = function () {
      try {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: googleCode(CFG.defaultLocale || "en"),
            includedLanguages: CFG.locales
              .map(function (l) {
                return googleCode(l.code);
              })
              .join(","),
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          "avonix-gt-host"
        );
      } catch (e) {}
      // Google Translate often re-parents body nodes — keep switcher on <body>.
      ensureOnBody();
      setTimeout(ensureOnBody, 200);
      translateReady = true;
      if (pendingCode) {
        var c = pendingCode;
        pendingCode = null;
        selectLang(c);
      }
    };
    var s = document.createElement("script");
    s.id = "avonix-gt-script";
    s.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.head.appendChild(s);
  }

  function selectLang(code) {
    if (!code) return;
    current = code;
    writeChoice(code);
    list.querySelectorAll(".avonix-lang-row").forEach(function (el) {
      el.classList.toggle("is-active", el.getAttribute("data-code") === code);
    });
    setOpen(false);

    document.documentElement.lang = code;
    var loc = CFG.locales.find(function (l) {
      return l.code === code;
    });
    if (loc && loc.rtl) {
      document.documentElement.dir = "rtl";
    } else {
      document.documentElement.dir = "ltr";
    }

    if (!CFG.engine || CFG.engine === "none") {
      clearGoogTrans();
      return;
    }

    var from = googleCode(CFG.defaultLocale || "en");
    var to = googleCode(code);
    if (to === from) {
      clearGoogTrans();
      location.reload();
      return;
    }

    setGoogTrans(from, to);
    if (!translateReady && !(window.google && window.google.translate)) {
      pendingCode = code;
      loadGoogle(function () {});
      // Cookie set — reload so translate applies reliably
      location.reload();
      return;
    }
    location.reload();
  }

  // No auto-translate on load. Translation only after a locale click
  // (click sets googtrans cookie, then reload applies it).
})();
JS;
    }
}
