/*
 * Avonix CEP chat widget (ADR-011 P1)
 * Bubble + inline wizard · blocks · lead_form · transfer · poll · stream · sounds
 *
 * No build step. Talks only to WP admin-ajax (connector key stays server-side).
 */
(function () {
  "use strict";

  var config = window.AVONIX_CHAT || {};
  var proxy = config.proxy;
  if (!proxy) return;

  var theme = config.theme || {};
  var modules = config.modules || {};
  var primary = theme.primaryColor || config.color || "#ff6600";
  function parseHex(h) {
    h = String(h || "").replace("#", "").trim();
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    if (h.length !== 6) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }
  function mixHex(hex, toward, t) {
    var a = parseHex(hex) || { r: 255, g: 102, b: 0 };
    var b = parseHex(toward) || { r: 255, g: 255, b: 255 };
    function ch(x, y) { return Math.round(x + (y - x) * t); }
    function hx(n) { var s = n.toString(16); return s.length < 2 ? "0" + s : s; }
    return "#" + hx(ch(a.r, b.r)) + hx(ch(a.g, b.g)) + hx(ch(a.b, b.b));
  }
  var primaryEnd = theme.primaryColorEnd || mixHex(primary, "#ffffff", 0.28);
  var primarySoft = mixHex(primary, "#ffffff", 0.88);
  var linkAccent = theme.linkColor || mixHex(primary, "#1d4ed8", 0.35);
  var launcherPx = Math.max(
    48,
    (Number(theme.launcherIconSize) || 22) + 2 * (Number(theme.launcherPadding) || 14)
  );
  var launcherIcon = theme.launcherIcon || "dots"; // dots | compose
  var statusText = theme.statusText || "Online · typically replies in a few minutes";
  var agentName = theme.agentName || config.title || "Live chat";
  var privacyUrl = theme.privacyUrl || "";
  var preChatOn = theme.preChatEnabled !== false;
  var startHero = theme.startHeroImageUrl || "";
  var rawPos = String(theme.position || "bottom_right").toLowerCase().replace(/-/g, "_");
  var edgeX = rawPos.indexOf("left") >= 0 ? "left" : "right";
  var edgeY = rawPos.indexOf("top") >= 0 ? "top" : "bottom";
  var ox = theme.offsetX != null ? theme.offsetX : 20;
  var oy = theme.offsetY != null ? theme.offsetY : 20;
  var freeX =
    theme.leftPercent != null && isFinite(Number(theme.leftPercent))
      ? Math.min(100, Math.max(0, Number(theme.leftPercent)))
      : null;
  var freeY =
    theme.topPercent != null && isFinite(Number(theme.topPercent))
      ? Math.min(100, Math.max(0, Number(theme.topPercent)))
      : null;
  var useFree = freeX != null && freeY != null;
  var z = theme.zIndex || 2147483000;
  var radius = theme.radius != null ? theme.radius : 16;
  var deskW = theme.desktopWidth || "min(380px, calc(100vw - 32px))";
  var deskH = theme.desktopHeight || "min(560px, calc(100vh - 120px))";
  var mobW = theme.mobileWidth || "calc(100vw - 24px)";
  var mobH = theme.mobileHeight || "min(70vh, calc(100dvh - 96px))";
  var surface = config.surface || "bubble";
  var soundsOn = modules.sounds !== false;
  var streamingOn = modules.streaming !== false;

  var conversationId = null;
  var lastSeenAt = null;
  var handoffStatus = "ai";
  var open = false;
  var busy = false;
  var pollTimer = null;
  var seenIds = {};

  // Safe corner CSS first. Free % is applied in placeRoot() after measuring the
  // launcher — studio percents mean share of (viewport − launcher), not raw CSS %.
  var alignEnd = useFree ? freeX >= 50 : edgeX === "right";
  var stackUp = useFree ? freeY >= 45 : edgeY === "bottom";
  var rootPosCss = edgeY + ":" + oy + "px;" + edgeX + ":" + ox + "px;";

  var style = document.createElement("style");
  style.textContent =
    ":root{--avx-cep-primary:" + primary + ";--avx-cep-primary-end:" + primaryEnd + ";--avx-cep-soft:" + primarySoft + ";--avx-cep-link:" + linkAccent + ";--avx-cep-text:" + (theme.textColor || "#0f172a") + ";--avx-cep-muted:#64748b;--avx-cep-bg:" + (theme.backgroundColor || "#ffffff") + ";--avx-cep-panel-radius:" + (theme.radius != null ? theme.radius : 22) + "px;--avx-cep-launcher:" + launcherPx + "px;}" +
    ".avonix-cep-root{position:fixed;z-index:" + z + ";" + rootPosCss + "font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:" + (stackUp ? "column-reverse" : "column") + ";align-items:" + (alignEnd ? "flex-end" : "flex-start") + ";gap:14px;max-width:calc(100vw - 16px);}" +
    ".avonix-cep-root--wizard{position:relative;inset:auto;z-index:1;width:100%;max-width:100%;align-items:stretch;bottom:auto;top:auto;left:auto;right:auto;flex-direction:column;}" +
    /* Circular gradient launcher */
    ".avonix-cep-launcher{cursor:pointer;border:0;width:var(--avx-cep-launcher);height:var(--avx-cep-launcher);padding:0;border-radius:50%;color:#fff;background:linear-gradient(145deg,var(--avx-cep-primary-end) 0%,var(--avx-cep-primary) 100%);box-shadow:0 10px 28px color-mix(in srgb,var(--avx-cep-primary) 38%,transparent),0 2px 6px rgba(15,23,42,.12);position:relative;display:grid;place-items:center;transition:transform .18s ease,box-shadow .18s ease;}" +
    ".avonix-cep-launcher:hover{transform:scale(1.05);}" +
    ".avonix-cep-launcher:focus-visible{outline:3px solid var(--avx-cep-primary);outline-offset:3px;}" +
    ".avonix-cep-launcher__glyph{width:54%;height:54%;display:block;}" +
    (theme.pulse
      ? ".avonix-cep-launcher::after{content:'';position:absolute;inset:-5px;border-radius:50%;border:2px solid var(--avx-cep-primary);opacity:.4;animation:avonix-cep-pulse 1.8s ease infinite;pointer-events:none;}" +
        "@keyframes avonix-cep-pulse{0%{transform:scale(1);opacity:.4}70%{transform:scale(1.18);opacity:0}100%{opacity:0}}"
      : "") +
    ".avonix-cep-online{position:absolute;top:4px;right:4px;width:12px;height:12px;border-radius:50%;background:#22c55e;border:2px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,.06);}" +
    /* Panel card */
    ".avonix-cep-panel{display:none;flex-direction:column;width:" + deskW + ";height:" + deskH + ";max-width:min(100%,calc(100vw - 24px));max-height:min(620px,calc(100dvh - 110px));background:var(--avx-cep-bg);color:var(--avx-cep-text);border-radius:var(--avx-cep-panel-radius);overflow:hidden;box-shadow:0 24px 64px rgba(15,23,42,.22),0 2px 8px rgba(15,23,42,.06);border:1px solid rgba(15,23,42,.06);}" +
    ".avonix-cep-root--wizard .avonix-cep-panel{display:flex;width:100%;height:min(640px,70vh);max-width:100%;box-shadow:none;}" +
    ".avonix-cep-root--wizard .avonix-cep-launcher{display:none;}" +
    /* Header */
    ".avonix-cep-header{padding:12px 14px;background:#fff;border-bottom:1px solid #eef2f7;display:flex;align-items:center;gap:10px;flex-shrink:0;}" +
    ".avonix-cep-icon-btn{width:34px;height:34px;border-radius:50%;border:0;background:#0f172a;color:#fff;display:grid;place-items:center;cursor:pointer;flex-shrink:0;padding:0;}" +
    ".avonix-cep-icon-btn--ghost{background:transparent;color:#64748b;}" +
    ".avonix-cep-icon-btn--ghost:hover{background:#f1f5f9;color:#0f172a;}" +
    ".avonix-cep-avatar{width:40px;height:40px;border-radius:50%;object-fit:cover;background:var(--avx-cep-soft);flex-shrink:0;}" +
    ".avonix-cep-header__meta{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px;}" +
    ".avonix-cep-header__name{font-size:15px;font-weight:700;line-height:1.2;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".avonix-cep-header__status{font-size:12px;color:var(--avx-cep-muted);display:flex;align-items:center;gap:5px;line-height:1.2;}" +
    ".avonix-cep-header__status-dot{width:8px;height:8px;border-radius:50%;background:var(--avx-cep-primary);flex-shrink:0;}" +
    /* Log / bubbles */
    ".avonix-cep-log{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:10px;background:#f4f6f9;}" +
    ".avonix-cep-day{align-self:center;font-size:11px;font-weight:600;color:#64748b;background:#e8edf5;padding:4px 10px;border-radius:999px;margin-bottom:4px;}" +
    ".avonix-cep-row{display:flex;gap:8px;align-items:flex-end;}" +
    ".avonix-cep-row--you{flex-direction:row-reverse;}" +
    ".avonix-cep-row .avonix-cep-avatar{width:28px;height:28px;}" +
    ".avonix-cep-bubble{max-width:82%;padding:11px 14px;border-radius:18px;font-size:14px;line-height:1.45;word-break:break-word;box-shadow:0 1px 2px rgba(15,23,42,.04);}" +
    ".avonix-cep-bubble--bot{align-self:flex-start;background:#fff;border:1px solid #e8edf5;color:#0f172a;border-bottom-left-radius:6px;}" +
    ".avonix-cep-bubble--you{align-self:flex-end;background:var(--avx-cep-primary);color:#fff;border-bottom-right-radius:6px;}" +
    ".avonix-cep-bubble--system{align-self:center;background:transparent;border:0;box-shadow:none;color:#64748b;font-size:12px;text-align:center;max-width:94%;}" +
    ".avonix-cep-meta{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#94a3b8;margin:2px 0 0 36px;}" +
    ".avonix-cep-bubble a{color:inherit;text-decoration:underline;}" +
    ".avonix-cep-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}" +
    ".avonix-cep-btn{border:1px solid color-mix(in srgb,var(--avx-cep-primary) 35%,#e2e8f0);background:#fff;color:var(--avx-cep-primary);border-radius:999px;padding:7px 12px;font-size:12px;font-weight:600;cursor:pointer;}" +
    ".avonix-cep-btn:hover{background:var(--avx-cep-soft);}" +
    ".avonix-cep-lead{margin-top:8px;border:1px solid #e6e9f0;border-radius:14px;padding:10px;background:#fafbfc;max-height:320px;overflow:auto;}" +
    /* Composer */
    ".avonix-cep-form{display:flex;align-items:center;gap:8px;padding:12px 12px 14px;border-top:1px solid #eef2f7;background:#fff;flex-shrink:0;}" +
    ".avonix-cep-input-wrap{flex:1;min-width:0;display:flex;align-items:center;gap:6px;background:#f4f6f9;border-radius:999px;padding:4px 6px 4px 14px;border:1px solid #e8edf5;}" +
    ".avonix-cep-input{flex:1;min-width:0;border:0;background:transparent;padding:10px 4px;font-size:14px;outline:none;color:var(--avx-cep-text);}" +
    ".avonix-cep-send{cursor:pointer;border:0;border-radius:50%;width:40px;height:40px;display:grid;place-items:center;font-size:0;color:#fff;background:var(--avx-cep-primary);flex-shrink:0;box-shadow:0 4px 12px color-mix(in srgb,var(--avx-cep-primary) 35%,transparent);}" +
    ".avonix-cep-send svg{width:18px;height:18px;}" +
    /* Start / pre-chat gate */
    ".avonix-cep-gate{display:none;flex-direction:column;flex:1;min-height:0;padding:18px 22px 22px;background:#fff;position:relative;}" +
    ".avonix-cep-gate.is-on{display:flex;}" +
    ".avonix-cep-gate__close{position:absolute;top:12px;right:12px;}" +
    ".avonix-cep-gate__hero{display:flex;align-items:flex-end;justify-content:center;gap:18px;min-height:110px;margin:8px 0 18px;}" +
    ".avonix-cep-gate__hero img{max-height:96px;max-width:100%;object-fit:contain;}" +
    ".avonix-cep-gate__title{margin:0 0 18px;font-size:26px;font-weight:800;letter-spacing:-.03em;color:#0f172a;text-align:center;}" +
    ".avonix-cep-gate__field{margin:0 0 14px;}" +
    ".avonix-cep-gate__label{display:block;font-size:13px;color:#94a3b8;margin-bottom:4px;}" +
    ".avonix-cep-gate__email{width:100%;border:0;border-bottom:1.5px solid #cbd5e1;padding:8px 0;font-size:15px;outline:none;background:transparent;color:#0f172a;box-sizing:border-box;}" +
    ".avonix-cep-gate__email:focus{border-bottom-color:var(--avx-cep-primary);}" +
    ".avonix-cep-gate__privacy{font-size:12px;line-height:1.45;color:#64748b;margin:0 0 16px;}" +
    ".avonix-cep-gate__privacy a{color:var(--avx-cep-link);font-weight:600;text-decoration:none;}" +
    ".avonix-cep-gate__check{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:#475569;margin:0 0 10px;cursor:pointer;}" +
    ".avonix-cep-gate__check input{margin-top:2px;accent-color:var(--avx-cep-primary);}" +
    ".avonix-cep-gate__go{margin-top:auto;width:100%;border:0;border-radius:12px;padding:12px 16px;font-size:15px;font-weight:700;color:#fff;background:var(--avx-cep-primary);cursor:pointer;box-shadow:0 8px 20px color-mix(in srgb,var(--avx-cep-primary) 30%,transparent);}" +
    ".avonix-cep-chat{display:flex;flex-direction:column;flex:1;min-height:0;}" +
    ".avonix-cep-chat.is-hidden{display:none;}" +
    "@media (max-width:640px){.avonix-cep-root:not(.avonix-cep-root--wizard) .avonix-cep-panel{width:" + mobW + ";height:" + mobH + ";border-radius:18px;}}";
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
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
    );
  }

  function avatarFor(who) {
    if (who === "you") return null;
    var url =
      who === "agent"
        ? config.agent_avatar_url || config.bot_avatar_url
        : config.bot_avatar_url;
    if (!url) return null;
    var img = document.createElement("img");
    img.className = "avonix-cep-avatar";
    img.src = url;
    img.alt = "";
    return img;
  }

  function handleButton(btn) {
    if (btn.action === "open_url" && btn.value) {
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
    var row = document.createElement("div");
    row.className =
      "avonix-cep-row" + (who === "you" ? " avonix-cep-row--you" : "");
    var av = avatarFor(who);
    if (av) row.appendChild(av);

    var wrap = document.createElement("div");
    var isSys = (blocks || []).some(function (b) {
      return b && b.type === "system";
    });
    wrap.className =
      "avonix-cep-bubble " +
      (who === "you"
        ? "avonix-cep-bubble--you"
        : isSys
          ? "avonix-cep-bubble--system"
          : "avonix-cep-bubble--bot");

    (blocks || []).forEach(function (b) {
      if (!b || !b.type) return;
      if (b.type === "plain_text" || b.type === "markdown" || b.type === "system") {
        var p = document.createElement("div");
        p.innerHTML = linkify(b.text || "");
        wrap.appendChild(p);
      } else if (b.type === "buttons" && b.buttons) {
        var btnRow = document.createElement("div");
        btnRow.className = "avonix-cep-btns";
        b.buttons.forEach(function (btn) {
          var el = document.createElement("button");
          el.type = "button";
          el.className = "avonix-cep-btn";
          el.textContent = btn.label || "OK";
          el.addEventListener("click", function () {
            handleButton(btn);
          });
          btnRow.appendChild(el);
        });
        wrap.appendChild(btnRow);
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
        if (html) {
          box.innerHTML = (b.title ? box.innerHTML : "") + html;
        } else {
          var miss = document.createElement("div");
          miss.textContent = "Form unavailable.";
          box.appendChild(miss);
        }
        wrap.appendChild(box);
      }
    });

    row.appendChild(wrap);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    if (opts.sound && who !== "you") playPing();
  }

  function bubble(text, who, opts) {
    renderBlocks([{ type: "plain_text", text: text }], who, opts);
  }

  function appendStreamingBubble() {
    var row = document.createElement("div");
    row.className = "avonix-cep-row";
    var av = avatarFor("bot");
    if (av) row.appendChild(av);
    var wrap = document.createElement("div");
    wrap.className = "avonix-cep-bubble avonix-cep-bubble--bot";
    var p = document.createElement("div");
    wrap.appendChild(p);
    row.appendChild(wrap);
    log.appendChild(row);
    return { row: row, textEl: p };
  }

  var root = document.createElement("div");
  root.className =
    "avonix-cep-root" + (surface === "wizard" ? " avonix-cep-root--wizard" : "");
  root.setAttribute("data-avonix", "cep-chat");
  root.setAttribute("data-surface", surface);

  function launcherGlyphSvg() {
    if (launcherIcon === "compose") {
      return '<svg class="avonix-cep-launcher__glyph" viewBox="0 0 48 48" aria-hidden="true"><path fill="#fff" d="M10 12c0-2.2 1.8-4 4-4h20c2.2 0 4 1.8 4 4v16c0 2.2-1.8 4-4 4H22l-8 8v-8h-0c-2.2 0-4-1.8-4-4V12z"/><path fill="currentColor" d="M28.2 16.4l3.4 3.4-9.2 9.2H19v-3.4l9.2-9.2zm4.1-1.7l1.7 1.7c.5.5.5 1.3 0 1.8l-1.5 1.5-3.4-3.4 1.5-1.5c.5-.5 1.3-.5 1.7-.1z"/></svg>';
    }
    return '<svg class="avonix-cep-launcher__glyph" viewBox="0 0 48 48" aria-hidden="true"><path fill="#fff" d="M10 12c0-2.2 1.8-4 4-4h20c2.2 0 4 1.8 4 4v16c0 2.2-1.8 4-4 4H22l-8 8v-8h-0c-2.2 0-4-1.8-4-4V12z"/><circle cx="18" cy="20" r="2.4" fill="currentColor"/><circle cx="24" cy="20" r="2.4" fill="currentColor"/><circle cx="30" cy="20" r="2.4" fill="currentColor"/></svg>';
  }

  function defaultHeroSvg() {
    return '<svg width="160" height="90" viewBox="0 0 160 90" fill="none" aria-hidden="true"><path d="M18 58l28-18 10 6-8 20-12-4 6-10-24 6z" stroke="#0f172a" stroke-width="1.6" stroke-linejoin="round"/><path d="M46 40c18-14 38-18 54-10" stroke="#0f172a" stroke-width="1.4" stroke-dasharray="3 4" fill="none"/><path d="M108 28h28v36h-18l-10 10V28z" stroke="#0f172a" stroke-width="1.6" stroke-linejoin="round"/><path d="M116 40h12M116 48h12M116 56h8" stroke="#0f172a" stroke-width="1.4" stroke-linecap="round"/></svg>';
  }

  var button = document.createElement("button");
  button.type = "button";
  button.className = "avonix-cep-launcher";
  button.setAttribute("aria-label", theme.launcherLabel || config.label || "Open live chat");
  button.style.color = primary;
  button.innerHTML = launcherGlyphSvg();
  if (theme.onlineIndicator !== false) {
    var online = document.createElement("span");
    online.className = "avonix-cep-online";
    online.setAttribute("aria-hidden", "true");
    button.appendChild(online);
  }

  var panel = document.createElement("div");
  panel.className = "avonix-cep-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", config.title || "Chat");

  /* ---- Start chat gate ---- */
  var gate = document.createElement("div");
  gate.className = "avonix-cep-gate";
  var gateClose = document.createElement("button");
  gateClose.type = "button";
  gateClose.className = "avonix-cep-icon-btn avonix-cep-icon-btn--ghost avonix-cep-gate__close";
  gateClose.setAttribute("aria-label", "Close");
  gateClose.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var gateHero = document.createElement("div");
  gateHero.className = "avonix-cep-gate__hero";
  if (startHero) {
    var heroImg = document.createElement("img");
    heroImg.src = startHero;
    heroImg.alt = "";
    gateHero.appendChild(heroImg);
  } else {
    gateHero.innerHTML = defaultHeroSvg();
  }
  var gateTitle = document.createElement("h2");
  gateTitle.className = "avonix-cep-gate__title";
  gateTitle.textContent = theme.startTitle || "Start chat";
  var gateField = document.createElement("div");
  gateField.className = "avonix-cep-gate__field";
  gateField.innerHTML = '<label class="avonix-cep-gate__label" for="avonix-cep-email">Email</label>';
  var gateEmail = document.createElement("input");
  gateEmail.type = "email";
  gateEmail.id = "avonix-cep-email";
  gateEmail.className = "avonix-cep-gate__email";
  gateEmail.placeholder = "you@example.com";
  gateEmail.autocomplete = "email";
  gateField.appendChild(gateEmail);
  var gatePrivacy = document.createElement("p");
  gatePrivacy.className = "avonix-cep-gate__privacy";
  if (privacyUrl) {
    gatePrivacy.innerHTML = 'We need to process your personal data in line with our <a href="' + String(privacyUrl).replace(/"/g, "") + '" target="_blank" rel="noopener">Privacy Policy</a>.';
  } else {
    gatePrivacy.textContent = "We use your email only to continue this conversation.";
  }
  var gateAgree = document.createElement("label");
  gateAgree.className = "avonix-cep-gate__check";
  gateAgree.innerHTML = '<input type="checkbox" id="avonix-cep-agree"> <span>I agree</span>';
  var gateRemember = document.createElement("label");
  gateRemember.className = "avonix-cep-gate__check";
  gateRemember.innerHTML = '<input type="checkbox" id="avonix-cep-remember" checked> <span>This is a private computer, remember me</span>';
  var gateGo = document.createElement("button");
  gateGo.type = "button";
  gateGo.className = "avonix-cep-gate__go";
  gateGo.textContent = theme.startButtonLabel || "Continue to chat";
  gate.appendChild(gateClose);
  gate.appendChild(gateHero);
  gate.appendChild(gateTitle);
  gate.appendChild(gateField);
  gate.appendChild(gatePrivacy);
  gate.appendChild(gateAgree);
  gate.appendChild(gateRemember);
  gate.appendChild(gateGo);

  /* ---- Chat surface ---- */
  var chatSurface = document.createElement("div");
  chatSurface.className = "avonix-cep-chat is-hidden";

  var header = document.createElement("div");
  header.className = "avonix-cep-header";
  var backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "avonix-cep-icon-btn";
  backBtn.setAttribute("aria-label", "Minimize chat");
  backBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  header.appendChild(backBtn);
  var avatarUrl = config.bot_avatar_url || config.agent_avatar_url || theme.bubbleImageUrl || "";
  if (avatarUrl) {
    var hav = document.createElement("img");
    hav.className = "avonix-cep-avatar";
    hav.src = avatarUrl;
    hav.alt = "";
    header.appendChild(hav);
  } else {
    var avFallback = document.createElement("div");
    avFallback.className = "avonix-cep-avatar";
    avFallback.style.display = "grid";
    avFallback.style.placeItems = "center";
    avFallback.style.fontWeight = "800";
    avFallback.style.color = primary;
    avFallback.textContent = (agentName || "A").slice(0, 1).toUpperCase();
    header.appendChild(avFallback);
  }
  var meta = document.createElement("div");
  meta.className = "avonix-cep-header__meta";
  var nameEl = document.createElement("div");
  nameEl.className = "avonix-cep-header__name";
  nameEl.textContent = agentName;
  var statusEl = document.createElement("div");
  statusEl.className = "avonix-cep-header__status";
  statusEl.innerHTML = '<span class="avonix-cep-header__status-dot" aria-hidden="true"></span><span></span>';
  statusEl.lastChild.textContent = statusText;
  meta.appendChild(nameEl);
  meta.appendChild(statusEl);
  header.appendChild(meta);
  var menuBtn = document.createElement("button");
  menuBtn.type = "button";
  menuBtn.className = "avonix-cep-icon-btn avonix-cep-icon-btn--ghost";
  menuBtn.setAttribute("aria-label", "Close");
  menuBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 8h14M5 12h14M5 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  header.appendChild(menuBtn);

  var log = document.createElement("div");
  log.className = "avonix-cep-log";
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");

  var form = document.createElement("form");
  form.className = "avonix-cep-form";
  var inputWrap = document.createElement("div");
  inputWrap.className = "avonix-cep-input-wrap";
  var input = document.createElement("input");
  input.type = "text";
  input.className = "avonix-cep-input";
  input.placeholder = config.placeholder || theme.placeholder || "Write a reply…";
  input.setAttribute("aria-label", "Your message");
  inputWrap.appendChild(input);
  var send = document.createElement("button");
  send.type = "submit";
  send.className = "avonix-cep-send";
  send.setAttribute("aria-label", "Send");
  send.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  form.appendChild(inputWrap);
  form.appendChild(send);

  chatSurface.appendChild(header);
  chatSurface.appendChild(log);
  chatSurface.appendChild(form);
  panel.appendChild(gate);
  panel.appendChild(chatSurface);
  root.appendChild(panel);
  root.appendChild(button);

  var visitorEmail = "";
  try {
    visitorEmail = sessionStorage.getItem("avonix-cep-email") || "";
  } catch (e) {}

  function hasStarted() {
    if (!preChatOn) return true;
    try {
      return sessionStorage.getItem("avonix-cep-started") === "1";
    } catch (e2) {
      return false;
    }
  }

  function showGate() {
    gate.classList.add("is-on");
    chatSurface.classList.add("is-hidden");
    if (visitorEmail) gateEmail.value = visitorEmail;
  }

  function showChat() {
    gate.classList.remove("is-on");
    chatSurface.classList.remove("is-hidden");
    showGreeting();
    setTimeout(function () { input.focus(); }, 40);
    startPoll();
  }

  function enterChatFromGate() {
    var agree = gate.querySelector("#avonix-cep-agree");
    if (agree && !agree.checked) {
      agree.focus();
      return;
    }
    visitorEmail = (gateEmail.value || "").trim();
    try {
      sessionStorage.setItem("avonix-cep-started", "1");
      if (gate.querySelector("#avonix-cep-remember") && gate.querySelector("#avonix-cep-remember").checked && visitorEmail) {
        sessionStorage.setItem("avonix-cep-email", visitorEmail);
      }
    } catch (e3) {}
    showChat();
  }

  function showGreeting() {
    if (log.childNodes.length) return;
    var day = document.createElement("div");
    day.className = "avonix-cep-day";
    day.textContent = "Today";
    log.appendChild(day);
    if (config.greeting) bubble(config.greeting, "bot");
    var qr = config.quick_replies || [];
    if (qr.length) {
      renderBlocks(
        [
          {
            type: "buttons",
            buttons: qr,
          },
        ],
        "bot",
      );
    }
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
          if (m.blocks && m.blocks.length) {
            renderBlocks(m.blocks, who, { sound: true });
          } else {
            bubble(m.body || "", who, { sound: true });
          }
        });
      })
      .catch(function () {});
  }

  function applyDone(data) {
    if (data && data.conversation_id) conversationId = data.conversation_id;
    if (data && data.handoff_status) handoffStatus = data.handoff_status;
    // Avoid replaying AI/system messages we already rendered from this turn.
    lastSeenAt = new Date().toISOString();
    if (data && data.blocks && data.blocks.length) {
      renderBlocks(data.blocks, "bot", { sound: true });
    } else {
      bubble(
        (data && (data.reply || data.message)) || "Sorry — try again.",
        "bot",
        { sound: true },
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
      fetch(proxy, {
        method: "POST",
        body: streamBody,
        credentials: "same-origin",
      })
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
        input.focus();
      });
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

  /**
   * Place the launcher using studio semantics: percent of remaining space
   * (viewport − launcher), so 100% stays fully on-screen. Matches Languages.
   */
  function placeRoot() {
    if (surface === "wizard") return;
    var vw = window.innerWidth || document.documentElement.clientWidth || 360;
    var vh = window.innerHeight || document.documentElement.clientHeight || 640;
    var bottomClear = ctaBottomClearance();
    var bw = Math.max(button.offsetWidth || 0, 56);
    var bh = Math.max(button.offsetHeight || 0, 48);
    var margin = 8;

    root.style.left = "auto";
    root.style.right = "auto";
    root.style.top = "auto";
    root.style.bottom = "auto";

    if (useFree) {
      var maxX = Math.max(0, vw - bw - margin * 2);
      var maxY = Math.max(0, vh - bh - bottomClear - margin);
      var x = Math.round((freeX / 100) * maxX) + margin;
      var y = Math.round((freeY / 100) * maxY) + margin;
      x = Math.min(vw - bw - margin, Math.max(margin, x));
      y = Math.min(vh - bh - bottomClear, Math.max(margin, y));

      var openUp = freeY >= 45;
      var openLeft = freeX >= 50;
      root.style.flexDirection = openUp ? "column-reverse" : "column";
      root.style.alignItems = openLeft ? "flex-end" : "flex-start";

      if (openUp) {
        // Pin launcher bottom edge so the panel grows upward when opened.
        root.style.left = x + "px";
        root.style.bottom = Math.max(bottomClear, vh - (y + bh)) + "px";
      } else {
        root.style.left = x + "px";
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
    panel.style.display = open ? "flex" : "none";
    button.setAttribute("aria-expanded", open ? "true" : "false");
    placeRoot();
    if (open) {
      if (hasStarted()) showChat();
      else showGate();
    }
  }

  button.addEventListener("click", function () {
    setOpen(!open);
  });
  gateClose.addEventListener("click", function () { setOpen(false); });
  backBtn.addEventListener("click", function () { setOpen(false); });
  menuBtn.addEventListener("click", function () { setOpen(false); });
  gateGo.addEventListener("click", enterChatFromGate);
  gateEmail.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      enterChatFromGate();
    }
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var text = (input.value || "").trim();
    if (!text) return;
    input.value = "";
    sendMessage(text, null);
  });

  function mountInto(target) {
    if (surface === "wizard") {
      target.appendChild(root);
      open = true;
      panel.style.display = "flex";
      showChat();
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

  function boot() {
    if (surface === "wizard") {
      var host =
        (config.mount && document.querySelector(config.mount)) ||
        document.querySelector("[data-avonix-chat-wizard]") ||
        document.getElementById("avonix-chat-wizard");
      if (host) {
        mountInto(host);
        return;
      }
    }
    mountInto(document.body);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Allow a second wizard instance via shortcode without bubble
  window.AvonixCep = window.AvonixCep || {};
  window.AvonixCep.mountWizard = function (el, override) {
    var cfg = Object.assign({}, config, override || {}, { surface: "wizard" });
    window.AVONIX_CHAT = cfg;
    // Reload script path is already executed; clone by re-bootstrapping is hard.
    // Shortcode injects its own config before this script when surface=wizard.
  };
  window.AvonixCep.open = function () {
    setOpen(true);
  };
  window.AvonixCep.close = function () {
    setOpen(false);
  };
})();
