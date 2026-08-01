/*
 * Avonix CEP chat widget — Nexus Lead Suite parity (bubble + panel + AI messenger)
 * No build step. Talks only to WP admin-ajax (connector key stays server-side).
 */
(function () {
  "use strict";

  var config = window.AVONIX_CHAT || {};
  var proxy = config.proxy;
  if (!proxy) return;

  var theme = config.theme || {};
  var modules = config.modules || {};

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
  var agreementIntro =
    theme.agreementIntro ||
    "Hi! I am your " + agreementBrand + " Virtual Agent.";
  var agreementBody =
    theme.agreementBody ||
    "I'm happy to help find what you need. To continue, you will need to agree to our Terms Of Use and Privacy Policy.";
  var termsUrl = theme.termsUrl || "";
  var privacyUrl = theme.privacyUrl || "";
  var agreeLabel = theme.agreeLabel || "I Agree";
  var disagreeLabel = theme.disagreeLabel || "I Don't Agree";
  var agreeStorageKey =
    "avonix-cep-agree-" + String(config.widget_id || config.website_id || "site");
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
  var freeX =
    theme.leftPercent != null && isFinite(Number(theme.leftPercent))
      ? Math.min(100, Math.max(0, Number(theme.leftPercent)))
      : null;
  var freeY =
    theme.topPercent != null && isFinite(Number(theme.topPercent))
      ? Math.min(100, Math.max(0, Number(theme.topPercent)))
      : null;
  var useFree = freeX != null && freeY != null;
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

  var alignEnd = useFree ? freeX >= 50 : edgeX === "right";
  var stackUp = useFree ? freeY >= 45 : edgeY === "bottom";
  var rootPosCss = edgeY + ":" + oy + "px;" + edgeX + ":" + ox + "px;";

  var CHAT_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6a2 2 0 012-2h14a2 2 0 012 2v10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var style = document.createElement("style");
  style.textContent =
    ".avonix-cep-root{--avx-primary:" +
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
    ".avonix-cep-root{position:fixed;z-index:" +
    z +
    ";" +
    rootPosCss +
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;display:flex;flex-direction:" +
    (stackUp ? "column-reverse" : "column") +
    ";align-items:" +
    (alignEnd ? "flex-end" : "flex-start") +
    ";gap:12px;max-width:calc(100vw - 16px);box-sizing:border-box;}" +
    /* Inline shortcode / embed — fill the host container, never float. */
    ".avonix-chat-wizard{display:flex;flex-direction:column;width:100%;height:100%;min-height:420px;box-sizing:border-box;}" +
    ".avonix-cep-root--wizard{position:relative!important;inset:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;z-index:1;width:100%!important;max-width:100%!important;height:100%!important;min-height:100%;flex:1 1 auto;align-items:stretch!important;flex-direction:column!important;gap:0!important;max-width:none!important;box-sizing:border-box;}" +
    ".avonix-cep-root :where([class*=avonix-cep-]){box-sizing:border-box;}" +
    ".avonix-cep-root :where(button[class*=avonix-cep-],input[class*=avonix-cep-],a[class*=avonix-cep-]){margin:0;font-family:inherit;letter-spacing:normal;text-transform:none;-webkit-appearance:none;appearance:none;}" +
    /* FAB — Nexus style */
    ".avonix-cep-launcher{--avx-od:9px;cursor:pointer;border:0;width:var(--avx-launcher);height:var(--avx-launcher);padding:0;border-radius:50%;background:linear-gradient(145deg,var(--avx-primary-end) 0%,var(--avx-primary) 100%);color:var(--avx-on-primary);box-shadow:0 6px 24px rgba(0,0,0,.2);position:relative;display:flex;align-items:center;justify-content:center;overflow:visible;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease;}" +
    ".avonix-cep-launcher:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.22);}" +
    /* Avatar must be out of flow so the online dot cannot be pushed to bottom-left. */
    ".avonix-cep-launcher__img{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;z-index:1;}" +
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
    ";max-width:min(100%,calc(100vw - 24px));max-height:min(510px,calc(100vh - 130px));background:var(--avx-surface);color:var(--avx-ink);border-radius:" +
    radius +
    "px;overflow:hidden;box-shadow:0 16px 48px rgba(15,23,42,.18);}" +
    ".avonix-cep-panel.is-open{display:flex;animation:avonix-cep-pop .22s ease;}" +
    /* Bubble mode: keep FAB visible while open. Wizard: never show FAB. */
    ".avonix-cep-root.is-open:not(.avonix-cep-root--wizard) > .avonix-cep-launcher{display:flex!important;}" +
    "@keyframes avonix-cep-pop{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}" +
    ".avonix-cep-root--wizard .avonix-cep-panel,.avonix-cep-root--wizard .avonix-cep-panel.is-open{display:flex!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;flex:1 1 auto;min-height:0;border-radius:12px;box-shadow:none;animation:none;}" +
    ".avonix-cep-root--wizard .avonix-cep-launcher,.avonix-cep-root--wizard.is-open > .avonix-cep-launcher{display:none!important;visibility:hidden!important;pointer-events:none!important;width:0!important;height:0!important;overflow:hidden!important;}" +
    ".avonix-cep-root--wizard .avonix-cep-online{display:none!important;}" +
    /* Home */
    ".avonix-cep-home{display:flex;flex-direction:column;flex:1;min-height:0;}" +
    ".avonix-cep-home.is-hidden,.avonix-cep-ai.is-hidden,.avonix-cep-gate.is-hidden,.avonix-cep-agree.is-hidden{display:none!important;}" +
    /* Terms agreement gate */
    ".avonix-cep-agree{display:flex;flex-direction:column;flex:1;min-height:0;background:#fff;}" +
    ".avonix-cep-agree__body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 22px 18px;text-align:center;}" +
    ".avonix-cep-agree__logo{width:72px;height:72px;object-fit:contain;margin:0 0 14px;display:block;}" +
    ".avonix-cep-agree__mark{width:64px;height:64px;margin:0 0 14px;border-radius:16px;background:linear-gradient(135deg,var(--avx-primary-end),var(--avx-primary));display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700;}" +
    ".avonix-cep-agree__brand{margin:0 0 18px;font-size:22px;font-weight:700;letter-spacing:-0.02em;color:var(--avx-ink);font-family:Georgia,'Times New Roman',serif;line-height:1.2;}" +
    ".avonix-cep-agree__intro{margin:0 0 12px;font-size:14.5px;line-height:1.45;color:var(--avx-ink);font-weight:500;}" +
    ".avonix-cep-agree__copy{margin:0;font-size:13.5px;line-height:1.55;color:var(--avx-ink-3);max-width:280px;}" +
    ".avonix-cep-agree__copy a{color:var(--avx-primary);font-weight:600;text-decoration:underline;text-underline-offset:2px;}" +
    ".avonix-cep-agree__actions{display:flex;gap:10px;padding:8px 18px 22px;flex-shrink:0;}" +
    ".avonix-cep-agree__btn{flex:1;min-height:42px;border-radius:999px;border:1.5px solid var(--avx-primary);background:#fff;color:var(--avx-primary);font-size:13.5px;font-weight:600;cursor:pointer;padding:10px 12px;transition:background .15s,color .15s,transform .15s;}" +
    ".avonix-cep-agree__btn:hover{background:color-mix(in srgb,var(--avx-primary) 8%,#fff);transform:translateY(-1px);}" +
    ".avonix-cep-agree__btn.is-primary{background:var(--avx-primary);color:var(--avx-on-primary);}" +
    ".avonix-cep-agree__btn.is-primary:hover{filter:brightness(.95);background:var(--avx-primary);}" +
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
    ".avonix-cep-ai__avatar{width:34px;height:34px;border-radius:9px;overflow:hidden;background:var(--avx-head-soft);border:1px solid var(--avx-head-line);display:flex;align-items:center;justify-content:center;flex:0 0 auto;color:#fff;}" +
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
    ".avonix-cep-bubble--bot{background:var(--avx-bot);color:var(--avx-ink-2);border:1px solid var(--avx-bot-border);border-bottom-left-radius:4px;}" +
    ".avonix-cep-bubble--you{background:var(--avx-head);color:#fff;border-bottom-right-radius:4px;}" +
    ".avonix-cep-bubble--system{background:transparent;border:0;color:var(--avx-muted);font-size:12px;text-align:center;padding:6px;}" +
    ".avonix-cep-bubble--bot a{color:var(--avx-primary);}" +
    ".avonix-cep-bubble--error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;border-bottom-left-radius:4px;}" +
    /* Try asking */
    ".avonix-cep-try{align-self:stretch;margin:2px 0 2px 6px;}" +
    ".avonix-cep-try__label{font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--avx-muted);margin:0 0 8px 2px;}" +
    ".avonix-cep-btns{display:flex;flex-direction:column;gap:8px;}" +
    ".avonix-cep-btn{display:flex;width:100%;align-items:center;gap:10px;text-align:left;font-size:13.5px;font-weight:400;line-height:1.35;color:var(--avx-ink-2);background:var(--avx-surface);border:1px solid var(--avx-border);border-radius:10px;padding:11px 14px;cursor:pointer;transition:border-color .15s,background .15s;}" +
    ".avonix-cep-btn:hover{border-color:var(--avx-primary);background:var(--avx-tint);color:var(--avx-ink-2);}" +
    ".avonix-cep-btn__ico{flex:0 0 auto;width:18px;height:18px;color:var(--avx-primary);display:flex;align-items:center;justify-content:center;}" +
    ".avonix-cep-btn__ico svg{width:16px;height:16px;}" +
    ".avonix-cep-lead{margin-top:8px;border-radius:var(--avx-rl);padding:10px;background:var(--avx-surface);border:1px solid var(--avx-border);max-height:280px;overflow:auto;}" +
    /* Typing */
    ".avonix-cep-typing{align-self:flex-start;display:inline-flex;gap:4px;padding:12px 14px;background:var(--avx-bot);border:1px solid var(--avx-bot-border);border-radius:var(--avx-r);border-bottom-left-radius:4px;}" +
    ".avonix-cep-typing span{width:7px;height:7px;border-radius:50%;background:var(--avx-muted);animation:avonix-cep-bounce 1.2s infinite ease-in-out;}" +
    ".avonix-cep-typing span:nth-child(2){animation-delay:.15s;}" +
    ".avonix-cep-typing span:nth-child(3){animation-delay:.3s;}" +
    "@keyframes avonix-cep-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}" +
    /* Composer */
    ".avonix-cep-form{position:relative;z-index:3;margin:0;padding:10px 12px max(32px,calc(20px + env(safe-area-inset-bottom,0px)));border-top:1px solid var(--avx-border);background:var(--avx-surface);flex:0 0 auto;}" +
    ".avonix-cep-disclaimer{margin:8px 6px 0;font-size:11px;line-height:1.45;color:var(--avx-muted);text-align:center;}" +
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

  function suggestionIcon(idx) {
    var icons = [
      '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M9.5 9.2c.4-1.2 1.4-1.9 2.6-1.9 1.4 0 2.4.9 2.4 2.2 0 1.2-.7 1.8-1.7 2.3-.7.3-1 .7-1 1.5v.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 10.5v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="7.8" r="1" fill="currentColor"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3v18M15.5 7.5c0-1.4-1.6-2.5-3.5-2.5S8.5 6.1 8.5 7.5 10 9.8 12 10.2c2 .4 3.5 1.4 3.5 3s-1.6 2.8-3.5 2.8-3.5-1.1-3.5-2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    ];
    return icons[idx % icons.length];
  }

  /* ---- Root / FAB ---- */
  var root = document.createElement("div");
  root.className =
    "avonix-cep-root" + (surface === "wizard" ? " avonix-cep-root--wizard" : "");
  root.setAttribute("data-avonix", "cep-chat");
  root.setAttribute("data-surface", surface);

  var button = document.createElement("button");
  button.type = "button";
  button.className = "avonix-cep-launcher";
  button.setAttribute("aria-label", theme.launcherLabel || config.label || "Open chat");
  button.setAttribute("aria-expanded", "false");
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
    "px;border:0;border-radius:50%;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0;background:linear-gradient(145deg," +
    primaryEnd +
    " 0%," +
    primary +
    " 100%);color:" +
    onPrimary +
    ";box-shadow:0 6px 24px rgba(0,0,0,.2);overflow:visible;";
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
    '<input type="text" class="avonix-cep-gate__input" id="avonix-cep-name" placeholder="Your name" autocomplete="name"/>' +
    '<input type="tel" class="avonix-cep-gate__input" id="avonix-cep-phone" placeholder="Phone" autocomplete="tel"/>' +
    '<input type="email" class="avonix-cep-gate__input" id="avonix-cep-email" placeholder="Email" autocomplete="email"/>' +
    "</div>" +
    '<div class="avonix-cep-gate__err" id="avonix-cep-gate-err"></div>' +
    '<button type="button" class="avonix-cep-gate__send" id="avonix-cep-gate-send">Send</button>' +
    '<p class="avonix-cep-gate__hint">We typically reply within a few minutes during business hours.</p>' +
    "</div>";
  gateBody.querySelector(".avonix-cep-gate__title").textContent =
    theme.startTitle || "Leave your contact";
  var gateName = gateBody.querySelector("#avonix-cep-name");
  var gatePhone = gateBody.querySelector("#avonix-cep-phone");
  var gateEmail = gateBody.querySelector("#avonix-cep-email");
  var gateErr = gateBody.querySelector("#avonix-cep-gate-err");
  var gateSend = gateBody.querySelector("#avonix-cep-gate-send");
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

  ai.appendChild(aiHead);
  ai.appendChild(log);
  ai.appendChild(form);

  /* ---- Terms agreement (required before chat) ---- */
  var agree = document.createElement("div");
  agree.className = "avonix-cep-agree is-hidden";
  agree.setAttribute("role", "dialog");
  agree.setAttribute("aria-label", "Terms agreement");
  var agreeBody = document.createElement("div");
  agreeBody.className = "avonix-cep-agree__body";
  if (agreementLogo) {
    var logoImg = document.createElement("img");
    logoImg.className = "avonix-cep-agree__logo";
    logoImg.src = String(agreementLogo).replace(/"/g, "");
    logoImg.alt = agreementBrand;
    agreeBody.appendChild(logoImg);
  } else {
    var mark = document.createElement("div");
    mark.className = "avonix-cep-agree__mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = String(agreementBrand).trim().charAt(0).toUpperCase() || "A";
    agreeBody.appendChild(mark);
  }
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
  var agreeActions = document.createElement("div");
  agreeActions.className = "avonix-cep-agree__actions";
  var agreeYes = document.createElement("button");
  agreeYes.type = "button";
  agreeYes.className = "avonix-cep-agree__btn";
  agreeYes.textContent = agreeLabel;
  var agreeNo = document.createElement("button");
  agreeNo.type = "button";
  agreeNo.className = "avonix-cep-agree__btn";
  agreeNo.textContent = disagreeLabel;
  agreeActions.appendChild(agreeYes);
  agreeActions.appendChild(agreeNo);
  agree.appendChild(agreeBody);
  agree.appendChild(agreeActions);

  panel.appendChild(agree);
  panel.appendChild(home);
  panel.appendChild(gate);
  panel.appendChild(ai);
  root.appendChild(panel);
  root.appendChild(button);

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
    try {
      return localStorage.getItem(agreeStorageKey) === "1";
    } catch (e) {
      return false;
    }
  }
  function setAgreed() {
    try {
      localStorage.setItem(agreeStorageKey, "1");
    } catch (e) {}
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

  function appendTryAsking(buttons) {
    var tryBox = document.createElement("div");
    tryBox.className = "avonix-cep-try";
    var lab = document.createElement("div");
    lab.className = "avonix-cep-try__label";
    lab.textContent = "Try asking";
    tryBox.appendChild(lab);
    var btns = document.createElement("div");
    btns.className = "avonix-cep-btns";
    (buttons || []).forEach(function (btn, idx) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "avonix-cep-btn";
      el.innerHTML =
        '<span class="avonix-cep-btn__ico">' +
        suggestionIcon(idx) +
        "</span><span></span>";
      el.lastChild.textContent = btn.label || "OK";
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
    try {
      sessionStorage.setItem("avonix-cep-started", "1");
      if (email) sessionStorage.setItem("avonix-cep-email", email);
      if (name) sessionStorage.setItem("avonix-cep-name", name);
      if (phone) sessionStorage.setItem("avonix-cep-phone", phone);
    } catch (e) {}
    showAi();
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
    if (agreementRequired && !hasAgreed()) {
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
    showGreeting();
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
    var vw = window.innerWidth || document.documentElement.clientWidth || 360;
    var vh = window.innerHeight || document.documentElement.clientHeight || 640;
    var bottomClear = ctaBottomClearance();
    // Use configured outer size only — never a higher floor, or same % drifts vs a11y/lang.
    var bw = launcherPx;
    var bh = launcherPx;

    root.style.left = "auto";
    root.style.right = "auto";
    root.style.top = "auto";
    root.style.bottom = "auto";

    if (useFree) {
      // Same math as studio screen-placement pointFromPlacement / a11y / languages:
      // % of remaining space (viewport − launcher).
      var maxX = Math.max(0, vw - bw);
      var maxY = Math.max(0, vh - bh);
      var x = Math.round((freeX / 100) * maxX);
      var y = Math.round((freeY / 100) * maxY);
      x = Math.min(vw - bw, Math.max(0, x));
      y = Math.min(vh - bh, Math.max(0, y));
      var openUp = freeY >= 45;
      var openLeft = freeX >= 50;
      root.style.flexDirection = openUp ? "column-reverse" : "column";
      root.style.alignItems = openLeft ? "flex-end" : "flex-start";
      root.style.left = x + "px";
      if (openUp) {
        // Pin launcher bottom so the chat panel opens upward from the FAB.
        root.style.top = "auto";
        root.style.bottom = Math.max(0, vh - (y + bh)) + "px";
      } else {
        root.style.bottom = "auto";
        root.style.top = y + "px";
      }
      return;
    }

    var edgeOy = edgeY === "bottom" ? Math.max(oy, bottomClear) : oy;
    root.style.flexDirection = edgeY === "bottom" ? "column-reverse" : "column";
    root.style.alignItems = edgeX === "left" ? "flex-start" : "flex-end";
    root.style[edgeY] = edgeOy + "px";
    root.style[edgeX] = ox + "px";
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
  agreeYes.addEventListener("click", function () {
    setAgreed();
    proceedAfterAgreement();
  });
  agreeNo.addEventListener("click", function () {
    setOpen(false);
  });
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
      root.className = "avonix-cep-root avonix-cep-root--wizard";
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
    // Shortcode / embed host on the page → always wizard (no floating bubble).
    var host = findWizardHost();
    if (host) {
      surface = "wizard";
      config.surface = "wizard";
      root.className = "avonix-cep-root avonix-cep-root--wizard";
      root.setAttribute("data-surface", "wizard");
      if (!host.id) host.id = "avonix-chat-wizard";
      config.mount = "#" + host.id;
      mountInto(host);
      return;
    }
    if (surface === "wizard") {
      // Config asked for wizard but no mount — fall back to floating bubble.
      surface = "bubble";
      root.className = "avonix-cep-root";
      root.setAttribute("data-surface", "bubble");
    }
    mountInto(document.body);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.AvonixCep = window.AvonixCep || {};
  window.AvonixCep.open = function () {
    setOpen(true);
  };
  window.AvonixCep.close = function () {
    setOpen(false);
  };
})();
