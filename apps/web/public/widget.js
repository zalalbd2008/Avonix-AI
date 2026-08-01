/*
 * Avonix CEP chat widget — Nexus Lead Suite parity (bubble + panel + AI messenger)
 * No build step. Talks only to WP admin-ajax (connector key stays server-side).
 * Can mount an embedded wizard AND a floating bubble on the same page.
 */
(function () {
  "use strict";

  function pageTargetAllows(t, path, surface) {
    if (!t || typeof t !== "object") return true;
    path = path || "/";
    surface = surface || "";
    var excludes = t.excludePaths || t.exclude_paths || [];
    for (var i = 0; i < excludes.length; i++) {
      var ex = String(excludes[i] || "");
      if (!ex) continue;
      if (ex.charAt(ex.length - 1) === "*") {
        var prefix = ex.replace(/\*+$/, "").replace(/\/$/, "");
        if (!prefix || path.indexOf(prefix) === 0) return false;
      } else if (path === ex || path.indexOf(ex) === 0) {
        return false;
      }
    }
    var mode = t.mode || "everywhere";
    if (mode === "everywhere") return true;
    var ok = false;
    (t.surfaces || []).forEach(function (s) {
      if (s === surface) ok = true;
    });
    (t.rules || []).forEach(function (r) {
      if (!r || !r.value) return;
      var v = String(r.value);
      var op = r.op || "equals";
      if (op === "equals" && path === v) ok = true;
      if (op === "starts_with" && path.indexOf(v) === 0) ok = true;
      if (op === "ends_with" && path.slice(-v.length) === v) ok = true;
      if (op === "contains" && path.indexOf(v) !== -1) ok = true;
      if (op === "regex") {
        try {
          if (new RegExp(v).test(path)) ok = true;
        } catch (e) {}
      }
    });
    if (mode === "include") return ok;
    if (mode === "exclude") return !ok;
    return true;
  }

  function createAvonixChatWidget(config) {
  var proxy = config.proxy;
  if (!proxy) return null;

  var theme = config.theme || {};
  var modules = config.modules || {};
  var instanceUid = String(config._uid || "main");

  function parseHex(h) {
    h = String(h || "").replace("#", "").trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  function mixHex(hex, toward, t) {
    var a = parseHex(hex) || { r: 37, g: 99, b: 235 };
    var b = parseHex(toward) || { r: 255, g: 255, b: 255 };
    function ch(x, y) {
      return Math.round(x + (y - x) * t);
    }
    function hx(n) {
      var s = n.toString(16);
      return s.length < 2 ? "0" + s : s;
    }
    return "#" + hx(ch(a.r, b.r)) + hx(ch(a.g, b.g)) + hx(ch(a.b, b.b));
  }
  /** Keep theme colors from breaking the injected stylesheet. */
  function sanitizeCssColor(raw, fallback) {
    var s = String(raw == null ? "" : raw).trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) return s;
    if (/^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(\s*,\s*[\d.]+\s*)?\)$/i.test(s))
      return s;
    return fallback;
  }
  /** Reject CSS injection in size tokens (width/height). */
  function sanitizeCssSize(raw, fallback) {
    var s = String(raw == null ? "" : raw).trim();
    if (!s || /[{};<>]/.test(s)) return fallback;
    return s;
  }

  var primary = sanitizeCssColor(theme.primaryColor || config.color, "#2563eb");
  var onPrimary = sanitizeCssColor(theme.onPrimaryColor, "#ffffff");
  var primaryEnd = sanitizeCssColor(theme.primaryColorEnd, primary);
  var headBg = sanitizeCssColor(
    theme.headerColor,
    mixHex(primary, "#0b1220", 0.8)
  );
  var botBubble = sanitizeCssColor(
    theme.botBubbleColor,
    mixHex(primary, "#f8fafc", 0.94)
  );
  var botBorder = mixHex(primary, "#ffffff", 0.87);
  var primaryTint = mixHex(primary, "#ffffff", 0.9);
  var primaryRing = "color-mix(in srgb," + primary + ",transparent 82%)";
  var onlineDot = sanitizeCssColor(theme.onlineDotColor, "#00ff6a");
  var surfaceBg = sanitizeCssColor(theme.backgroundColor, "#ffffff");
  var canvasBg = "#f6f8fc";
  // Editable launcher: outer = iconSize + 2×padding (defaults 22 / 11).
  var launcherIconSz = Number(theme.launcherIconSize);
  var launcherPadSz = Number(theme.launcherPadding);
  if (!isFinite(launcherIconSz)) launcherIconSz = 22;
  if (!isFinite(launcherPadSz)) launcherPadSz = 11;
  launcherIconSz = Math.max(0, Math.min(100, Math.round(launcherIconSz)));
  launcherPadSz = Math.max(0, Math.min(100, Math.round(launcherPadSz)));
  var launcherPx = Math.max(1, launcherIconSz + 2 * launcherPadSz);
  var launcherIconPct = Math.max(
    20,
    Math.min(90, Math.round((launcherIconSz / launcherPx) * 100))
  );
  var launcherCorner = Math.max(6, Math.round(launcherPx * (10 / 44)));
  function launcherTileRadius(flushLeft) {
    var r = launcherCorner + "px";
    // Flat against the screen edge; rounded on the inner side.
    return flushLeft ? "0 " + r + " " + r + " 0" : r + " 0 0 " + r;
  }
  var agentName = theme.agentName || config.title || "Customer Support";
  var statusText = theme.statusText || "Online";
  var homeContent =
    theme.homeContent ||
    config.home_content ||
    config.greeting ||
    "Hi! Ask me anything about our site and I'll help right away.";
  var startConvLabel = theme.startButtonLabel || "Start Conversation";
  var openOnLaunch = theme.openOnLaunch !== false; // default: skip home, open AI directly
  var preChatOn = theme.preChatEnabled === true;
  var agreementRequired = theme.agreementRequired !== false; // default: required
  var agreementBrand =
    theme.agreementBrandName || theme.agentName || config.title || "Support";
  var agreementLogo = theme.agreementLogoUrl || "";
  var agreementLogoSize = Number(theme.agreementLogoSize);
  if (!isFinite(agreementLogoSize)) agreementLogoSize = 56;
  agreementLogoSize = Math.max(0, Math.min(1000, Math.round(agreementLogoSize)));
  var agreementIntro =
    theme.agreementIntro ||
    "Hi! I am your " + agreementBrand + " Virtual Agent.";
  var agreementBody =
    theme.agreementBody ||
    "I'm happy to help find what you need. To continue, you will need to agree to our Terms Of Use and Privacy Policy.";
  var agreementHtml = String(theme.agreementHtml || "").trim();
  var termsUrl = theme.termsUrl || "";
  var privacyUrl = theme.privacyUrl || "";
  var agreeLabel = theme.agreeLabel || "I Agree";
  var disagreeLabel = theme.disagreeLabel || "I Don't Agree";
  var agreeStorageKey =
    "avonix-cep-agree-" + String(config.widget_id || config.website_id || "site");
  // Agreement is required at the start of every new chat open — not remembered
  // across opens (clear any legacy localStorage flag from older builds).
  var agreedForOpen = false;
  try {
    localStorage.removeItem(agreeStorageKey);
  } catch (e) {}
  var disclaimer = theme.disclaimer || "";
  var avatarUrl =
    config.bot_avatar_url ||
    config.agent_avatar_url ||
    theme.bubbleImageUrl ||
    "";
  var rawPos = String(theme.position || "bottom_right").toLowerCase().replace(/-/g, "_");
  var edgeX = rawPos.indexOf("left") >= 0 ? "left" : "right";
  var edgeY = rawPos.indexOf("top") >= 0 ? "top" : "bottom";
  var ox = theme.offsetX != null ? theme.offsetX : 24;
  var oy = theme.offsetY != null ? theme.offsetY : 24;
  function parsePlacementPercent(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    if (!isFinite(n)) return null;
    return Math.min(100, Math.max(0, n));
  }
  var freeX = parsePlacementPercent(theme.leftPercent);
  var freeY = parsePlacementPercent(theme.topPercent);
  // Always use free % placement (same as studio). Map corner presets when
  // percents are absent — never leave the FAB at CSS 0,0 / top-left.
  if (freeX == null) freeX = edgeX === "left" ? 2 : 88;
  if (freeY == null) freeY = edgeY === "top" ? 2 : 82;
  var useFree = true;
  // Above Accessibility (2147482900) / Languages so the chat FAB is never buried.
  var z = Math.max(2147483200, Number(theme.zIndex) || 0);
  var radius = theme.radius != null ? theme.radius : 16;
  var deskW = sanitizeCssSize(theme.desktopWidth, "320px");
  var deskH = sanitizeCssSize(
    theme.desktopHeight,
    "min(510px, calc(100vh - 130px))"
  );
  var mobW = sanitizeCssSize(
    theme.mobileWidth,
    "min(320px, calc(100vw - 24px))"
  );
  var mobH = sanitizeCssSize(
    theme.mobileHeight,
    "min(510px, calc(100svh - 164px))"
  );
  var surface = config.surface || "bubble";
  var soundsOn = modules.sounds !== false;
  var streamingOn = modules.streaming !== false;
  var allowAttach = modules.attachments !== false;

  var conversationId = null;
  var lastSeenAt = null;
  var handoffStatus = "ai";
  var open = false;
  var busy = false;
  var pollTimer = null;
  var seenIds = {};
  var aiViewActive = false;
  var leadGatePassed = false;
  var lastBotText = "";
  var ttsOn = false;
  var visitorName = "";
  var visitorEmail = "";
  var visitorPhone = "";
  try {
    visitorName = sessionStorage.getItem("avonix-cep-name") || "";
    visitorEmail = sessionStorage.getItem("avonix-cep-email") || "";
    visitorPhone = sessionStorage.getItem("avonix-cep-phone") || "";
  } catch (e) {}

  var alignEnd = useFree ? freeX >= 50 : edgeX === "right";
  // DOM order is panel then launcher. Use column when opening upward so the
  // FAB stays at the bottom; column-reverse when opening downward.
  var stackUp = useFree ? freeY >= 45 : edgeY === "bottom";
  var rootPosCss = edgeY + ":" + oy + "px;" + edgeX + ":" + ox + "px;";
  var rootFlexDir = stackUp ? "column" : "column-reverse";

  var CHAT_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6a2 2 0 012-2h14a2 2 0 012 2v10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Scope root CSS to this instance so dual mount (FAB + embed) cannot
  // overwrite each other's position:fixed top/left/bottom/right rules.
  var rootScope = ".avonix-cep-root--" + instanceUid;
  var style = document.createElement("style");
  style.setAttribute("data-avonix-cep", instanceUid);
  style.textContent =
    rootScope +
    "{--avx-primary:" +
    primary +
    ";--avx-on-primary:" +
    onPrimary +
    ";--avx-head:" +
    headBg +
    ";--avx-head-soft:rgba(255,255,255,.09);--avx-head-line:rgba(255,255,255,.16);--avx-bot:" +
    botBubble +
    ";--avx-bot-border:" +
    botBorder +
    ";--avx-tint:" +
    primaryTint +
    ";--avx-ring:" +
    primaryRing +
    ";--avx-online:" +
    onlineDot +
    ";--avx-surface:" +
    surfaceBg +
    ";--avx-canvas:" +
    canvasBg +
    ";--avx-border:#e2e8f0;--avx-border-soft:#f1f5f9;--avx-field:#cbd5e1;--avx-ink:#0f172a;--avx-ink-2:#1e293b;--avx-ink-3:#475569;--avx-muted:#94a3b8;--avx-time:10.5px;--avx-bubble-gap:4px;--avx-r:12px;--avx-rl:16px;--avx-rs:8px;--avx-launcher:" +
    launcherPx +
    "px;--avx-launcher-icon:" +
    launcherIconPct +
    "%;--avx-primary-end:" +
    primaryEnd +
    ";--avx-shadow-lg:0 12px 32px -8px rgba(15,23,42,.18);}" +
    rootScope +
    "{position:fixed;z-index:" +
    z +
    ";" +
    rootPosCss +
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;display:flex;flex-direction:" +
    rootFlexDir +
    ";align-items:" +
    (alignEnd ? "flex-end" : "flex-start") +
    ";gap:12px;max-width:calc(100vw - 16px);box-sizing:border-box;}" +
    ".avonix-cep-root.avonix-fab-stacked{gap:0!important;}" +
    /* Keep CTA label visible beside launcher while stacked (does not affect vertical gap). */
    ".avonix-chat-wizard{display:flex;flex-direction:column;width:100%;height:100%;min-height:420px;box-sizing:border-box;}" +
    ".avonix-cep-root--wizard{position:relative!important;inset:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;z-index:1;width:100%!important;max-width:100%!important;height:100%!important;min-height:100%;flex:1 1 auto;align-items:stretch!important;flex-direction:column!important;gap:0!important;max-width:none!important;box-sizing:border-box;}" +
    ".avonix-cep-root :where([class*=avonix-cep-]){box-sizing:border-box;}" +
    ".avonix-cep-root :where(button[class*=avonix-cep-],input[class*=avonix-cep-],a[class*=avonix-cep-]){margin:0;font-family:inherit;letter-spacing:normal;text-transform:none;-webkit-appearance:none;appearance:none;}" +
    /* FAB — edge-dock tile (flat on screen edge); no hover tip (keeps even gaps with other FABs) */
    ".avonix-cep-launcher{--avx-od:9px;cursor:pointer;border:0;width:var(--avx-launcher);height:var(--avx-launcher);padding:0;border-radius:var(--avx-launcher-radius,12px 0 0 12px);background:linear-gradient(145deg,var(--avx-primary-end) 0%,var(--avx-primary) 100%);color:var(--avx-on-primary);box-shadow:2px 2px 10px rgba(15,23,42,.16);position:relative;display:flex;align-items:center;justify-content:center;overflow:visible;transition:filter .15s ease,box-shadow .15s ease;z-index:1;}" +
    ".avonix-cep-launcher:hover{filter:brightness(1.05);}" +
    ".avonix-cep-root.is-align-end .avonix-cep-launcher{box-shadow:-2px 2px 10px rgba(15,23,42,.16);}" +
    /* Avatar must be out of flow so the online dot cannot be pushed to bottom-left. */
    ".avonix-cep-launcher__img{position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;object-fit:cover;display:block;z-index:1;}" +
    ".avonix-cep-launcher svg{width:var(--avx-launcher-icon,40%);height:var(--avx-launcher-icon,40%);position:relative;z-index:1;}" +
    /* Physical top-right only — never bottom/left (WP themes often reset spans). */
    ".avonix-cep-online{position:absolute!important;z-index:5!important;width:var(--avx-od)!important;height:var(--avx-od)!important;border-radius:999px!important;background:var(--avx-online)!important;top:2px!important;right:2px!important;bottom:auto!important;left:auto!important;inset:2px 2px auto auto!important;margin:0!important;transform:none!important;box-shadow:0 0 0 2px rgba(255,255,255,.22),0 0 16px color-mix(in srgb,var(--avx-online),transparent 15%)!important;animation:avonix-cep-blink 1.05s ease-in-out infinite;pointer-events:none!important;display:block!important;}" +
    "@keyframes avonix-cep-blink{0%,100%{opacity:.75;box-shadow:0 0 0 2px rgba(255,255,255,.22),0 0 10px color-mix(in srgb,var(--avx-online),transparent 40%)}50%{opacity:1;box-shadow:0 0 0 2px rgba(255,255,255,.4),0 0 18px rgba(0,255,106,.95)}}" +
    "@media (prefers-reduced-motion:reduce){.avonix-cep-online{animation:none}}" +
    /* Panel */
    ".avonix-cep-panel{display:none;flex-direction:column;width:" +
    deskW +
    ";height:" +
    deskH +
    ";max-width:min(100%,calc(100vw - 24px));max-height:min(510px,calc(100dvh - 120px),calc(100svh - 120px));background:var(--avx-surface);color:var(--avx-ink);border-radius:" +
    radius +
    "px;overflow:hidden;box-shadow:0 16px 48px rgba(15,23,42,.18);}" +
    ".avonix-cep-panel.is-open{display:flex;animation:avonix-cep-pop .22s ease;}" +
    /* Bubble mode: keep FAB visible while open. Wizard: never show FAB. */
    ".avonix-cep-root.is-open:not(.avonix-cep-root--wizard) .avonix-cep-launcher{display:flex!important;}" +
    "@keyframes avonix-cep-pop{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}" +
    ".avonix-cep-root--wizard .avonix-cep-panel,.avonix-cep-root--wizard .avonix-cep-panel.is-open{display:flex!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;flex:1 1 auto;min-height:0;border-radius:12px;box-shadow:none;animation:none;}" +
    ".avonix-cep-root--wizard .avonix-cep-fab-row,.avonix-cep-root--wizard .avonix-cep-launcher,.avonix-cep-root--wizard.is-open .avonix-cep-launcher{display:none!important;visibility:hidden!important;pointer-events:none!important;width:0!important;height:0!important;overflow:hidden!important;}" +
    ".avonix-cep-root--wizard .avonix-cep-online{display:none!important;}" +
    /* Home */
    ".avonix-cep-home{display:flex;flex-direction:column;flex:1;min-height:0;}" +
    ".avonix-cep-home.is-hidden,.avonix-cep-ai.is-hidden,.avonix-cep-gate.is-hidden,.avonix-cep-agree.is-hidden{display:none!important;}" +
    /* Terms agreement gate — Mount Sinai–style centered welcome */
    ".avonix-cep-agree{display:flex;flex-direction:column;flex:1;min-height:0;background:#fff;position:relative;}" +
    ".avonix-cep-agree__close{position:absolute;top:12px;right:12px;z-index:2;width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:#94a3b8;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;font-size:18px;line-height:1;transition:color .15s,background .15s;}" +
    ".avonix-cep-agree__close:hover{color:#475569;background:#f1f5f9;}" +
    ".avonix-cep-agree__body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:36px 24px 20px;text-align:center;box-sizing:border-box;}" +
    ".avonix-cep-agree__mark{width:56px;height:56px;margin:0 0 16px;border-radius:14px;background:linear-gradient(145deg,var(--avx-primary-end) 0%,var(--avx-primary) 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.02em;flex-shrink:0;overflow:hidden;box-shadow:0 4px 14px color-mix(in srgb,var(--avx-primary) 28%,transparent);}" +
    ".avonix-cep-agree__logo{display:block;margin:0 0 16px;height:var(--avx-agree-logo,56px);width:auto;max-width:100%;object-fit:contain;object-position:center;border-radius:0;background:transparent;box-shadow:none;}" +
    ".avonix-cep-agree__rich{width:100%;max-width:300px;text-align:center;color:var(--avx-ink);font-size:14px;line-height:1.5;}" +
    ".avonix-cep-agree__rich p{margin:0 0 12px;}" +
    ".avonix-cep-agree__rich p:last-child{margin-bottom:0;}" +
    ".avonix-cep-agree__rich a{color:var(--avx-primary);font-weight:600;text-decoration:underline;text-underline-offset:2px;}" +
    ".avonix-cep-agree__brand{margin:0 0 18px;font-size:23px;font-weight:700;letter-spacing:-0.025em;color:#0f172a;font-family:Georgia,'Times New Roman',Times,serif;line-height:1.2;}" +
    ".avonix-cep-agree__intro{margin:0 0 12px;font-size:14.5px;line-height:1.45;color:#0f172a;font-weight:600;max-width:280px;}" +
    ".avonix-cep-agree__copy{margin:0;font-size:13.5px;line-height:1.55;color:#64748b;max-width:280px;font-weight:400;}" +
    ".avonix-cep-agree__copy a{color:var(--avx-primary);font-weight:600;text-decoration:underline;text-underline-offset:2px;}" +
    ".avonix-cep-agree__fields{display:flex;flex-direction:row;gap:8px;width:100%;max-width:550px;margin:18px auto 0;box-sizing:border-box;text-align:left;}" +
    ".avonix-cep-agree__field{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;}" +
    ".avonix-cep-agree__field-label{font-size:12px;font-weight:500;color:#64748b;}" +
    ".avonix-cep-agree__input{width:100%;box-sizing:border-box;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 10px;font-size:13.5px;color:#0f172a;outline:none;}" +
    ".avonix-cep-agree__input:focus{border-color:var(--avx-primary);box-shadow:0 0 0 3px var(--avx-ring);background:#fff;}" +
    ".avonix-cep-agree__err{display:none;width:100%;max-width:550px;margin:8px auto 0;font-size:12px;color:#b91c1c;text-align:left;box-sizing:border-box;}" +
    ".avonix-cep-agree__err.is-on{display:block;}" +
    ".avonix-cep-agree__actions{display:flex;gap:10px;padding:10px 20px 22px;flex-shrink:0;width:100%;max-width:550px;margin:0 auto;box-sizing:border-box;}" +
    ".avonix-cep-agree__btn{flex:1;min-height:44px;border-radius:999px;border:1.5px solid var(--avx-primary);background:#fff;color:var(--avx-primary);font-size:13.5px;font-weight:600;cursor:pointer;padding:10px 14px;transition:background .15s,color .15s,transform .15s,filter .15s;}" +
    ".avonix-cep-agree__btn:hover{background:color-mix(in srgb,var(--avx-primary) 8%,#fff);transform:translateY(-1px);}" +
    ".avonix-cep-agree__btn:disabled{opacity:.65;cursor:wait;transform:none;}" +
    ".avonix-cep-agree__btn.is-primary{background:var(--avx-primary);color:var(--avx-on-primary);border-color:var(--avx-primary);}" +
    ".avonix-cep-agree__btn.is-primary:hover{filter:brightness(.95);background:var(--avx-primary);}" +
    "@media (max-width:520px){.avonix-cep-agree__fields{flex-direction:column;gap:10px;}}" +
    ".avonix-cep-home__head{display:flex;align-items:center;gap:13px;padding:18px 18px 16px;background:var(--avx-head);flex-shrink:0;}" +
    ".avonix-cep-home__avatar{width:44px;height:44px;border-radius:50%;flex-shrink:0;background:var(--avx-head-soft);border:1px solid var(--avx-head-line);display:flex;align-items:center;justify-content:center;overflow:hidden;color:#fff;}" +
    ".avonix-cep-home__avatar img{width:100%;height:100%;object-fit:cover;}" +
    ".avonix-cep-home__avatar svg{width:22px;height:22px;}" +
    ".avonix-cep-home__info{flex:1;min-width:0;}" +
    ".avonix-cep-home__title{font-size:14.5px;font-weight:600;color:#fff;margin:0;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".avonix-cep-home__badge{font-size:11px;font-weight:400;color:#fff;opacity:.8;margin:5px 0 0;line-height:1.2;display:flex;align-items:center;gap:6px;}" +
    ".avonix-cep-dot{width:9px;height:9px;border-radius:999px;flex-shrink:0;background:var(--avx-online);box-shadow:0 0 0 2px rgba(255,255,255,.22);animation:avonix-cep-blink 1.05s ease-in-out infinite;}" +
    ".avonix-cep-close{background:var(--avx-head-soft);border:1px solid var(--avx-head-line);color:#fff;width:30px;height:30px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;line-height:1;transition:background .2s,transform .25s cubic-bezier(.34,1.56,.64,1);padding:0;}" +
    ".avonix-cep-close:hover{background:rgba(255,255,255,.22);transform:rotate(90deg) scale(1.05);}" +
    ".avonix-cep-home__body{flex:1 1 auto;padding:26px 24px;background:#f8fafc;font-size:14px;color:#475569;line-height:1.65;border-bottom:1px solid #f1f5f9;min-height:96px;overflow-y:auto;scrollbar-width:none;}" +
    ".avonix-cep-home__body::-webkit-scrollbar{display:none;}" +
    ".avonix-cep-home__btns{padding:18px 22px 22px;display:flex;flex-direction:column;gap:10px;background:var(--avx-surface);flex-shrink:0;}" +
    ".avonix-cep-home__start{display:block;width:100%;text-align:center;font-weight:500;font-size:13.5px;cursor:pointer;border:0;border-radius:10px;padding:13px 16px;background:var(--avx-primary);color:var(--avx-on-primary);line-height:1.3;box-shadow:0 1px 2px rgba(15,23,42,.05);transition:transform .18s,filter .18s;}" +
    ".avonix-cep-home__start:hover{transform:translateY(-2px);filter:brightness(.94);}" +
    /* Lead gate */
    ".avonix-cep-gate{display:flex;flex-direction:column;flex:1;min-height:0;background:var(--avx-canvas);}" +
    ".avonix-cep-gate__body{flex:1;overflow-y:auto;padding:14px 16px 16px;scrollbar-width:none;}" +
    ".avonix-cep-gate__card{background:var(--avx-surface);border:1px solid var(--avx-border);border-radius:var(--avx-rl);padding:20px 18px 18px;box-shadow:0 1px 2px rgba(15,23,42,.05);}" +
    ".avonix-cep-gate__title{margin:0 0 6px;font-size:15px;font-weight:600;color:var(--avx-ink);text-align:center;}" +
    ".avonix-cep-gate__sub{margin:0 0 16px;font-size:13px;color:var(--avx-ink-3);text-align:center;line-height:1.5;}" +
    ".avonix-cep-gate__fields{display:flex;flex-direction:column;gap:12px;}" +
    ".avonix-cep-gate__input{width:100%;box-sizing:border-box;background:var(--avx-canvas);border:1px solid var(--avx-field);border-radius:10px;padding:12px 14px;min-height:46px;font-size:14px;color:var(--avx-ink-2);outline:none;}" +
    ".avonix-cep-gate__input:focus{border-color:var(--avx-primary);box-shadow:0 0 0 3px var(--avx-ring);background:var(--avx-surface);}" +
    ".avonix-cep-gate__send{width:100%;margin-top:14px;border:0;border-radius:10px;padding:13px 20px;background:var(--avx-primary);color:var(--avx-on-primary);font-size:14px;font-weight:600;cursor:pointer;}" +
    ".avonix-cep-gate__hint{margin:10px 0 0;font-size:11.5px;color:var(--avx-muted);text-align:center;line-height:1.45;}" +
    ".avonix-cep-gate__err{display:none;font-size:12px;color:#b91c1c;margin-top:8px;text-align:center;}" +
    ".avonix-cep-gate__err.is-on{display:block;}" +
    /* AI view */
    ".avonix-cep-ai{display:flex;flex-direction:column;flex:1 1 0%;min-height:0;overflow:hidden;}" +
    ".avonix-cep-ai__head{display:flex;align-items:center;gap:10px;padding:13px 14px;background:var(--avx-head);color:#fff;flex:0 0 auto;}" +
    ".avonix-cep-icon{flex:0 0 auto;width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:var(--avx-head-soft);border:1px solid var(--avx-head-line);color:inherit;border-radius:var(--avx-rs);cursor:pointer;padding:0;transition:background .15s;}" +
    ".avonix-cep-icon:hover{background:rgba(255,255,255,.22);}" +
    ".avonix-cep-icon svg{width:17px;height:17px;}" +
    ".avonix-cep-ai__avatar{width:36px;height:36px;border-radius:50%;overflow:hidden;background:var(--avx-head-soft);border:1px solid var(--avx-head-line);display:flex;align-items:center;justify-content:center;flex:0 0 auto;color:#fff;}" +
    ".avonix-cep-ai__avatar img{width:100%;height:100%;object-fit:cover;}" +
    ".avonix-cep-ai__avatar svg{width:19px;height:19px;}" +
    ".avonix-cep-ai__info{min-width:0;flex:1;}" +
    ".avonix-cep-ai__name{margin:0;font-weight:600;font-size:14px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".avonix-cep-ai__badge{margin:3px 0 0;font-size:11px;font-weight:400;opacity:.8;display:flex;align-items:center;gap:6px;}" +
    ".avonix-cep-ai__tools{margin-left:auto;display:flex;align-items:center;gap:6px;}" +
    ".avonix-cep-tts[hidden]{display:none!important;}" +
    ".avonix-cep-tts.is-on{background:rgba(255,255,255,.34);}" +
    ".avonix-cep-tts.is-speaking{animation:avonix-cep-tts 1.2s ease-in-out infinite;}" +
    "@keyframes avonix-cep-tts{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.45)}50%{box-shadow:0 0 0 5px transparent}}" +
    ".avonix-cep-tts .on{display:none;}" +
    ".avonix-cep-tts.is-on .on{display:block;}" +
    ".avonix-cep-tts.is-on .off{display:none;}" +
    /* Messages */
    ".avonix-cep-log{flex:1 1 0%;min-height:0;overflow-x:hidden;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;gap:12px;background:var(--avx-canvas);scrollbar-width:none;}" +
    ".avonix-cep-log::-webkit-scrollbar{display:none;}" +
    ".avonix-cep-row{display:flex;gap:8px;max-width:100%;align-items:center;}" +
    ".avonix-cep-row--you{justify-content:flex-end;}" +
    ".avonix-cep-bubav{width:28px;height:28px;border-radius:50%;flex:0 0 auto;background:var(--avx-head);color:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:calc(var(--avx-time) + var(--avx-bubble-gap));}" +
    ".avonix-cep-bubav img{width:100%;height:100%;object-fit:cover;}" +
    ".avonix-cep-bubav svg{width:15px;height:15px;}" +
    ".avonix-cep-col{display:flex;flex-direction:column;gap:var(--avx-bubble-gap);max-width:80%;min-width:0;}" +
    ".avonix-cep-row--you .avonix-cep-col{align-items:flex-end;}" +
    ".avonix-cep-time{font-size:var(--avx-time);color:var(--avx-muted);padding:0 6px;line-height:1;}" +
    ".avonix-cep-bubble{max-width:100%;padding:11px 15px;border-radius:var(--avx-r);font-size:14px;line-height:1.6;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere;}" +
    ".avonix-cep-bubble--bot{background:#ffffff;color:#0f172a;border:1px solid #e2e8f0;border-bottom-left-radius:4px;}" +
    ".avonix-cep-bubble--you{background:var(--avx-head);color:#fff;border-bottom-right-radius:4px;}" +
    ".avonix-cep-bubble--system{background:transparent;border:0;color:var(--avx-muted);font-size:12px;text-align:center;padding:6px;}" +
    ".avonix-cep-bubble--bot a{color:var(--avx-primary);}" +
    ".avonix-cep-bubble--error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;border-bottom-left-radius:4px;}" +
    /* Industry preset action cards — vibrant professional grid */
    ".avonix-cep-try{align-self:stretch;margin:6px 0 4px;}" +
    ".avonix-cep-try__label{display:none;}" +
    ".avonix-cep-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;}" +
    "@keyframes avonix-cep-card-in{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:none}}" +
    ".avonix-cep-btn{--avx-card-accent:var(--avx-primary);--avx-card-soft:color-mix(in srgb,var(--avx-primary) 14%,#fff);display:flex;width:100%;align-items:center;gap:10px;text-align:left;font-size:12.5px;font-weight:650;letter-spacing:-0.01em;line-height:1.25;color:#0f172a!important;background:linear-gradient(180deg,#ffffff 0%,#fafbff 100%)!important;border:1px solid rgba(15,23,42,.07);border-radius:14px;padding:11px 10px;cursor:pointer;box-shadow:0 1px 2px rgba(15,23,42,.04),0 6px 16px rgba(15,23,42,.06);transition:border-color .2s,background .2s,transform .22s cubic-bezier(.34,1.4,.64,1),box-shadow .22s;min-height:54px;animation:avonix-cep-card-in .48s cubic-bezier(.22,1,.36,1) both;position:relative;overflow:hidden;}" +
    ".avonix-cep-btn::before{content:'';position:absolute;inset:0;background:radial-gradient(120px 60px at 0% 0%,color-mix(in srgb,var(--avx-card-accent) 12%,transparent),transparent 70%);opacity:.9;pointer-events:none;}" +
    ".avonix-cep-btn:nth-child(1){animation-delay:.03s}.avonix-cep-btn:nth-child(2){animation-delay:.07s}.avonix-cep-btn:nth-child(3){animation-delay:.11s}.avonix-cep-btn:nth-child(4){animation-delay:.15s}.avonix-cep-btn:nth-child(5){animation-delay:.19s}.avonix-cep-btn:nth-child(6){animation-delay:.23s}" +
    ".avonix-cep-btn:hover,.avonix-cep-btn:focus,.avonix-cep-btn:focus-visible,.avonix-cep-btn:active{border-color:color-mix(in srgb,var(--avx-card-accent) 42%,#e8edf5)!important;background:#fff!important;color:#0f172a!important;transform:translateY(-3px) scale(1.015);box-shadow:0 4px 10px rgba(15,23,42,.06),0 14px 28px color-mix(in srgb,var(--avx-card-accent) 28%,transparent);}" +
    ".avonix-cep-btn__ico{position:relative;z-index:1;flex:0 0 auto;width:34px;height:34px;border-radius:11px;background:linear-gradient(145deg,color-mix(in srgb,var(--avx-card-accent) 22%,#fff),color-mix(in srgb,var(--avx-card-accent) 8%,#fff));color:var(--avx-card-accent)!important;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--avx-card-accent) 22%,transparent),0 4px 10px color-mix(in srgb,var(--avx-card-accent) 18%,transparent);transition:transform .22s cubic-bezier(.34,1.4,.64,1),box-shadow .22s;}" +
    ".avonix-cep-btn:hover .avonix-cep-btn__ico{transform:scale(1.08) rotate(-4deg);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--avx-card-accent) 28%,transparent),0 8px 16px color-mix(in srgb,var(--avx-card-accent) 28%,transparent);}" +
    ".avonix-cep-btn__ico svg{width:16px;height:16px;stroke-width:2;}" +
    ".avonix-cep-btn__txt{position:relative;z-index:1;flex:1;min-width:0;color:inherit!important;white-space:normal;overflow-wrap:anywhere;word-break:break-word;}" +
    "@media (prefers-reduced-motion:reduce){.avonix-cep-btn{animation:none}.avonix-cep-btn:hover,.avonix-cep-btn:focus{transform:none}.avonix-cep-btn:hover .avonix-cep-btn__ico{transform:none}}" +
    /* Launcher + CTA pill row */
    ".avonix-cep-fab-row{display:flex;align-items:center;gap:10px;pointer-events:auto;}" +
    ".avonix-cep-cta-pill{display:flex;align-items:center;gap:8px;max-width:min(220px,52vw);padding:8px 12px 8px 8px;border-radius:999px;background:var(--avx-primary);color:var(--avx-on-primary);box-shadow:0 8px 22px rgba(15,23,42,.18);cursor:pointer;border:0;font:inherit;text-align:left;animation:avonix-cep-pop .28s ease;}" +
    ".avonix-cep-cta-pill[hidden]{display:none!important;}" +
    ".avonix-cep-cta-pill__av{width:28px;height:28px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;flex:0 0 auto;}" +
    ".avonix-cep-cta-pill__av img{width:100%;height:100%;object-fit:cover;}" +
    ".avonix-cep-cta-pill__av svg{width:14px;height:14px;}" +
    ".avonix-cep-cta-pill__txt{font-size:12.5px;font-weight:600;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".avonix-cep-root.is-open .avonix-cep-cta-pill{display:none!important;}" +
    ".avonix-cep-reply-eta{margin:0;padding:2px 4px 4px;font-size:11px;color:var(--avx-muted);text-align:center;display:flex;align-items:center;justify-content:center;gap:6px;flex:0 0 auto;}" +
    ".avonix-cep-reply-eta__dot{width:7px;height:7px;border-radius:999px;background:var(--avx-online);flex:0 0 auto;}" +
    ".avonix-cep-lead{margin-top:8px;border-radius:var(--avx-rl);padding:10px;background:var(--avx-surface);border:1px solid var(--avx-border);max-height:280px;overflow:auto;}" +
    /* Typing */
    ".avonix-cep-typing{align-self:flex-start;display:inline-flex;gap:4px;padding:12px 14px;background:#ffffff;border:1px solid #e2e8f0;border-radius:var(--avx-r);border-bottom-left-radius:4px;}" +
    ".avonix-cep-typing span{width:7px;height:7px;border-radius:50%;background:var(--avx-muted);animation:avonix-cep-bounce 1.2s infinite ease-in-out;}" +
    ".avonix-cep-typing span:nth-child(2){animation-delay:.15s;}" +
    ".avonix-cep-typing span:nth-child(3){animation-delay:.3s;}" +
    "@keyframes avonix-cep-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}" +
    /* Composer */
    ".avonix-cep-form{position:relative;z-index:3;margin:0;padding:8px 12px max(10px,calc(8px + env(safe-area-inset-bottom,0px)));border-top:1px solid var(--avx-border);background:var(--avx-surface);flex:0 0 auto;}" +
    ".avonix-cep-disclaimer{margin:6px 4px 0;font-size:10.5px;line-height:1.35;color:var(--avx-muted);text-align:center;}" +
    ".avonix-cep-inputbar{display:flex;align-items:center;gap:4px;background:var(--avx-surface);border:1px solid var(--avx-border);border-radius:999px;padding:5px 6px 5px 12px;transition:border-color .15s,box-shadow .15s;}" +
    ".avonix-cep-inputbar:focus-within{border-color:var(--avx-primary);box-shadow:inset 0 0 0 2px var(--avx-ring);}" +
    ".avonix-cep-input{flex:1 1 auto;min-width:0;width:auto!important;background:transparent!important;border:none!important;box-shadow:none!important;outline:none!important;margin:0!important;padding:8px 4px!important;font-size:14px!important;line-height:1.45!important;color:var(--avx-ink-2)!important;}" +
    ".avonix-cep-input::placeholder{color:var(--avx-muted)!important;}" +
    ".avonix-cep-tool{flex:0 0 auto;cursor:pointer;width:34px;height:34px;border-radius:var(--avx-rs);display:flex;align-items:center;justify-content:center;color:var(--avx-ink-3);padding:0;border:0;background:transparent;}" +
    ".avonix-cep-tool:hover{background:var(--avx-border-soft);color:var(--avx-ink);}" +
    ".avonix-cep-tool svg{width:19px;height:19px;}" +
    ".avonix-cep-send{flex:0 0 auto;cursor:pointer;background:var(--avx-border);color:var(--avx-ink-3);border:0;border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;padding:0;transition:background .15s,color .15s;}" +
    ".avonix-cep-send.is-active,.avonix-cep-send.is-active:hover{background:var(--avx-head);color:#fff;}" +
    ".avonix-cep-send svg{width:18px;height:18px;}" +
    ".avonix-cep-send:disabled{opacity:.7;cursor:default;}" +
    ".avonix-cep-emoji-wrap{position:relative;flex:0 0 auto;display:flex;}" +
    ".avonix-cep-emoji-pop{position:absolute;bottom:calc(100% + 12px);right:0;width:238px;background:var(--avx-surface);border:1px solid var(--avx-border);border-radius:var(--avx-rl);box-shadow:var(--avx-shadow-lg);padding:6px;display:none;z-index:6;}" +
    ".avonix-cep-emoji-pop.is-open{display:grid;grid-template-columns:repeat(6,1fr);gap:2px;}" +
    ".avonix-cep-emoji-pop button{border:0;background:transparent;cursor:pointer;font-size:20px;line-height:1;padding:6px;border-radius:var(--avx-rs);}" +
    ".avonix-cep-emoji-pop button:hover{background:var(--avx-border-soft);}" +
    "@media (max-width:1023px){.avonix-cep-root:not(.avonix-cep-root--wizard) .avonix-cep-panel{width:" +
    mobW +
    ";height:" +
    mobH +
    ";border-radius:16px;}.avonix-cep-launcher{--avx-od:8px;}}" +
    /* Phones: panel full-bleed only while open — closed FAB must keep free % stack with a11y/lang. */
    "@media (max-width:639px){" +
    rootScope +
    ":not(.avonix-cep-root--wizard){max-width:calc(100vw - 12px)!important;}" +
    rootScope +
    ":not(.avonix-cep-root--wizard).is-narrow.is-open{left:8px!important;right:8px!important;width:auto!important;}" +
    rootScope +
    ":not(.avonix-cep-root--wizard) .avonix-cep-panel{width:100%!important;max-width:100%!important;height:min(560px,calc(100dvh - 100px))!important;max-height:calc(100dvh - 100px)!important;border-radius:16px!important;}" +
    rootScope +
    " .avonix-cep-cta-pill{max-width:min(200px,58vw);}" +
    rootScope +
    " .avonix-cep-btns{gap:8px;}" +
    rootScope +
    " .avonix-cep-btn{min-height:48px;padding:10px 8px;font-size:12px;}" +
    rootScope +
    " .avonix-cep-log{padding:14px 12px;}" +
    "}" +
    "";
  document.head.appendChild(style);

  function playPing() {
    if (!soundsOn) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.04;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(function () {
        o.stop();
        ctx.close();
      }, 120);
    } catch (e) {}
  }

  function linkify(text) {
    var esc = String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return esc.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  }

  function formatTime() {
    try {
      return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  }

  function avatarNode(cls, rounded) {
    var wrap = document.createElement("div");
    wrap.className = cls;
    if (avatarUrl) {
      var img = document.createElement("img");
      img.src = avatarUrl;
      img.alt = "";
      wrap.appendChild(img);
    } else {
      wrap.innerHTML = CHAT_SVG;
    }
    return wrap;
  }

  function suggestionIcon(key, idx) {
    var k = String(key || "").toLowerCase();
    var icons = {
      calendar:
        '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      phone:
        '<svg viewBox="0 0 24 24" fill="none"><path d="M8.2 4.8l2 1.2c.5.3.7.9.5 1.4l-.8 1.9a12.5 12.5 0 005.8 5.8l1.9-.8c.5-.2 1.1 0 1.4.5l1.2 2c.3.6.1 1.3-.5 1.6A15.2 15.2 0 016.6 6.3c.3-.6 1-.8 1.6-.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
      image:
        '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="14" rx="2.5" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.6" fill="currentColor"/><path d="M3.8 16.5l4.4-4.2 3.2 3 3.4-3.8 5.4 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      layers:
        '<svg viewBox="0 0 24 24" fill="none"><path d="M12 4.5l8 4.2-8 4.2-8-4.2 8-4.2zM4 12.2l8 4.2 8-4.2M4 16l8 4.2 8-4.2" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
      "map-pin":
        '<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s6.5-5.2 6.5-10.2A6.5 6.5 0 0012 4.3a6.5 6.5 0 00-6.5 6.5C5.5 15.8 12 21 12 21z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10.8" r="2.1" stroke="currentColor" stroke-width="1.8"/></svg>',
      shield:
        '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5l7 2.8v5.2c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6.3l7-2.8z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
      heart:
        '<svg viewBox="0 0 24 24" fill="none"><path d="M12 19.2S4.8 14.2 4.8 9.6A3.8 3.8 0 0112 7.4a3.8 3.8 0 017.2 2.2c0 4.6-7.2 9.6-7.2 9.6z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
      alert:
        '<svg viewBox="0 0 24 24" fill="none"><path d="M12 4.2L21 19.5H3L12 4.2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10v4.2M12 16.8h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      clock:
        '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.2" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v4.4l2.8 1.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      "file-text":
        '<svg viewBox="0 0 24 24" fill="none"><path d="M7 3.8h7.2L19 8.6V20.2a1 1 0 01-1 1H7a1 1 0 01-1-1V4.8a1 1 0 011-1z" stroke="currentColor" stroke-width="1.8"/><path d="M14 3.8V9h5.2M8.8 12.5h6.4M8.8 15.5h6.4M8.8 18.2h4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      calculator:
        '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3.5" width="14" height="17" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M8 8h8M8 12h2.2M11.9 12h2.2M15.8 12H18M8 15.5h2.2M11.9 15.5h2.2M15.8 15.5H18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      headphones:
        '<svg viewBox="0 0 24 24" fill="none"><path d="M4.8 13.5v2.2A2.2 2.2 0 007 17.9h1.2v-4.4H7A2.2 2.2 0 004.8 13.5zm14.4 0A2.2 2.2 0 0017 11.3h-1.2v4.4H17a2.2 2.2 0 002.2-2.2z" stroke="currentColor" stroke-width="1.8"/><path d="M5.2 13.2a6.8 6.8 0 0113.6 0" stroke="currentColor" stroke-width="1.8"/></svg>',
      "pen-tool":
        '<svg viewBox="0 0 24 24" fill="none"><path d="M14.2 5.2l4.6 4.6-9.3 9.3H4.9v-4.6l9.3-9.3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12.8 6.6l4.6 4.6" stroke="currentColor" stroke-width="1.8"/></svg>',
      sparkles:
        '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5l1.4 4.2L17.5 9 13.4 10.3 12 14.5l-1.4-4.2L6.5 9l4.1-1.3L12 3.5zM18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      briefcase:
        '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="7.5" width="17" height="12" rx="2.2" stroke="currentColor" stroke-width="1.8"/><path d="M9 7.5V6.2A1.7 1.7 0 0110.7 4.5h2.6A1.7 1.7 0 0115 6.2v1.3M3.5 12.5h17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      stethoscope:
        '<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 4.5v6.2a5.5 5.5 0 0011 0V4.5M6.5 4.5H5M17.5 4.5H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="18.5" cy="17.5" r="2.3" stroke="currentColor" stroke-width="1.8"/><path d="M12 15.8v1.4a3.8 3.8 0 003.8 3.8h.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      "git-branch":
        '<svg viewBox="0 0 24 24" fill="none"><circle cx="7" cy="6" r="2.2" stroke="currentColor" stroke-width="1.8"/><circle cx="7" cy="18" r="2.2" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="12" r="2.2" stroke="currentColor" stroke-width="1.8"/><path d="M7 8.2v7.6M7 12h7.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      car:
        '<svg viewBox="0 0 24 24" fill="none"><path d="M4 14.5l1.6-5.2A2.2 2.2 0 017.7 7.8h8.6a2.2 2.2 0 012.1 1.5l1.6 5.2M4 14.5h16v3.2a1.5 1.5 0 01-1.5 1.5H5.5A1.5 1.5 0 014 17.7v-3.2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7.5" cy="16.2" r="1" fill="currentColor"/><circle cx="16.5" cy="16.2" r="1" fill="currentColor"/></svg>',
    };
    if (icons[k]) return icons[k];
    var fallback = [
      icons.sparkles,
      icons.calendar,
      icons.image,
      icons.phone,
      icons.layers,
      icons.briefcase,
    ];
    return fallback[idx % fallback.length];
  }

  /* ---- Root / FAB ---- */
  var root = document.createElement("div");
  root.className =
    "avonix-cep-root avonix-cep-root--" +
    instanceUid +
    (surface === "wizard" ? " avonix-cep-root--wizard" : "");
  root.setAttribute("data-avonix", "cep-chat");
  root.setAttribute("data-surface", surface);
  root.setAttribute("data-avonix-uid", instanceUid);

  var button = document.createElement("button");
  button.type = "button";
  button.className = "avonix-cep-launcher";
  button.setAttribute("aria-label", theme.launcherLabel || config.label || "Live Chat");
  button.setAttribute("aria-expanded", "false");
  var initialRadius = launcherTileRadius(!alignEnd);
  // Inline fallback so the FAB still shows if injected CSS is filtered/broken.
  button.style.cssText =
    "width:" +
    launcherPx +
    "px;height:" +
    launcherPx +
    "px;min-width:" +
    launcherPx +
    "px;min-height:" +
    launcherPx +
    "px;border:0;border-radius:" +
    initialRadius +
    ";padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0;background:linear-gradient(145deg," +
    primaryEnd +
    " 0%," +
    primary +
    " 100%);color:" +
    onPrimary +
    ";box-shadow:2px 2px 10px rgba(15,23,42,.16);overflow:visible;";
  root.style.setProperty("--avx-launcher-radius", initialRadius);
  if (avatarUrl) {
    button.innerHTML =
      '<img class="avonix-cep-launcher__img" src="' +
      String(avatarUrl).replace(/"/g, "") +
      '" alt="">';
  } else {
    button.innerHTML = CHAT_SVG;
  }
  if (theme.onlineIndicator !== false) {
    var od = document.createElement("span");
    od.className = "avonix-cep-online";
    od.setAttribute("aria-hidden", "true");
    // Beat theme !important resets that shove the dot to bottom-left in flow.
    od.style.setProperty("position", "absolute", "important");
    od.style.setProperty("top", "2px", "important");
    od.style.setProperty("right", "2px", "important");
    od.style.setProperty("bottom", "auto", "important");
    od.style.setProperty("left", "auto", "important");
    od.style.setProperty("inset", "2px 2px auto auto", "important");
    od.style.setProperty("width", "9px", "important");
    od.style.setProperty("height", "9px", "important");
    od.style.setProperty("border-radius", "999px", "important");
    od.style.setProperty("z-index", "5", "important");
    od.style.setProperty("display", "block", "important");
    od.style.setProperty("margin", "0", "important");
    od.style.setProperty("transform", "none", "important");
    od.style.setProperty("background", onlineDot, "important");
    button.appendChild(od);
  }

  var panel = document.createElement("div");
  panel.className = "avonix-cep-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", agentName);

  /* ---- Home ---- */
  var home = document.createElement("div");
  home.className = "avonix-cep-home";
  var homeHead = document.createElement("div");
  homeHead.className = "avonix-cep-home__head";
  homeHead.appendChild(avatarNode("avonix-cep-home__avatar"));
  var homeInfo = document.createElement("div");
  homeInfo.className = "avonix-cep-home__info";
  homeInfo.innerHTML =
    '<p class="avonix-cep-home__title"></p><p class="avonix-cep-home__badge"><span class="avonix-cep-dot" aria-hidden="true"></span><span></span></p>';
  homeInfo.querySelector(".avonix-cep-home__title").textContent = agentName;
  homeInfo.querySelector(".avonix-cep-home__badge span:last-child").textContent = statusText;
  homeHead.appendChild(homeInfo);
  var homeClose = document.createElement("button");
  homeClose.type = "button";
  homeClose.className = "avonix-cep-close";
  homeClose.setAttribute("aria-label", "Close");
  homeClose.innerHTML = "&#x2715;";
  homeHead.appendChild(homeClose);
  var homeBody = document.createElement("div");
  homeBody.className = "avonix-cep-home__body";
  homeBody.textContent = homeContent;
  var homeBtns = document.createElement("div");
  homeBtns.className = "avonix-cep-home__btns";
  var startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "avonix-cep-home__start";
  startBtn.textContent = startConvLabel;
  homeBtns.appendChild(startBtn);
  home.appendChild(homeHead);
  home.appendChild(homeBody);
  home.appendChild(homeBtns);

  /* ---- Lead gate ---- */
  var gate = document.createElement("div");
  gate.className = "avonix-cep-gate is-hidden";
  var gateHead = homeHead.cloneNode(true);
  gateHead.querySelector(".avonix-cep-close").classList.add("avonix-cep-gate-close");
  var gateBody = document.createElement("div");
  gateBody.className = "avonix-cep-gate__body";
  gateBody.innerHTML =
    '<div class="avonix-cep-gate__card">' +
    '<p class="avonix-cep-gate__title"></p>' +
    '<p class="avonix-cep-gate__sub">Share your details below and we will connect you with our team right away.</p>' +
    '<div class="avonix-cep-gate__fields">' +
    '<input type="text" class="avonix-cep-gate__input" id="avonix-cep-name-' +
    instanceUid +
    '" placeholder="Your name" autocomplete="name"/>' +
    '<input type="tel" class="avonix-cep-gate__input" id="avonix-cep-phone-' +
    instanceUid +
    '" placeholder="Phone" autocomplete="tel"/>' +
    '<input type="email" class="avonix-cep-gate__input" id="avonix-cep-email-' +
    instanceUid +
    '" placeholder="Email" autocomplete="email"/>' +
    "</div>" +
    '<div class="avonix-cep-gate__err" id="avonix-cep-gate-err-' +
    instanceUid +
    '"></div>' +
    '<button type="button" class="avonix-cep-gate__send" id="avonix-cep-gate-send-' +
    instanceUid +
    '">Send</button>' +
    '<p class="avonix-cep-gate__hint">We typically reply within a few minutes during business hours.</p>' +
    "</div>";
  gateBody.querySelector(".avonix-cep-gate__title").textContent =
    theme.startTitle || "Leave your contact";
  var gateName = gateBody.querySelector("#avonix-cep-name-" + instanceUid);
  var gatePhone = gateBody.querySelector("#avonix-cep-phone-" + instanceUid);
  var gateEmail = gateBody.querySelector("#avonix-cep-email-" + instanceUid);
  var gateErr = gateBody.querySelector("#avonix-cep-gate-err-" + instanceUid);
  var gateSend = gateBody.querySelector("#avonix-cep-gate-send-" + instanceUid);
  gate.appendChild(gateHead);
  gate.appendChild(gateBody);

  /* ---- AI ---- */
  var ai = document.createElement("div");
  ai.className = "avonix-cep-ai is-hidden";
  var aiHead = document.createElement("div");
  aiHead.className = "avonix-cep-ai__head";
  var backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "avonix-cep-icon";
  backBtn.setAttribute("aria-label", "Back");
  backBtn.innerHTML = "&#8592;";
  aiHead.appendChild(backBtn);
  aiHead.appendChild(avatarNode("avonix-cep-ai__avatar"));
  var aiInfo = document.createElement("div");
  aiInfo.className = "avonix-cep-ai__info";
  aiInfo.innerHTML =
    '<p class="avonix-cep-ai__name"></p><p class="avonix-cep-ai__badge"><span class="avonix-cep-dot" aria-hidden="true"></span><span></span></p>';
  aiInfo.querySelector(".avonix-cep-ai__name").textContent = agentName;
  aiInfo.querySelector(".avonix-cep-ai__badge span:last-child").textContent = statusText;
  aiHead.appendChild(aiInfo);
  var tools = document.createElement("span");
  tools.className = "avonix-cep-ai__tools";
  var ttsBtn = document.createElement("button");
  ttsBtn.type = "button";
  ttsBtn.className = "avonix-cep-icon avonix-cep-tts";
  ttsBtn.hidden = true;
  ttsBtn.setAttribute("aria-pressed", "false");
  ttsBtn.setAttribute("aria-label", "Read replies aloud");
  ttsBtn.innerHTML =
    '<svg class="off" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M22 9l-6 6M16 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
    '<svg class="on" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.7 5.3a9 9 0 0 1 0 13.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "avonix-cep-icon";
  resetBtn.setAttribute("aria-label", "Start a new chat");
  resetBtn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  tools.appendChild(ttsBtn);
  tools.appendChild(resetBtn);
  aiHead.appendChild(tools);

  var log = document.createElement("div");
  log.className = "avonix-cep-log";
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");

  var form = document.createElement("form");
  form.className = "avonix-cep-form";
  var inputBar = document.createElement("div");
  inputBar.className = "avonix-cep-inputbar";
  var fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.hidden = true;
  fileInput.accept = "image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/csv";
  var clipBtn = document.createElement("button");
  clipBtn.type = "button";
  clipBtn.className = "avonix-cep-tool";
  clipBtn.setAttribute("aria-label", "Attach");
  clipBtn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none"><path d="M21.4 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if (!allowAttach) clipBtn.style.display = "none";
  var input = document.createElement("input");
  input.type = "text";
  input.className = "avonix-cep-input";
  input.placeholder = config.placeholder || theme.placeholder || "Write a message...";
  input.setAttribute("aria-label", "Message");
  input.maxLength = 2000;
  input.autocomplete = "off";
  var emojiWrap = document.createElement("span");
  emojiWrap.className = "avonix-cep-emoji-wrap";
  var emojiBtn = document.createElement("button");
  emojiBtn.type = "button";
  emojiBtn.className = "avonix-cep-tool";
  emojiBtn.setAttribute("aria-label", "Emoji");
  emojiBtn.setAttribute("aria-haspopup", "true");
  emojiBtn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 14a4 4 0 007 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 9.5h.01M15 9.5h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var emojiPop = document.createElement("span");
  emojiPop.className = "avonix-cep-emoji-pop";
  emojiPop.setAttribute("role", "menu");
  var EMOJIS = [
    "😀","😃","😄","😁","😊","🙂","😉","😍","😘","😎","🤩","🤔",
    "🙌","👍","👎","👏","🙏","💪","🔥","✨","🎉","❤️","💯","✅",
    "❓","⚠️","😅","😢","😮","🥳","🚀","📎",
  ];
  EMOJIS.forEach(function (em) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = em;
    b.addEventListener("click", function () {
      input.value += em;
      updateSendState();
      input.focus();
      emojiPop.classList.remove("is-open");
    });
    emojiPop.appendChild(b);
  });
  emojiWrap.appendChild(emojiBtn);
  emojiWrap.appendChild(emojiPop);
  var send = document.createElement("button");
  send.type = "submit";
  send.className = "avonix-cep-send";
  send.setAttribute("aria-label", "Send");
  send.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if (allowAttach) inputBar.appendChild(clipBtn);
  inputBar.appendChild(input);
  inputBar.appendChild(emojiWrap);
  inputBar.appendChild(send);
  form.appendChild(fileInput);
  form.appendChild(inputBar);
  if (disclaimer) {
    var disc = document.createElement("p");
    disc.className = "avonix-cep-disclaimer";
    disc.textContent = disclaimer;
    form.appendChild(disc);
  }

  var replyEta = document.createElement("p");
  replyEta.className = "avonix-cep-reply-eta";
  replyEta.innerHTML =
    '<span class="avonix-cep-reply-eta__dot" aria-hidden="true"></span><span></span>';
  replyEta.querySelector("span:last-child").textContent =
    theme.replyEtaText ||
    "We typically reply in under 2 minutes.";

  ai.appendChild(aiHead);
  ai.appendChild(log);
  ai.appendChild(replyEta);
  ai.appendChild(form);

  /* ---- Terms agreement (required before chat) ---- */
  var agree = document.createElement("div");
  agree.className = "avonix-cep-agree is-hidden";
  agree.setAttribute("role", "dialog");
  agree.setAttribute("aria-label", "Terms agreement");

  var agreeClose = document.createElement("button");
  agreeClose.type = "button";
  agreeClose.className = "avonix-cep-agree__close";
  agreeClose.setAttribute("aria-label", "Close");
  agreeClose.innerHTML = "&#10005;";

  var agreeBody = document.createElement("div");
  agreeBody.className = "avonix-cep-agree__body";

  // Logo as-is (natural aspect) with editable height; letter mark only when no logo.
  if (agreementLogo && agreementLogoSize > 0) {
    var logoImg = document.createElement("img");
    logoImg.className = "avonix-cep-agree__logo";
    logoImg.src = String(agreementLogo).replace(/"/g, "");
    logoImg.alt = agreementBrand;
    logoImg.style.height = agreementLogoSize + "px";
    logoImg.style.width = "auto";
    logoImg.style.maxWidth = "100%";
    logoImg.style.objectFit = "contain";
    logoImg.style.borderRadius = "0";
    agreeBody.appendChild(logoImg);
  } else if (!agreementLogo) {
    var mark = document.createElement("div");
    mark.className = "avonix-cep-agree__mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent =
      String(agreementBrand).trim().charAt(0).toUpperCase() || "C";
    agreeBody.appendChild(mark);
  }

  if (agreementHtml) {
    var richEl = document.createElement("div");
    richEl.className = "avonix-cep-agree__rich";
    richEl.innerHTML = sanitizeAgreeHtml(agreementHtml);
    agreeBody.appendChild(richEl);
  } else {
    var brandEl = document.createElement("p");
    brandEl.className = "avonix-cep-agree__brand";
    brandEl.textContent = agreementBrand;
    agreeBody.appendChild(brandEl);

    var introEl = document.createElement("p");
    introEl.className = "avonix-cep-agree__intro";
    introEl.textContent = agreementIntro;
    agreeBody.appendChild(introEl);

    var copyEl = document.createElement("p");
    copyEl.className = "avonix-cep-agree__copy";
    copyEl.innerHTML = linkAgreementCopy(agreementBody, termsUrl, privacyUrl);
    agreeBody.appendChild(copyEl);
  }

  // Lead fields — inline Name + Phone + Email, capped at 550px.
  var agreeFields = document.createElement("div");
  agreeFields.className = "avonix-cep-agree__fields";
  agreeFields.innerHTML =
    '<label class="avonix-cep-agree__field">' +
    '<span class="avonix-cep-agree__field-label">Name</span>' +
    '<input type="text" class="avonix-cep-agree__input" id="avonix-cep-agree-name-' +
    instanceUid +
    '" autocomplete="name" placeholder="Name"/>' +
    "</label>" +
    '<label class="avonix-cep-agree__field">' +
    '<span class="avonix-cep-agree__field-label">Phone</span>' +
    '<input type="tel" class="avonix-cep-agree__input" id="avonix-cep-agree-phone-' +
    instanceUid +
    '" autocomplete="tel" placeholder="Phone"/>' +
    "</label>" +
    '<label class="avonix-cep-agree__field">' +
    '<span class="avonix-cep-agree__field-label">Email</span>' +
    '<input type="email" class="avonix-cep-agree__input" id="avonix-cep-agree-email-' +
    instanceUid +
    '" autocomplete="email" placeholder="Email"/>' +
    "</label>";
  agreeBody.appendChild(agreeFields);

  var agreeErr = document.createElement("div");
  agreeErr.className = "avonix-cep-agree__err";
  agreeBody.appendChild(agreeErr);

  var agreeName = agreeFields.querySelector("#avonix-cep-agree-name-" + instanceUid);
  var agreePhone = agreeFields.querySelector("#avonix-cep-agree-phone-" + instanceUid);
  var agreeEmail = agreeFields.querySelector("#avonix-cep-agree-email-" + instanceUid);
  if (visitorName && agreeName) agreeName.value = visitorName;
  if (visitorPhone && agreePhone) agreePhone.value = visitorPhone;
  if (visitorEmail && agreeEmail) agreeEmail.value = visitorEmail;

  var agreeActions = document.createElement("div");
  agreeActions.className = "avonix-cep-agree__actions";
  var agreeNo = document.createElement("button");
  agreeNo.type = "button";
  agreeNo.className = "avonix-cep-agree__btn";
  agreeNo.textContent = disagreeLabel;
  var agreeYes = document.createElement("button");
  agreeYes.type = "button";
  agreeYes.className = "avonix-cep-agree__btn is-primary";
  agreeYes.textContent = agreeLabel;
  agreeActions.appendChild(agreeNo);
  agreeActions.appendChild(agreeYes);

  agree.appendChild(agreeClose);
  agree.appendChild(agreeBody);
  agree.appendChild(agreeActions);

  panel.appendChild(agree);
  panel.appendChild(home);
  panel.appendChild(gate);
  panel.appendChild(ai);

  root.classList.add(alignEnd ? "is-align-end" : "is-align-start");
  root.appendChild(panel);

  var fabRow = document.createElement("div");
  fabRow.className = "avonix-cep-fab-row";
  var launcherCta = String(theme.launcherLabel || config.label || "").trim();
  var ctaPill = null;
  if (launcherCta && surface !== "wizard") {
    ctaPill = document.createElement("button");
    ctaPill.type = "button";
    ctaPill.className = "avonix-cep-cta-pill";
    ctaPill.setAttribute("aria-label", launcherCta);
    var pillAv = document.createElement("span");
    pillAv.className = "avonix-cep-cta-pill__av";
    if (avatarUrl) {
      pillAv.innerHTML =
        '<img src="' + String(avatarUrl).replace(/"/g, "") + '" alt="">';
    } else {
      pillAv.innerHTML = CHAT_SVG;
    }
    var pillTxt = document.createElement("span");
    pillTxt.className = "avonix-cep-cta-pill__txt";
    pillTxt.textContent = launcherCta;
    ctaPill.appendChild(pillAv);
    ctaPill.appendChild(pillTxt);
    ctaPill.addEventListener("click", function () {
      setOpen(true);
    });
  }
  if (ctaPill) fabRow.appendChild(ctaPill);
  fabRow.appendChild(button);
  root.appendChild(fabRow);

  function sanitizeAgreeHtml(raw) {
    var wrap = document.createElement("div");
    wrap.innerHTML = String(raw || "");
    var allowed = {
      P: 1,
      BR: 1,
      DIV: 1,
      SPAN: 1,
      STRONG: 1,
      B: 1,
      EM: 1,
      I: 1,
      U: 1,
      A: 1,
      H1: 1,
      H2: 1,
      H3: 1,
      H4: 1,
      UL: 1,
      OL: 1,
      LI: 1,
      FONT: 1,
    };
    function walk(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      for (var i = 0; i < kids.length; i++) {
        var child = kids[i];
        if (child.nodeType === 1) {
          var el = child;
          if (!allowed[el.tagName]) {
            while (el.firstChild) node.insertBefore(el.firstChild, el);
            node.removeChild(el);
            continue;
          }
          var attrs = Array.prototype.slice.call(el.attributes || []);
          for (var a = 0; a < attrs.length; a++) {
            var name = String(attrs[a].name || "").toLowerCase();
            if (name.indexOf("on") === 0 || name === "srcdoc") {
              el.removeAttribute(attrs[a].name);
              continue;
            }
            if (el.tagName === "A" && name === "href") {
              var href = String(attrs[a].value || "").trim();
              if (/^javascript:/i.test(href)) el.removeAttribute("href");
              else {
                el.setAttribute("target", "_blank");
                el.setAttribute("rel", "noopener noreferrer");
              }
              continue;
            }
            if (name === "style") {
              el.setAttribute(
                "style",
                String(attrs[a].value || "")
                  .replace(/expression\s*\(/gi, "")
                  .replace(/url\s*\(\s*['"]?\s*javascript:/gi, "")
                  .replace(/position\s*:/gi, "")
              );
              continue;
            }
            if (el.tagName === "FONT" && (name === "color" || name === "size")) {
              continue;
            }
            if (
              name !== "href" &&
              name !== "style" &&
              name !== "target" &&
              name !== "rel"
            ) {
              el.removeAttribute(attrs[a].name);
            }
          }
          walk(el);
        } else if (child.nodeType === 8) {
          node.removeChild(child);
        }
      }
    }
    walk(wrap);
    return wrap.innerHTML;
  }

  function linkAgreementCopy(text, terms, privacy) {
    var esc = String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    function wrap(label, url) {
      if (!url) return label;
      var href = String(url).replace(/"/g, "&quot;");
      return (
        '<a href="' +
        href +
        '" target="_blank" rel="noopener noreferrer">' +
        label +
        "</a>"
      );
    }
    return esc
      .replace(/Terms Of Use/gi, function (m) {
        return wrap(m, terms);
      })
      .replace(/Privacy Policy/gi, function (m) {
        return wrap(m, privacy);
      });
  }

  function hasAgreed() {
    if (!agreementRequired) return true;
    return agreedForOpen;
  }
  function setAgreed() {
    agreedForOpen = true;
  }

  /* ---- TTS ---- */
  var speech =
    window.speechSynthesis && typeof window.SpeechSynthesisUtterance === "function"
      ? window.speechSynthesis
      : null;
  var ttsLang = (document.documentElement.getAttribute("lang") || "en-US").replace("_", "-");

  function stopSpeech() {
    if (!speech) return;
    try {
      speech.cancel();
    } catch (e) {}
    ttsBtn.classList.remove("is-speaking");
  }
  function speakable(text) {
    return String(text || "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_`#>]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  function speak(text) {
    if (!speech || !ttsOn) return;
    var say = speakable(text);
    if (!say) return;
    stopSpeech();
    try {
      var u = new window.SpeechSynthesisUtterance(say);
      u.lang = ttsLang;
      u.onstart = function () {
        ttsBtn.classList.add("is-speaking");
      };
      u.onend = function () {
        ttsBtn.classList.remove("is-speaking");
      };
      u.onerror = u.onend;
      speech.speak(u);
    } catch (e) {}
  }
  function botSaid(text) {
    lastBotText = String(text || "");
    speak(lastBotText);
  }
  if (speech) {
    ttsBtn.hidden = false;
    ttsBtn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ttsOn = !ttsOn;
      ttsBtn.classList.toggle("is-on", ttsOn);
      ttsBtn.setAttribute("aria-pressed", ttsOn ? "true" : "false");
      if (ttsOn) speak(lastBotText);
      else stopSpeech();
    });
  }
  window.addEventListener("pagehide", stopSpeech);

  function updateSendState() {
    if ((input.value || "").trim()) send.classList.add("is-active");
    else send.classList.remove("is-active");
  }
  input.addEventListener("input", updateSendState);

  function handleButton(btn) {
    if (!btn) return;
    if (btn.action === "url" && btn.value) {
      window.open(btn.value, "_blank", "noopener");
      return;
    }
    if (btn.action === "transfer_agent") {
      sendMessage(btn.label || "Talk to a human", "transfer_agent");
      return;
    }
    if (btn.action === "start_form") {
      sendMessage(btn.label || "Leave details", "start_form");
      return;
    }
    input.value = btn.value || btn.label || "";
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  }

  function renderBlocks(blocks, who, opts) {
    opts = opts || {};
    var isSys = (blocks || []).some(function (b) {
      return b && b.type === "system";
    });
    var row = document.createElement("div");
    row.className = "avonix-cep-row" + (who === "you" ? " avonix-cep-row--you" : "");

    if (who !== "you" && !isSys) {
      row.appendChild(avatarNode("avonix-cep-bubav"));
    }

    var col = document.createElement("div");
    col.className = "avonix-cep-col";
    var wrap = document.createElement("div");
    wrap.className =
      "avonix-cep-bubble " +
      (who === "you"
        ? "avonix-cep-bubble--you"
        : isSys
          ? "avonix-cep-bubble--system"
          : "avonix-cep-bubble--bot");

    var plainBits = [];
    (blocks || []).forEach(function (b) {
      if (!b || !b.type) return;
      if (b.type === "plain_text" || b.type === "markdown" || b.type === "system") {
        var p = document.createElement("div");
        p.innerHTML = linkify(b.text || "");
        wrap.appendChild(p);
        plainBits.push(b.text || "");
      } else if (b.type === "buttons") {
        return;
      } else if (b.type === "lead_form") {
        var box = document.createElement("div");
        box.className = "avonix-cep-lead";
        if (b.title) {
          var t = document.createElement("div");
          t.style.fontWeight = "600";
          t.style.marginBottom = "8px";
          t.style.fontSize = "13px";
          t.textContent = b.title;
          box.appendChild(t);
        }
        var html =
          b.html ||
          (config.lead_form && config.lead_form.form_id === b.formId
            ? config.lead_form.html
            : "");
        if (html) box.innerHTML = (b.title ? box.innerHTML : "") + html;
        else {
          var miss = document.createElement("div");
          miss.textContent = "Form unavailable.";
          box.appendChild(miss);
        }
        wrap.appendChild(box);
      }
    });

    if (wrap.childNodes.length) {
      col.appendChild(wrap);
      if (!isSys) {
        var meta = document.createElement("div");
        meta.className = "avonix-cep-time";
        meta.textContent = formatTime();
        col.appendChild(meta);
      }
      row.appendChild(col);
      log.appendChild(row);
      if (who !== "you" && !isSys) botSaid(plainBits.join(" "));
    }

    (blocks || []).forEach(function (b) {
      if (!b || b.type !== "buttons" || !b.buttons || !b.buttons.length) return;
      appendTryAsking(b.buttons);
    });

    log.scrollTop = log.scrollHeight;
    if (opts.sound && who !== "you") playPing();
  }

  function bubble(text, who, opts) {
    renderBlocks([{ type: "plain_text", text: text }], who, opts);
  }

  function cardAccentFor(btn, idx) {
    var key = String((btn && (btn.icon || btn.id || btn.label)) || "").toLowerCase();
    if (/alert|emerg|911|trauma/.test(key)) return "#ec4899";
    if (/calendar|book|appoint|schedule/.test(key)) return "#0ea5e9";
    if (/phone|call|human|doctor|agent|headphones|transfer/.test(key)) return "#10b981";
    if (/image|portfolio|work|gallery/.test(key)) return "#8b5cf6";
    if (/layers|price|package|pricing|quote|calculator/.test(key)) return "#f59e0b";
    if (/shield|insur/.test(key)) return "#6366f1";
    if (/heart|check|tooth|dental|smile/.test(key)) return "#06b6d4";
    if (/pen|logo|spark|brand|redesign/.test(key)) return "#a855f7";
    if (/map|direction|car|parking/.test(key)) return "#14b8a6";
    if (/file|brief|record|portal/.test(key)) return "#3b82f6";
    if (/stethoscope|service|clinic/.test(key)) return "#0284c7";
    var palette = [
      primary,
      "#ec4899",
      "#0ea5e9",
      "#8b5cf6",
      "#f59e0b",
      "#10b981",
    ];
    return palette[idx % palette.length] || primary;
  }

  function appendTryAsking(buttons) {
    var tryBox = document.createElement("div");
    tryBox.className = "avonix-cep-try";
    var btns = document.createElement("div");
    btns.className = "avonix-cep-btns";
    (buttons || []).slice(0, 6).forEach(function (btn, idx) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "avonix-cep-btn";
      var accent = cardAccentFor(btn, idx);
      el.style.setProperty("--avx-card-accent", accent);
      el.style.setProperty(
        "--avx-card-soft",
        "color-mix(in srgb," + accent + " 16%,#ffffff)"
      );
      var iconKey = btn.icon || btn.id || "";
      el.innerHTML =
        '<span class="avonix-cep-btn__ico">' +
        suggestionIcon(iconKey, idx) +
        '</span><span class="avonix-cep-btn__txt"></span>';
      el.querySelector(".avonix-cep-btn__txt").textContent = btn.label || "OK";
      el.addEventListener("click", function () {
        handleButton(btn);
      });
      btns.appendChild(el);
    });
    tryBox.appendChild(btns);
    log.appendChild(tryBox);
  }

  function appendStreamingBubble() {
    var row = document.createElement("div");
    row.className = "avonix-cep-row";
    row.appendChild(avatarNode("avonix-cep-bubav"));
    var col = document.createElement("div");
    col.className = "avonix-cep-col";
    var wrap = document.createElement("div");
    wrap.className = "avonix-cep-bubble avonix-cep-bubble--bot";
    var p = document.createElement("div");
    wrap.appendChild(p);
    col.appendChild(wrap);
    row.appendChild(col);
    log.appendChild(row);
    return { row: row, textEl: p };
  }

  function showTyping() {
    var el = document.createElement("div");
    el.className = "avonix-cep-typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function showGreeting() {
    if (log.childNodes.length) return;
    var greet =
      config.greeting ||
      "Hi! Ask me anything about our site and I'll help right away.";
    bubble(greet, "bot");
    var qr = config.quick_replies || [];
    if (qr.length) appendTryAsking(qr);
  }

  function showHome() {
    aiViewActive = false;
    agree.classList.add("is-hidden");
    home.classList.remove("is-hidden");
    gate.classList.add("is-hidden");
    ai.classList.add("is-hidden");
  }

  function showGate() {
    aiViewActive = false;
    agree.classList.add("is-hidden");
    home.classList.add("is-hidden");
    gate.classList.remove("is-hidden");
    ai.classList.add("is-hidden");
  }

  function showAgreement() {
    aiViewActive = false;
    agree.classList.remove("is-hidden");
    home.classList.add("is-hidden");
    gate.classList.add("is-hidden");
    ai.classList.add("is-hidden");
  }

  function showAi() {
    aiViewActive = true;
    agree.classList.add("is-hidden");
    home.classList.add("is-hidden");
    gate.classList.add("is-hidden");
    ai.classList.remove("is-hidden");
    showGreeting();
    setTimeout(function () {
      input.focus();
    }, 40);
    startPoll();
  }

  function enterFromGate() {
    var name = ((gateName && gateName.value) || "").trim();
    var phone = ((gatePhone && gatePhone.value) || "").trim();
    var email = ((gateEmail && gateEmail.value) || "").trim();
    if (!email && !phone) {
      if (gateErr) {
        gateErr.textContent = "Please add an email or phone.";
        gateErr.classList.add("is-on");
      }
      return;
    }
    if (gateErr) gateErr.classList.remove("is-on");
    leadGatePassed = true;
    if (email) visitorEmail = email.toLowerCase();
    if (name) visitorName = name;
    try {
      sessionStorage.setItem("avonix-cep-started", "1");
      if (email) sessionStorage.setItem("avonix-cep-email", email);
      if (name) sessionStorage.setItem("avonix-cep-name", name);
      if (phone) sessionStorage.setItem("avonix-cep-phone", phone);
    } catch (e) {}
    showAi();
  }

  function acceptAgreement() {
    var name = ((agreeName && agreeName.value) || "").trim();
    var phone = ((agreePhone && agreePhone.value) || "").trim();
    var email = ((agreeEmail && agreeEmail.value) || "").trim().toLowerCase();
    if (agreeErr) agreeErr.classList.remove("is-on");

    if (!name) {
      if (agreeErr) {
        agreeErr.textContent = "Please enter your name.";
        agreeErr.classList.add("is-on");
      }
      if (agreeName) agreeName.focus();
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (agreeErr) {
        agreeErr.textContent = "Please enter a valid email.";
        agreeErr.classList.add("is-on");
      }
      if (agreeEmail) agreeEmail.focus();
      return;
    }

    visitorName = name;
    visitorPhone = phone;
    visitorEmail = email;
    try {
      sessionStorage.setItem("avonix-cep-name", name);
      sessionStorage.setItem("avonix-cep-email", email);
      if (phone) sessionStorage.setItem("avonix-cep-phone", phone);
      else sessionStorage.removeItem("avonix-cep-phone");
    } catch (e) {}

    setAgreed();
    agreeYes.disabled = true;
    agreeNo.disabled = true;

    var body = new FormData();
    body.append("action", "avonix_chat");
    body.append("nonce", config.nonce || "");
    body.append("message", "");
    body.append("chat_action", "prechat_lead");
    body.append("email", email);
    body.append("name", name);
    if (phone) body.append("phone", phone);
    if (conversationId) body.append("conversation_id", conversationId);
    if (config.widget_id) body.append("widget_id", config.widget_id);
    body.append("surface", surface);

    fetch(proxy, { method: "POST", body: body, credentials: "same-origin" })
      .then(function (r) {
        return r.json().catch(function () {
          return {};
        });
      })
      .then(function (data) {
        if (data && data.conversation_id) conversationId = data.conversation_id;
        proceedAfterAgreement();
      })
      .catch(function () {
        proceedAfterAgreement();
      })
      .finally(function () {
        agreeYes.disabled = false;
        agreeNo.disabled = false;
      });
  }

  function hasStarted() {
    if (!preChatOn) return true;
    try {
      return sessionStorage.getItem("avonix-cep-started") === "1";
    } catch (e) {
      return false;
    }
  }

  function openAiFlow() {
    if (preChatOn && !hasStarted() && !leadGatePassed) showGate();
    else showAi();
  }

  /** After terms agreement — home or AI / lead gate. */
  function proceedAfterAgreement() {
    if (!openOnLaunch) showHome();
    else openAiFlow();
  }

  function beginOpenFlow() {
    // Every time the chat opens, show Terms / Privacy before anything else.
    if (agreementRequired) {
      agreedForOpen = false;
      showAgreement();
      return;
    }
    proceedAfterAgreement();
  }

  function startPoll() {
    if (pollTimer) return;
    pollTimer = setInterval(pollMessages, 2500);
  }

  function pollMessages() {
    if (!conversationId) return;
    var body = new FormData();
    body.append("action", "avonix_chat_poll");
    body.append("nonce", config.nonce || "");
    body.append("conversation_id", conversationId);
    if (lastSeenAt) body.append("after", lastSeenAt);
    fetch(proxy, { method: "POST", body: body, credentials: "same-origin" })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data || !data.messages) return;
        if (data.handoff_status) handoffStatus = data.handoff_status;
        data.messages.forEach(function (m) {
          if (!m || !m.id || seenIds[m.id]) return;
          seenIds[m.id] = true;
          if (m.created_at) lastSeenAt = m.created_at;
          var who = m.author === "agent" ? "agent" : "bot";
          if (m.blocks && m.blocks.length) renderBlocks(m.blocks, who, { sound: true });
          else bubble(m.body || "", who, { sound: true });
        });
      })
      .catch(function () {});
  }

  function applyDone(data) {
    if (data && data.conversation_id) conversationId = data.conversation_id;
    if (data && data.handoff_status) handoffStatus = data.handoff_status;
    lastSeenAt = new Date().toISOString();
    if (data && data.blocks && data.blocks.length) {
      renderBlocks(data.blocks, "bot", { sound: true });
    } else {
      bubble(
        (data && (data.reply || data.message)) || "Sorry — try again.",
        "bot",
        { sound: true }
      );
    }
    startPoll();
  }

  function sendMessage(text, action) {
    if (busy) return;
    var msg = (text || "").trim();
    if (!msg && !action) return;
    if (msg) bubble(msg, "you");
    busy = true;
    send.disabled = true;

    if (streamingOn && !action) {
      var streamBody = new FormData();
      streamBody.append("action", "avonix_chat_stream");
      streamBody.append("nonce", config.nonce || "");
      streamBody.append("message", msg);
      if (conversationId) streamBody.append("conversation_id", conversationId);
      if (config.widget_id) streamBody.append("widget_id", config.widget_id);
      streamBody.append("surface", surface);
      if (visitorEmail) streamBody.append("email", visitorEmail);
      if (visitorName) streamBody.append("name", visitorName);

      var live = appendStreamingBubble();
      fetch(proxy, { method: "POST", body: streamBody, credentials: "same-origin" })
        .then(function (r) {
          if (!r.ok || !r.body || !r.body.getReader) {
            return r.json().then(function (data) {
              live.row.remove();
              applyDone(data);
            });
          }
          var reader = r.body.getReader();
          var decoder = new TextDecoder();
          var buf = "";
          var gotDone = false;
          function pump() {
            return reader.read().then(function (result) {
              if (result.done) {
                if (!gotDone) {
                  live.row.remove();
                  bubble("Sorry — try again.", "bot");
                }
                return;
              }
              buf += decoder.decode(result.value, { stream: true });
              var parts = buf.split("\n\n");
              buf = parts.pop() || "";
              parts.forEach(function (chunk) {
                var lines = chunk.split("\n");
                var event = "message";
                var dataLine = "";
                lines.forEach(function (line) {
                  if (line.indexOf("event:") === 0) event = line.slice(6).trim();
                  if (line.indexOf("data:") === 0) dataLine += line.slice(5).trim();
                });
                if (!dataLine) return;
                var payload = null;
                try {
                  payload = JSON.parse(dataLine);
                } catch (e) {
                  return;
                }
                if (event === "token" && payload) {
                  live.textEl.textContent = payload.accumulated || "";
                  log.scrollTop = log.scrollHeight;
                }
                if (event === "done" && payload) {
                  gotDone = true;
                  live.row.remove();
                  applyDone(payload);
                }
                if (event === "error" && payload) {
                  gotDone = true;
                  live.row.remove();
                  bubble(payload.message || "Sorry — try again.", "bot");
                }
              });
              return pump();
            });
          }
          return pump();
        })
        .catch(function () {
          live.row.remove();
          bubble("Network error. Please try again.", "bot");
        })
        .finally(function () {
          busy = false;
          send.disabled = false;
          updateSendState();
          input.focus();
        });
      return;
    }

    var body = new FormData();
    body.append("action", "avonix_chat");
    body.append("nonce", config.nonce || "");
    body.append("message", msg || action || "");
    if (action) body.append("chat_action", action);
    if (conversationId) body.append("conversation_id", conversationId);
    if (config.widget_id) body.append("widget_id", config.widget_id);
    body.append("surface", surface);
    if (visitorEmail) body.append("email", visitorEmail);
    if (visitorName) body.append("name", visitorName);

    fetch(proxy, { method: "POST", body: body, credentials: "same-origin" })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        applyDone(data);
      })
      .catch(function () {
        bubble("Network error. Please try again.", "bot");
      })
      .finally(function () {
        busy = false;
        send.disabled = false;
        updateSendState();
        input.focus();
      });
  }

  function resetChat() {
    stopSpeech();
    conversationId = null;
    lastSeenAt = null;
    seenIds = {};
    lastBotText = "";
    log.innerHTML = "";
    leadGatePassed = false;
    try {
      sessionStorage.removeItem("avonix-cep-started");
    } catch (e) {}
    // New chat → require agreement again; next Agree opens a fresh conversation.
    agreedForOpen = false;
    if (agreementRequired) {
      showAgreement();
      return;
    }
    if (!openOnLaunch) showHome();
    else openAiFlow();
  }

  function ctaBottomClearance() {
    var pad = 16;
    try {
      if (
        document.body.classList.contains("avonix-cta-padded") ||
        document.querySelector(".avonix-bottom-nav, .avonix-cta-bar")
      ) {
        pad = 88;
      }
    } catch (e) {}
    return pad;
  }

  function placeRoot() {
    if (surface === "wizard") return;
    // Match a11y/lang: innerHeight only — visualViewport drifts break equal % gaps.
    var vw = window.innerWidth || document.documentElement.clientWidth || 360;
    var vh = window.innerHeight || document.documentElement.clientHeight || 640;
    var bottomClear = ctaBottomClearance();
    var narrow = vw < 640;
    var isOpenNow = root.classList.contains("is-open");
    root.classList.toggle("is-narrow", narrow);
    // Use configured outer size only — never a higher floor, or same % drifts vs a11y/lang.
    var bw = launcherPx;
    var bh = launcherPx;
    if (ctaPill && !isOpenNow && !narrow) {
      bw = launcherPx + 190;
    }
    // Phones: keep FABs fully on-screen (no flush half-cut edge dock).
    var edgeInset = narrow ? 8 : 0;

    // Linked FAB stack owns closed-launcher placement (1px gap with a11y/lang).
    // placeRoot must not re-pin bottom/% or the chat tile drifts below the stack.
    var fabG =
      window.AVONIX_FAB_GROUP ||
      (config && config.fab_group) ||
      null;
    var chatStacked =
      !isOpenNow &&
      (!fabG || fabG.enabled !== false) &&
      !(fabG && fabG.members && fabG.members.chat && fabG.members.chat.linked === false);
    if (chatStacked) {
      root.classList.add("avonix-fab-stacked");
      root.style.gap = "0px";
      if (ctaPill) ctaPill.removeAttribute("hidden");
      // Launcher on the stack edge; CTA label sits beside it.
      fabRow.style.flexDirection = useFree
        ? freeX >= 50
          ? "row"
          : "row-reverse"
        : edgeX === "right"
          ? "row"
          : "row-reverse";
      if (window.AvonixFabStack && typeof window.AvonixFabStack.schedule === "function") {
        window.AvonixFabStack.schedule();
      }
      return;
    }
    root.classList.remove("avonix-fab-stacked");
    root.style.gap = "";
    if (ctaPill && !isOpenNow) ctaPill.removeAttribute("hidden");

    root.style.left = "auto";
    root.style.right = "auto";
    root.style.top = "auto";
    root.style.bottom = "auto";
    root.style.width = "";

    // Mobile + open only: snap panel into the viewport. Closed FAB stays on
    // free % so it lines up with Accessibility / Language in the same stack.
    if (narrow && isOpenNow && surface !== "wizard") {
      var openLeft = useFree ? freeX >= 50 : edgeX === "right";
      root.style.flexDirection = "column";
      root.style.alignItems = openLeft ? "flex-end" : "flex-start";
      root.classList.toggle("is-align-end", openLeft);
      root.classList.toggle("is-align-start", !openLeft);
      fabRow.style.flexDirection = openLeft ? "row" : "row-reverse";
      var narrowR = launcherCorner + "px";
      root.style.setProperty("--avx-launcher-radius", narrowR);
      button.style.borderRadius = narrowR;
      root.style.left = "8px";
      root.style.right = "8px";
      root.style.top = "auto";
      root.style.bottom = Math.max(8, bottomClear) + "px";
      root.style.width = "auto";
      return;
    }

    if (useFree) {
      // Full-viewport % (same as studio): equal % steps → equal pixel gaps
      // across Language / Accessibility / Chat even when outer sizes differ.
      var x = Math.round((freeX / 100) * vw);
      var y = Math.round((freeY / 100) * vh);
      x = Math.min(Math.max(edgeInset, vw - bw - edgeInset), Math.max(edgeInset, x));
      y = Math.min(Math.max(edgeInset, vh - bh - edgeInset), Math.max(edgeInset, y));
      var openUp = freeY >= 45;
      var openLeftFree = freeX >= 50;
      // panel is first in DOM, launcher second — column keeps FAB at bottom
      // when the panel opens upward; reverse puts FAB on top when opening down.
      root.style.flexDirection = openUp ? "column" : "column-reverse";
      root.style.alignItems = openLeftFree ? "flex-end" : "flex-start";
      root.classList.toggle("is-align-end", openLeftFree);
      root.classList.toggle("is-align-start", !openLeftFree);
      fabRow.style.flexDirection = openLeftFree ? "row" : "row-reverse";
      // Mobile: full radius so tiles are not clipped flush against the screen edge.
      var tileR = narrow
        ? launcherCorner + "px"
        : launcherTileRadius(!openLeftFree);
      root.style.setProperty("--avx-launcher-radius", tileR);
      button.style.borderRadius = tileR;
      root.style.left = x + "px";
      if (openUp) {
        // Pin launcher bottom so the chat panel opens upward from the FAB.
        root.style.top = "auto";
        root.style.bottom = Math.max(edgeInset, vh - (y + bh)) + "px";
      } else {
        root.style.bottom = "auto";
        root.style.top = y + "px";
      }
      return;
    }

    var edgeOy = edgeY === "bottom" ? Math.max(oy, bottomClear) : oy;
    if (narrow) {
      edgeOy = Math.max(edgeInset, edgeOy);
    }
    root.style.flexDirection = edgeY === "bottom" ? "column" : "column-reverse";
    root.style.alignItems = edgeX === "left" ? "flex-start" : "flex-end";
    root.classList.toggle("is-align-end", edgeX === "right");
    root.classList.toggle("is-align-start", edgeX === "left");
    fabRow.style.flexDirection = edgeX === "right" ? "row" : "row-reverse";
    var edgeTileR = narrow
      ? launcherCorner + "px"
      : launcherTileRadius(edgeX === "left");
    root.style.setProperty("--avx-launcher-radius", edgeTileR);
    button.style.borderRadius = edgeTileR;
    root.style[edgeY] = edgeOy + "px";
    root.style[edgeX] = (narrow ? Math.max(edgeInset, ox) : ox) + "px";
  }

  function setOpen(next) {
    open = !!next;
    if (open) {
      panel.classList.add("is-open");
      root.classList.add("is-open");
    } else {
      panel.classList.remove("is-open");
      root.classList.remove("is-open");
    }
    button.setAttribute("aria-expanded", open ? "true" : "false");
    placeRoot();
    if (open) {
      beginOpenFlow();
    } else {
      agreedForOpen = false;
      stopSpeech();
    }
  }

  button.addEventListener("click", function () {
    setOpen(!open);
  });
  homeClose.addEventListener("click", function () {
    setOpen(false);
  });
  gateHead.querySelector(".avonix-cep-close").addEventListener("click", function () {
    setOpen(false);
  });
  agreeClose.addEventListener("click", function () {
    setOpen(false);
  });
  agreeYes.addEventListener("click", acceptAgreement);
  agreeNo.addEventListener("click", function () {
    setOpen(false);
  });
  if (agreeName) {
    agreeName.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        if (agreePhone) agreePhone.focus();
        else if (agreeEmail) agreeEmail.focus();
      }
    });
  }
  if (agreePhone) {
    agreePhone.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        if (agreeEmail) agreeEmail.focus();
      }
    });
  }
  if (agreeEmail) {
    agreeEmail.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        acceptAgreement();
      }
    });
  }
  startBtn.addEventListener("click", openAiFlow);
  backBtn.addEventListener("click", function () {
    if (surface === "wizard") return;
    setOpen(false);
  });
  resetBtn.addEventListener("click", resetChat);
  if (gateSend) gateSend.addEventListener("click", enterFromGate);
  emojiBtn.addEventListener("click", function (ev) {
    ev.preventDefault();
    emojiPop.classList.toggle("is-open");
  });
  document.addEventListener("click", function (ev) {
    if (!emojiWrap.contains(ev.target)) emojiPop.classList.remove("is-open");
  });
  clipBtn.addEventListener("click", function () {
    fileInput.click();
  });
  fileInput.addEventListener("change", function () {
    /* Preview only for now — upload pipeline can be wired later */
    if (fileInput.files && fileInput.files[0]) {
      clipBtn.classList.add("is-armed");
    }
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && open) setOpen(false);
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var text = (input.value || "").trim();
    if (!text) return;
    input.value = "";
    updateSendState();
    emojiPop.classList.remove("is-open");
    sendMessage(text, null);
  });

  function mountInto(target) {
    if (surface === "wizard") {
      // Never float — fill the shortcode / embed host.
      root.className =
        "avonix-cep-root avonix-cep-root--" +
        instanceUid +
        " avonix-cep-root--wizard";
      root.style.cssText =
        "position:relative;inset:auto;left:auto;right:auto;top:auto;bottom:auto;width:100%;height:100%;max-width:100%;z-index:1;display:flex;flex-direction:column;gap:0;box-sizing:border-box;";
      target.appendChild(root);
      open = true;
      panel.classList.add("is-open");
      root.classList.add("is-open");
      beginOpenFlow();
      return;
    }
    document.body.appendChild(root);
    placeRoot();
    requestAnimationFrame(placeRoot);
    setTimeout(placeRoot, 120);
    window.addEventListener("resize", placeRoot);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", placeRoot);
      window.visualViewport.addEventListener("scroll", placeRoot);
    }
    var delay = (config.triggers && config.triggers.delayMs) || 0;
    if (delay > 0) {
      setTimeout(function () {
        if (!open) setOpen(true);
      }, delay);
    }
  }

  function findWizardHost() {
    if (config.mount) {
      try {
        var byMount = document.querySelector(config.mount);
        if (byMount) return byMount;
      } catch (e) {}
    }
    return (
      document.querySelector("[data-avonix-chat-wizard]") ||
      document.getElementById("avonix-chat-wizard")
    );
  }

  function boot() {
    if (surface === "wizard") {
      var host = findWizardHost();
      if (!host) return;
      if (!host.id) host.id = "avonix-chat-wizard";
      config.mount = "#" + host.id;
      root.className =
        "avonix-cep-root avonix-cep-root--" +
        instanceUid +
        " avonix-cep-root--wizard";
      root.setAttribute("data-surface", "wizard");
      mountInto(host);
      return;
    }
    mountInto(document.body);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  return {
    open: function () {
      setOpen(true);
    },
    close: function () {
      setOpen(false);
    },
    setOpen: setOpen,
  };
  } // end createAvonixChatWidget

  function bootAll() {
    var base = window.AVONIX_CHAT || {};
    if (!base.proxy) return;

    var path = base.path || window.location.pathname || "/";
    var surfaceCtx = base.wp_surface || "";
    var allowBubble =
      base.show_bubble !== false &&
      pageTargetAllows(base.page_target || base.pageTarget, path, surfaceCtx);

    var host =
      document.querySelector("[data-avonix-chat-wizard]") ||
      document.getElementById("avonix-chat-wizard");

    var bubbleApi = null;
    if (allowBubble) {
      var bubbleTheme = Object.assign(
        {},
        base.theme || {},
        base.bubble_theme && typeof base.bubble_theme === "object"
          ? base.bubble_theme
          : {}
      );
      bubbleApi = createAvonixChatWidget(
        Object.assign({}, base, {
          surface: "bubble",
          mount: null,
          _uid: "fab",
          theme: bubbleTheme,
        })
      );
    }

    if (host) {
      if (!host.id) host.id = "avonix-chat-wizard";
      createAvonixChatWidget(
        Object.assign({}, base, {
          surface: "wizard",
          mount: "#" + host.id,
          embed: true,
          _uid: "embed",
        })
      );
    }

    window.AvonixCep = window.AvonixCep || {};
    if (bubbleApi) {
      window.AvonixCep.open = function () {
        bubbleApi.open();
      };
      window.AvonixCep.close = function () {
        bubbleApi.close();
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootAll);
  } else {
    bootAll();
  }
})();
