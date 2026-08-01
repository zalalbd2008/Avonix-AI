<?php
if (!defined('ABSPATH')) {
    exit;
}

if (class_exists('Avonix_Accessibility')) {
    return;
}

/**
 * Floating accessibility widget for visitors.
 * Config from Avonix cloud (websites.settings.accessibility).
 */
class Avonix_Accessibility
{
    public function __construct()
    {
        add_action('wp_enqueue_scripts', [$this, 'enqueue'], 33);
    }

    public function enqueue()
    {
        $client = new Avonix_Client();
        if (!$client->is_configured()) {
            return;
        }

        $config = $client->get_accessibility_config();
        if (!$config || empty($config['enabled'])) {
            return;
        }

        if (!empty($config['hide_on_mobile']) && wp_is_mobile()) {
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

        $handle = 'avonix-accessibility';
        wp_register_script($handle, false, [], AVONIX_VERSION, true);
        wp_enqueue_script($handle);

        $payload = [
            'enabled'              => true,
            'label'                => $config['label'] ?? 'Accessibility',
            'primaryColor'         => $config['primary_color'] ?? '#e15d1a',
            'iconStyle'            => $config['icon_style'] ?? 'classic',
            'iconSize'             => isset($config['icon_size']) ? (int) $config['icon_size'] : 22,
            'buttonPadding'        => isset($config['button_padding']) ? (int) $config['button_padding'] : 11,
            'placement'            => $config['placement'] ?? null,
            'position'             => $config['position'] ?? 'bottom-left',
            'features'             => $config['features'] ?? [],
            'profiles'             => $config['profiles'] ?? [],
            'statement'            => $config['statement'] ?? [],
            'announceChanges'      => !empty($config['announce_changes']),
            'persistVisitorPrefs'  => !array_key_exists('persist_visitor_prefs', $config) || !empty($config['persist_visitor_prefs']),
        ];

        wp_add_inline_script(
            $handle,
            'window.AVONIX_A11Y = ' . wp_json_encode($payload) . ';' . "\n" . $this->runtime_js(),
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
#avonix-a11y-root{position:fixed;z-index:2147482900;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;pointer-events:none}
#avonix-a11y-root *{box-sizing:border-box}
#avonix-a11y-root .avonix-a11y-stack{position:relative;width:var(--avonix-a11y-size,44px);height:var(--avonix-a11y-size,44px);pointer-events:auto;overflow:visible}
#avonix-a11y-root .avonix-a11y-btn{position:absolute;inset:0;display:grid;place-items:center;width:100%;height:100%;border:0;border-radius:var(--avonix-a11y-radius,50%);cursor:pointer;color:#fff;background:var(--avonix-a11y-primary,#e15d1a);box-shadow:0 8px 22px rgba(15,23,42,.22);transition:transform .15s ease,filter .15s;z-index:1;padding:0}
#avonix-a11y-root .avonix-a11y-btn:hover{transform:scale(1.05);filter:brightness(1.05)}
#avonix-a11y-root .avonix-a11y-btn:focus-visible{outline:2px solid #0b1e3a;outline-offset:2px}
#avonix-a11y-root .avonix-a11y-btn svg{width:var(--avonix-a11y-icon,52%);height:var(--avonix-a11y-icon,52%);display:block}
#avonix-a11y-root .avonix-a11y-tip{position:absolute;top:50%;z-index:0;max-width:0;overflow:hidden;pointer-events:none;white-space:nowrap;border-radius:6px;background:#fff;color:#2a2f38;font-size:12px;font-weight:500;line-height:1.2;box-shadow:0 1px 4px rgba(15,23,42,.14);opacity:0;transform:translateY(-50%);transition:opacity .15s ease,max-width .18s ease,padding .18s ease,transform .15s ease}
#avonix-a11y-root .avonix-a11y-stack.is-start .avonix-a11y-tip{left:100%;transform:translateY(-50%) translateX(-4px)}
#avonix-a11y-root .avonix-a11y-stack.is-end .avonix-a11y-tip{right:100%;transform:translateY(-50%) translateX(4px)}
#avonix-a11y-root .avonix-a11y-stack:hover .avonix-a11y-tip,#avonix-a11y-root .avonix-a11y-stack:focus-within .avonix-a11y-tip{max-width:200px;opacity:1;padding:6px 10px}
#avonix-a11y-root .avonix-a11y-stack.is-start:hover .avonix-a11y-tip,#avonix-a11y-root .avonix-a11y-stack.is-start:focus-within .avonix-a11y-tip{transform:translateY(-50%) translateX(8px)}
#avonix-a11y-root .avonix-a11y-stack.is-end:hover .avonix-a11y-tip,#avonix-a11y-root .avonix-a11y-stack.is-end:focus-within .avonix-a11y-tip{transform:translateY(-50%) translateX(-8px)}
#avonix-a11y-root .avonix-a11y-stack.is-open .avonix-a11y-tip{display:none!important}
#avonix-a11y-root .avonix-a11y-panel{display:none;position:absolute;bottom:calc(100% + 10px);width:min(320px,calc(100vw - 24px));max-height:min(520px,70vh);overflow:auto;background:#fff;border:1px solid #e8edf5;border-radius:16px;box-shadow:0 16px 40px rgba(11,30,58,.18);z-index:2;padding:0;scrollbar-width:thin}
#avonix-a11y-root .avonix-a11y-stack.is-open .avonix-a11y-panel{display:flex;flex-direction:column}
#avonix-a11y-root .avonix-a11y-stack.is-start .avonix-a11y-panel{left:0}
#avonix-a11y-root .avonix-a11y-stack.is-end .avonix-a11y-panel{right:0}
#avonix-a11y-root .avonix-a11y-stack.is-below .avonix-a11y-panel{bottom:auto;top:calc(100% + 10px)}
#avonix-a11y-root .avonix-a11y-head{display:flex;align-items:center;gap:10px;padding:14px 14px 12px;background:var(--avonix-a11y-primary,#e15d1a);color:#fff;flex-shrink:0}
#avonix-a11y-root .avonix-a11y-head__title{margin:0;font-size:14px;font-weight:700;flex:1;line-height:1.2}
#avonix-a11y-root .avonix-a11y-close{border:0;background:rgba(255,255,255,.16);color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;display:grid;place-items:center;font-size:14px;line-height:1;padding:0}
#avonix-a11y-root .avonix-a11y-body{padding:12px 12px 14px;display:flex;flex-direction:column;gap:10px}
#avonix-a11y-root .avonix-a11y-sec{margin:0;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#94a3b8}
#avonix-a11y-root .avonix-a11y-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#avonix-a11y-root .avonix-a11y-toggle{border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:10px 10px;font-size:12.5px;font-weight:500;color:#1e293b;cursor:pointer;text-align:left;line-height:1.3;transition:border-color .15s,background .15s}
#avonix-a11y-root .avonix-a11y-toggle.is-on{border-color:var(--avonix-a11y-primary,#e15d1a);background:color-mix(in srgb,var(--avonix-a11y-primary,#e15d1a) 10%,#fff);color:#0f172a}
#avonix-a11y-root .avonix-a11y-reset{border:0;background:#f1f5f9;color:#334155;border-radius:10px;padding:10px 12px;font-size:12.5px;font-weight:600;cursor:pointer;width:100%}
#avonix-a11y-root .avonix-a11y-reset:hover{background:#e2e8f0}
#avonix-a11y-root .avonix-a11y-stmt{font-size:11.5px;line-height:1.45;color:#64748b;margin:0}
html.avonix-a11y-grayscale{filter:grayscale(1)!important}
html.avonix-a11y-invert{filter:invert(1) hue-rotate(180deg)!important}
html.avonix-a11y-high-contrast{filter:contrast(1.35)!important}
html.avonix-a11y-dark-contrast{filter:contrast(1.15) brightness(.92)!important}
html.avonix-a11y-light-contrast{filter:contrast(1.08) brightness(1.08)!important}
html.avonix-a11y-stop-anim *,html.avonix-a11y-stop-anim *::before,html.avonix-a11y-stop-anim *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
html.avonix-a11y-hide-images img,html.avonix-a11y-hide-images picture,html.avonix-a11y-hide-images video{visibility:hidden!important}
html.avonix-a11y-underline-links a{text-decoration:underline!important}
html.avonix-a11y-highlight-links a{outline:2px solid var(--avonix-a11y-primary,#e15d1a);outline-offset:2px}
html.avonix-a11y-big-cursor,html.avonix-a11y-big-cursor *{cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' stroke='%23fff' stroke-width='1' d='M4 3l8 17 1.5-6.5L20 12z'/%3E%3C/svg%3E") 4 4, auto!important}
html.avonix-a11y-focus-ring :focus-visible{outline:3px solid var(--avonix-a11y-primary,#e15d1a)!important;outline-offset:3px!important}
html.avonix-a11y-large-click a,html.avonix-a11y-large-click button{min-height:44px;min-width:44px}
html.avonix-a11y-readable{font-family:Verdana,Arial,sans-serif!important;letter-spacing:.02em}
html.avonix-a11y-dyslexia{font-family:Comic Sans MS,OpenDyslexic,Arial,sans-serif!important;letter-spacing:.06em;word-spacing:.12em}
#avonix-a11y-guide{position:fixed;left:0;right:0;height:3px;background:var(--avonix-a11y-primary,#e15d1a);z-index:2147483001;pointer-events:none;display:none}
html.avonix-a11y-reading-guide #avonix-a11y-guide{display:block}
#avonix-a11y-mask{position:fixed;inset:0;z-index:2147483000;pointer-events:none;display:none;background:rgba(0,0,0,.55);--avonix-mask-y:50%;mask-image:linear-gradient(to bottom,#000 calc(var(--avonix-mask-y) - 60px),transparent calc(var(--avonix-mask-y) - 50px),transparent calc(var(--avonix-mask-y) + 50px),#000 calc(var(--avonix-mask-y) + 60px));-webkit-mask-image:linear-gradient(to bottom,#000 calc(var(--avonix-mask-y) - 60px),transparent calc(var(--avonix-mask-y) - 50px),transparent calc(var(--avonix-mask-y) + 50px),#000 calc(var(--avonix-mask-y) + 60px))}
html.avonix-a11y-reading-mask #avonix-a11y-mask{display:block}
#avonix-a11y-skip{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:2147483646;background:#0f172a;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;font:600 14px/1.2 system-ui,sans-serif}
#avonix-a11y-skip:focus{left:12px;top:12px;width:auto;height:auto;overflow:visible}
CSS;
    }

    private function runtime_js()
    {
        return <<<'JS'
(function () {
  var CFG = window.AVONIX_A11Y;
  if (!CFG || !CFG.enabled) return;

  var KEY = "avonix_a11y_prefs";
  var primary = CFG.primaryColor || "#e15d1a";
  // Same formula as Live Chat / Languages — fully editable icon + padding.
  var iconSize = Math.round(Number(CFG.iconSize));
  if (!isFinite(iconSize)) iconSize = 22;
  iconSize = Math.max(0, Math.min(100, iconSize));
  var pad = Math.round(Number(CFG.buttonPadding));
  if (!isFinite(pad)) pad = 11;
  pad = Math.max(0, Math.min(100, pad));
  var outer = Math.max(1, iconSize + pad * 2);
  var feats = CFG.features || {};
  var profiles = CFG.profiles || {};
  var state = {};

  function load() {
    if (CFG.persistVisitorPrefs === false) return {};
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function save() {
    if (CFG.persistVisitorPrefs === false) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function announce(msg) {
    if (!CFG.announceChanges) return;
    var live = document.getElementById("avonix-a11y-live");
    if (!live) return;
    live.textContent = "";
    setTimeout(function () { live.textContent = msg; }, 20);
  }

  function setClass(name, on) {
    document.documentElement.classList.toggle(name, !!on);
  }

  function applyFontScale() {
    var n = Number(state.fontSize || 0);
    document.documentElement.style.fontSize = n ? (100 + n * 12) + "%" : "";
  }
  function applyLineHeight() {
    document.documentElement.style.setProperty("--avonix-a11y-lh", state.lineHeight ? "1.8" : "");
    if (state.lineHeight) document.body && (document.body.style.lineHeight = "1.8");
    else if (document.body) document.body.style.lineHeight = "";
  }
  function applyLetterSpacing() {
    if (document.body) document.body.style.letterSpacing = state.letterSpacing ? "0.08em" : "";
  }
  function applyTextAlign() {
    if (document.body) document.body.style.textAlign = state.textAlign || "";
  }
  function applyBrightness() {
    var b = Number(state.brightness || 0);
    document.documentElement.style.filter = "";
    // brightness/saturation stacked via classes where possible; use inline for levels
  }

  function applyAll() {
    setClass("avonix-a11y-grayscale", state.grayscale);
    setClass("avonix-a11y-invert", state.invertColors);
    setClass("avonix-a11y-high-contrast", state.highContrast);
    setClass("avonix-a11y-dark-contrast", state.darkContrast);
    setClass("avonix-a11y-light-contrast", state.lightContrast);
    setClass("avonix-a11y-stop-anim", state.stopAnimations);
    setClass("avonix-a11y-hide-images", state.hideImages);
    setClass("avonix-a11y-underline-links", state.underlineLinks);
    setClass("avonix-a11y-highlight-links", state.highlightLinks);
    setClass("avonix-a11y-big-cursor", state.bigCursor);
    setClass("avonix-a11y-focus-ring", state.focusRing);
    setClass("avonix-a11y-large-click", state.largeClickArea);
    setClass("avonix-a11y-readable", state.readableFont);
    setClass("avonix-a11y-dyslexia", state.dyslexiaFont);
    setClass("avonix-a11y-reading-guide", state.readingGuide);
    setClass("avonix-a11y-reading-mask", state.readingMask);
    setClass("avonix-a11y-keyboard", state.keyboardNav);
    applyFontScale();
    applyLineHeight();
    applyLetterSpacing();
    applyTextAlign();
    document.documentElement.style.setProperty("--avonix-a11y-primary", primary);
    var sat = Number(state.saturation || 0);
    var bri = Number(state.brightness || 0);
    var filters = [];
    if (state.grayscale) filters.push("grayscale(1)");
    if (state.invertColors) filters.push("invert(1) hue-rotate(180deg)");
    if (state.highContrast) filters.push("contrast(1.35)");
    if (state.darkContrast) filters.push("contrast(1.15) brightness(0.92)");
    if (state.lightContrast) filters.push("contrast(1.08) brightness(1.08)");
    if (bri) filters.push("brightness(" + (1 + bri * 0.15) + ")");
    if (sat) filters.push("saturate(" + (1 + sat * 0.35) + ")");
    // Prefer class-based for simple toggles; combine extra levels
    if (bri || sat) {
      var base = document.documentElement.style.filter || "";
      document.documentElement.style.filter = filters.join(" ");
    } else if (!state.grayscale && !state.invertColors && !state.highContrast && !state.darkContrast && !state.lightContrast) {
      document.documentElement.style.filter = "";
    }
  }

  function toggle(key, label) {
    state[key] = !state[key];
    if (key === "fontSize") state.fontSize = state.fontSize ? 0 : 1;
    if (key === "brightness") state.brightness = state.brightness ? 0 : 1;
    if (key === "saturation") state.saturation = state.saturation ? 0 : 1;
    if (key === "textAlign") state.textAlign = state.textAlign ? "" : "left";
    applyAll();
    save();
    syncButtons();
    announce((state[key] ? "Enabled: " : "Disabled: ") + (label || key));
  }

  function resetAll() {
    state = {};
    document.documentElement.style.filter = "";
    document.documentElement.style.fontSize = "";
    if (document.body) {
      document.body.style.lineHeight = "";
      document.body.style.letterSpacing = "";
      document.body.style.textAlign = "";
    }
    [
      "avonix-a11y-grayscale","avonix-a11y-invert","avonix-a11y-high-contrast","avonix-a11y-dark-contrast",
      "avonix-a11y-light-contrast","avonix-a11y-stop-anim","avonix-a11y-hide-images","avonix-a11y-underline-links",
      "avonix-a11y-highlight-links","avonix-a11y-big-cursor","avonix-a11y-focus-ring","avonix-a11y-large-click",
      "avonix-a11y-readable","avonix-a11y-dyslexia","avonix-a11y-reading-guide","avonix-a11y-reading-mask","avonix-a11y-keyboard"
    ].forEach(function (c) { document.documentElement.classList.remove(c); });
    save();
    syncButtons();
    announce("Accessibility settings reset");
  }

  function applyProfile(id) {
    resetAll();
    if (id === "visuallyImpaired") {
      state.fontSize = 2; state.highContrast = true; state.readableFont = true; state.underlineLinks = true; state.focusRing = true;
    } else if (id === "seizureSafe") {
      state.stopAnimations = true; state.saturation = -1; state.hideImages = false;
    } else if (id === "adhdFriendly") {
      state.readingMask = true; state.stopAnimations = true; state.fontSize = 1;
    } else if (id === "cognitiveDisability") {
      state.readableFont = true; state.lineHeight = true; state.letterSpacing = true; state.tooltips = true;
    } else if (id === "blindUsers") {
      state.focusRing = true; state.keyboardNav = true; state.skipToContent = true; state.announce = true;
    } else if (id === "motorImpaired") {
      state.largeClickArea = true; state.bigCursor = true; state.keyboardNav = true;
    }
    applyAll();
    save();
    syncButtons();
    announce("Profile applied");
  }

  var TOOLS = [
    ["highContrast", "High contrast", "highContrast"],
    ["darkContrast", "Dark contrast", "darkContrast"],
    ["lightContrast", "Light contrast", "lightContrast"],
    ["grayscale", "Grayscale", "grayscale"],
    ["invertColors", "Invert colors", "invertColors"],
    ["brightness", "Brightness", "brightness"],
    ["saturation", "Saturation", "saturation"],
    ["fontSize", "Bigger text", "fontSize"],
    ["readableFont", "Readable font", "readableFont"],
    ["dyslexiaFont", "Dyslexia font", "dyslexiaFont"],
    ["lineHeight", "Line height", "lineHeight"],
    ["letterSpacing", "Letter spacing", "letterSpacing"],
    ["underlineLinks", "Underline links", "underlineLinks"],
    ["highlightLinks", "Highlight links", "highlightLinks"],
    ["bigCursor", "Big cursor", "bigCursor"],
    ["readingGuide", "Reading guide", "readingGuide"],
    ["readingMask", "Reading mask", "readingMask"],
    ["stopAnimations", "Stop animations", "stopAnimations"],
    ["hideImages", "Hide images", "hideImages"],
    ["keyboardNav", "Keyboard nav", "keyboardNav"],
    ["focusRing", "Focus ring", "focusRing"],
    ["largeClickArea", "Large buttons", "largeClickArea"]
  ];

  var PROFILE_TOOLS = [
    ["visuallyImpaired", "Visually impaired"],
    ["seizureSafe", "Seizure safe"],
    ["adhdFriendly", "ADHD friendly"],
    ["cognitiveDisability", "Cognitive"],
    ["blindUsers", "Blind users"],
    ["motorImpaired", "Motor impaired"]
  ];

  var root = document.createElement("div");
  root.id = "avonix-a11y-root";
  root.style.setProperty("--avonix-a11y-primary", primary);
  root.style.setProperty("--avonix-a11y-size", outer + "px");
  root.style.setProperty("--avonix-a11y-icon", iconSize + "px");

  var stack = document.createElement("div");
  stack.className = "avonix-a11y-stack";

  var panel = document.createElement("div");
  panel.className = "avonix-a11y-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", CFG.label || "Accessibility");

  var head = document.createElement("div");
  head.className = "avonix-a11y-head";
  head.innerHTML = '<p class="avonix-a11y-head__title"></p><button type="button" class="avonix-a11y-close" aria-label="Close">✕</button>';
  head.querySelector(".avonix-a11y-head__title").textContent = CFG.label || "Accessibility";

  var body = document.createElement("div");
  body.className = "avonix-a11y-body";

  function addSec(title) {
    var s = document.createElement("p");
    s.className = "avonix-a11y-sec";
    s.textContent = title;
    body.appendChild(s);
  }
  function addGrid(items, kind) {
    var g = document.createElement("div");
    g.className = "avonix-a11y-grid";
    items.forEach(function (it) {
      var key = it[0], label = it[1], feat = it[2];
      if (kind === "tool" && feats[feat] === false) return;
      if (kind === "profile" && profiles[key] === false) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "avonix-a11y-toggle";
      b.setAttribute("data-key", key);
      b.setAttribute("data-kind", kind);
      b.textContent = label;
      b.addEventListener("click", function () {
        if (kind === "profile") applyProfile(key);
        else toggle(key, label);
      });
      g.appendChild(b);
    });
    if (g.childNodes.length) body.appendChild(g);
  }

  addSec("Profiles");
  addGrid(PROFILE_TOOLS, "profile");
  addSec("Content");
  addGrid(TOOLS, "tool");

  var reset = document.createElement("button");
  reset.type = "button";
  reset.className = "avonix-a11y-reset";
  reset.textContent = "Reset all";
  reset.addEventListener("click", resetAll);
  body.appendChild(reset);

  var stmt = CFG.statement || {};
  if (stmt.enabled && (stmt.companyName || stmt.contactEmail || stmt.customHtml)) {
    var st = document.createElement("p");
    st.className = "avonix-a11y-stmt";
    st.textContent = (stmt.companyName ? stmt.companyName + " · " : "") +
      (stmt.contactEmail || "") +
      (stmt.lastReviewed ? " · Reviewed " + stmt.lastReviewed : "");
    body.appendChild(st);
  }

  panel.appendChild(head);
  panel.appendChild(body);

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "avonix-a11y-btn";
  btn.setAttribute("aria-label", CFG.label || "Accessibility");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="4" r="2" fill="currentColor"/><path d="M12 8v4m0 0l-4 8m4-8l4 8M7 11h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var tip = document.createElement("span");
  tip.className = "avonix-a11y-tip";
  tip.setAttribute("aria-hidden", "true");
  tip.textContent = CFG.label || "Accessibility";

  function setOpen(on) {
    stack.classList.toggle("is-open", on);
    btn.setAttribute("aria-expanded", on ? "true" : "false");
  }
  btn.addEventListener("click", function () { setOpen(!stack.classList.contains("is-open")); });
  head.querySelector(".avonix-a11y-close").addEventListener("click", function () { setOpen(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });

  stack.appendChild(panel);
  stack.appendChild(btn);
  stack.appendChild(tip);
  root.appendChild(stack);

  var live = document.createElement("div");
  live.id = "avonix-a11y-live";
  live.setAttribute("aria-live", "polite");
  live.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)";
  root.appendChild(live);

  var guide = document.createElement("div");
  guide.id = "avonix-a11y-guide";
  var mask = document.createElement("div");
  mask.id = "avonix-a11y-mask";
  document.addEventListener("mousemove", function (e) {
    guide.style.top = e.clientY + "px";
    mask.style.setProperty("--avonix-mask-y", e.clientY + "px");
  });

  if (feats.skipToContent !== false) {
    var skip = document.createElement("a");
    skip.id = "avonix-a11y-skip";
    skip.href = "#main, #content, main, [role=main]";
    skip.textContent = "Skip to content";
    skip.addEventListener("click", function (e) {
      e.preventDefault();
      var t = document.querySelector("main, #main, #content, [role='main']");
      if (t) { t.setAttribute("tabindex", "-1"); t.focus(); t.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
    document.body.appendChild(skip);
  }

  function syncButtons() {
    panel.querySelectorAll(".avonix-a11y-toggle[data-kind=tool]").forEach(function (el) {
      var k = el.getAttribute("data-key");
      var on = !!state[k];
      if (k === "fontSize") on = Number(state.fontSize || 0) > 0;
      if (k === "brightness") on = Number(state.brightness || 0) !== 0;
      if (k === "saturation") on = Number(state.saturation || 0) !== 0;
      if (k === "textAlign") on = !!state.textAlign;
      el.classList.toggle("is-on", on);
    });
  }

  function place() {
    var pl = CFG.placement || {};
    var vw = window.innerWidth || document.documentElement.clientWidth || 360;
    var vh = window.innerHeight || document.documentElement.clientHeight || 640;
    var xPct = Math.max(0, Math.min(100, Number(pl.xPercent)));
    var yPct = Math.max(0, Math.min(100, Number(pl.yPercent)));
    if (!isFinite(xPct)) xPct = String(CFG.position || "").indexOf("right") >= 0 ? 92 : 3;
    if (!isFinite(yPct)) yPct = String(CFG.position || "").indexOf("top") >= 0 ? 3 : 97;
    // Full-viewport % — same 1% step for every floating widget size.
    var x = Math.round((xPct / 100) * vw);
    var y = Math.round((yPct / 100) * vh);
    x = Math.min(Math.max(0, vw - outer), Math.max(0, x));
    y = Math.min(Math.max(0, vh - outer), Math.max(0, y));
    root.style.left = x + "px";
    root.style.top = y + "px";
    root.style.right = "auto";
    root.style.bottom = "auto";
    var openLeft = xPct >= 50;
    var nearTop = yPct < 28;
    stack.classList.toggle("is-end", openLeft);
    stack.classList.toggle("is-start", !openLeft);
    stack.classList.toggle("is-below", nearTop);
    // Edge-dock tile: flat on the screen edge, rounded on the inner side.
    var r = Math.max(6, Math.round(outer * (10 / 44)));
    root.style.setProperty(
      "--avonix-a11y-radius",
      openLeft ? r + "px 0 0 " + r + "px" : "0 " + r + "px " + r + "px 0"
    );
  }

  state = load();
  document.body.appendChild(root);
  document.body.appendChild(guide);
  document.body.appendChild(mask);
  applyAll();
  syncButtons();
  place();
  window.addEventListener("resize", place);
  setTimeout(place, 120);
})();
JS;
    }
}
