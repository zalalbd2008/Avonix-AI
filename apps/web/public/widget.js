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
  var launcherIcon = theme.launcherIcon || "compose"; // compose | dots — match reference FABs
  var statusText = theme.statusText || "A few minutes";
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
  var radius = theme.radius != null ? theme.radius : 32;
  var deskW = theme.desktopWidth || "min(360px, calc(100vw - 28px))";
  var deskH = theme.desktopHeight || "min(600px, calc(100vh - 100px))";
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
    ":root{--avx-cep-primary:" + primary + ";--avx-cep-primary-end:" + primaryEnd + ";--avx-cep-soft:" + primarySoft + ";--avx-cep-link:" + linkAccent + ";--avx-cep-text:" + (theme.textColor || "#1a1a1a") + ";--avx-cep-muted:#9aa3af;--avx-cep-bg:#f7f7f8;--avx-cep-panel-radius:" + radius + "px;--avx-cep-launcher:" + launcherPx + "px;}" +
    ".avonix-cep-root{position:fixed;z-index:" + z + ";" + rootPosCss + "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;display:flex;flex-direction:" + (stackUp ? "column-reverse" : "column") + ";align-items:" + (alignEnd ? "flex-end" : "flex-start") + ";gap:14px;max-width:calc(100vw - 16px);}" +
    ".avonix-cep-root--wizard{position:relative;inset:auto;z-index:1;width:100%;max-width:100%;align-items:stretch;bottom:auto;top:auto;left:auto;right:auto;flex-direction:column;}" +
    /* FAB — circular primary gradient, soft shadow */
    ".avonix-cep-launcher{cursor:pointer;border:0;width:var(--avx-cep-launcher);height:var(--avx-cep-launcher);padding:0;border-radius:50%;color:var(--avx-cep-primary);background:linear-gradient(135deg,var(--avx-cep-primary-end) 0%,var(--avx-cep-primary) 100%);box-shadow:0 8px 24px rgba(15,23,42,.18);position:relative;display:grid;place-items:center;transition:transform .15s ease;}" +
    ".avonix-cep-launcher:hover{transform:translateY(-1px) scale(1.03);}" +
    ".avonix-cep-launcher__glyph{width:56%;height:56%;display:block;}" +
    (theme.pulse !== false
      ? ".avonix-cep-launcher::after{content:'';position:absolute;inset:-6px;border-radius:50%;border:2px solid var(--avx-cep-primary);opacity:.35;animation:avonix-cep-pulse 1.9s ease infinite;pointer-events:none;}" +
        "@keyframes avonix-cep-pulse{0%{transform:scale(1);opacity:.35}70%{transform:scale(1.2);opacity:0}100%{opacity:0}}"
      : "") +
    ".avonix-cep-online{display:none!important;}" +
    /* Panel — soft card, large radius */
    ".avonix-cep-panel{display:none;flex-direction:column;width:" + deskW + ";height:" + deskH + ";max-width:min(100%,calc(100vw - 24px));max-height:min(640px,calc(100dvh - 96px));background:#fff;color:var(--avx-cep-text);border-radius:var(--avx-cep-panel-radius);overflow:hidden;box-shadow:0 20px 50px rgba(15,23,42,.18);border:1px solid rgba(15,23,42,.06);}" +
    ".avonix-cep-root--wizard .avonix-cep-panel{display:flex;width:100%;height:min(640px,70vh);max-width:100%;box-shadow:none;}" +
    ".avonix-cep-root--wizard .avonix-cep-launcher{display:none;}" +
    /* Header — white, avatar, name, purple status icon + short text */
    ".avonix-cep-header{padding:14px 14px 12px;background:#fff;display:flex;align-items:center;gap:10px;flex-shrink:0;}" +
    ".avonix-cep-icon-btn{width:36px;height:36px;border-radius:50%;border:0;background:#1c1c1e;color:#fff;display:grid;place-items:center;cursor:pointer;flex-shrink:0;padding:0;}" +
    ".avonix-cep-icon-btn--ghost{background:transparent;color:#8e8e93;width:auto;height:auto;padding:6px;border-radius:8px;}" +
    ".avonix-cep-icon-btn--ghost:hover{color:#1c1c1e;}" +
    ".avonix-cep-avatar{width:40px;height:40px;border-radius:50%;object-fit:cover;background:#e8e8ed;flex-shrink:0;}" +
    ".avonix-cep-header__meta{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px;}" +
    ".avonix-cep-header__name{font-size:16px;font-weight:700;line-height:1.15;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".avonix-cep-header__status{font-size:12px;color:#8e8e93;display:flex;align-items:center;gap:5px;line-height:1.2;font-weight:500;}" +
    ".avonix-cep-header__status-ico{width:12px;height:12px;flex-shrink:0;color:var(--avx-cep-primary);display:block;}" +
    /* Messages */
    ".avonix-cep-log{flex:1;overflow-y:auto;padding:8px 16px 16px;display:flex;flex-direction:column;gap:8px;background:linear-gradient(180deg,#fafafa 0%,#f3f3f5 100%);}" +
    ".avonix-cep-day{align-self:center;font-size:11px;font-weight:500;color:#8e8e93;background:rgba(0,0,0,.06);padding:5px 12px;border-radius:999px;margin:6px 0 10px;}" +
    ".avonix-cep-row{display:flex;flex-direction:column;gap:4px;max-width:100%;}" +
    ".avonix-cep-row--you{align-items:flex-end;}" +
    ".avonix-cep-row:not(.avonix-cep-row--you){align-items:flex-start;}" +
    ".avonix-cep-row .avonix-cep-avatar{display:none;}" +
    ".avonix-cep-bubble{max-width:85%;padding:12px 16px;border-radius:22px;font-size:15px;line-height:1.4;word-break:break-word;}" +
    ".avonix-cep-bubble--bot{background:#fff;color:#111;box-shadow:0 2px 10px rgba(15,23,42,.06);}" +
    ".avonix-cep-bubble--you{background:var(--avx-cep-primary);color:#fff;border-bottom-right-radius:8px;}" +
    ".avonix-cep-bubble--system{align-self:center;background:transparent;box-shadow:none;color:#8e8e93;font-size:12px;text-align:center;max-width:92%;padding:6px;}" +
    ".avonix-cep-meta{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#b0b0b8;margin:2px 4px 0;}" +
    ".avonix-cep-bubble a{color:inherit;text-decoration:underline;}" +
    ".avonix-cep-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;}" +
    ".avonix-cep-btn{border:0;background:#fff;color:#111;border-radius:999px;padding:10px 14px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(15,23,42,.08);}" +
    ".avonix-cep-btn:hover{background:#f5f5f7;}" +
    ".avonix-cep-lead{margin-top:8px;border-radius:16px;padding:10px;background:#fff;box-shadow:0 2px 10px rgba(15,23,42,.06);max-height:280px;overflow:auto;}" +
    /* Composer — full pill with icons inside, no outer send circle */
    ".avonix-cep-form{display:flex;align-items:center;gap:0;padding:12px 14px 18px;background:transparent;flex-shrink:0;border:0;}" +
    ".avonix-cep-input-wrap{flex:1;min-width:0;display:flex;align-items:center;gap:4px;background:#fff;border-radius:999px;padding:6px 10px 6px 18px;box-shadow:0 4px 18px rgba(15,23,42,.08);border:0;}" +
    ".avonix-cep-input{flex:1;min-width:0;border:0;background:transparent;padding:12px 4px;font-size:15px;outline:none;color:#111;}" +
    ".avonix-cep-input::placeholder{color:#b0b0b8;}" +
    ".avonix-cep-tool{border:0;background:transparent;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:#8e8e93;cursor:pointer;padding:0;flex-shrink:0;}" +
    ".avonix-cep-tool:hover{color:var(--avx-cep-primary);background:#f5f5f7;}" +
    ".avonix-cep-send{border:0;background:transparent;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:var(--avx-cep-primary);cursor:pointer;padding:0;flex-shrink:0;}" +
    ".avonix-cep-send svg{width:18px;height:18px;}" +
    /* Start chat — left title, underline email, no big CTA look */
    ".avonix-cep-gate{display:none;flex-direction:column;flex:1;min-height:0;padding:28px 28px 24px;background:#fff;position:relative;}" +
    ".avonix-cep-gate.is-on{display:flex;}" +
    ".avonix-cep-gate__close{position:absolute;top:16px;right:16px;background:transparent;border:0;color:#333;cursor:pointer;padding:4px;line-height:0;}" +
    ".avonix-cep-gate__hero{display:flex;align-items:center;justify-content:center;min-height:100px;margin:12px 0 28px;color:#222;}" +
    ".avonix-cep-gate__hero img{max-height:100px;max-width:100%;object-fit:contain;}" +
    ".avonix-cep-gate__title{margin:0 0 22px;font-size:28px;font-weight:700;letter-spacing:-.02em;color:#111;text-align:left;}" +
    ".avonix-cep-gate__field{margin:0 0 12px;}" +
    ".avonix-cep-gate__label{display:none;}" +
    ".avonix-cep-gate__email{width:100%;border:0;border-bottom:1px solid #c8c8c8;padding:10px 0;font-size:16px;outline:none;background:transparent;color:#111;box-sizing:border-box;}" +
    ".avonix-cep-gate__email::placeholder{color:#9a9a9a;}" +
    ".avonix-cep-gate__email:focus{border-bottom-color:#333;}" +
    ".avonix-cep-gate__privacy{font-size:12px;line-height:1.45;color:#555;margin:0 0 20px;}" +
    ".avonix-cep-gate__privacy a{color:#1a5cff;font-weight:600;text-decoration:none;}" +
    ".avonix-cep-gate__check{display:flex;align-items:center;gap:10px;font-size:14px;color:#444;margin:0 0 12px;cursor:pointer;}" +
    ".avonix-cep-gate__check input{width:16px;height:16px;margin:0;accent-color:#333;border-radius:3px;}" +
    ".avonix-cep-gate__go{margin-top:auto;align-self:flex-start;border:0;background:transparent;padding:8px 0;font-size:15px;font-weight:700;color:var(--avx-cep-primary);cursor:pointer;}" +
    ".avonix-cep-chat{display:flex;flex-direction:column;flex:1;min-height:0;background:linear-gradient(180deg,#fff 0%,#f7f7f8 28%);}" +
    ".avonix-cep-chat.is-hidden{display:none;}" +
    "@media (max-width:640px){.avonix-cep-root:not(.avonix-cep-root--wizard) .avonix-cep-panel{width:" + mobW + ";height:" + mobH + ";border-radius:28px;}}";
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
    if (who !== "you" && !isSys) {
      var meta = document.createElement("div");
      meta.className = "avonix-cep-meta";
      meta.textContent = "Bot · Just now";
      log.appendChild(meta);
    }
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
    // White bubble + cutout (currentColor = primary shows through)
    var bubble = '<path fill="#fff" d="M9 11.5c0-2.5 2-4.5 4.5-4.5h21c2.5 0 4.5 2 4.5 4.5v15c0 2.5-2 4.5-4.5 4.5H22.2L14 38v-7H13.5C11 31 9 29 9 26.5v-15z"/>';
    if (launcherIcon === "dots") {
      return '<svg class="avonix-cep-launcher__glyph" viewBox="0 0 48 48" aria-hidden="true">' + bubble +
        '<circle cx="18.5" cy="19.5" r="2.6" fill="currentColor"/><circle cx="24" cy="19.5" r="2.6" fill="currentColor"/><circle cx="29.5" cy="19.5" r="2.6" fill="currentColor"/></svg>';
    }
    // compose / pencil (default — matches first reference)
    return '<svg class="avonix-cep-launcher__glyph" viewBox="0 0 48 48" aria-hidden="true">' + bubble +
      '<g fill="currentColor" transform="translate(24 19.5) rotate(-45) translate(-24 -19.5)"><rect x="21.2" y="11" width="5.6" height="14" rx="1.2"/><path d="M21.2 25.2L24 31.2l2.8-6z"/></g></svg>';
  }

  function defaultHeroSvg() {
    return '<svg width="200" height="110" viewBox="0 0 200 110" fill="none" aria-hidden="true">' +
      '<path d="M22 70l34-22 8 8-14 26-10-6 8-12-26 6z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
      '<path d="M58 48c22-16 48-22 70-12" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.5 4" fill="none"/>' +
      '<path d="M34 52h10M40 44v8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
      '<path d="M128 34h36v40H146l-12 12V34z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
      '<path d="M138 34v-8h16v8" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
      '<rect x="142" y="48" width="14" height="10" rx="1" stroke="currentColor" stroke-width="1.4"/>' +
      '<path d="M170 52h8M174 46v10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
      '</svg>';
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
  gateClose.className = "avonix-cep-gate__close";
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
  gateEmail.placeholder = "Email";
  gateEmail.autocomplete = "email";
  gateField.appendChild(gateEmail);
  var gatePrivacy = document.createElement("p");
  gatePrivacy.className = "avonix-cep-gate__privacy";
  var pUrl = privacyUrl || "#";
  gatePrivacy.innerHTML = 'We need to process your personal data in line with our <a href="' + String(pUrl).replace(/"/g, "") + '"' + (privacyUrl ? ' target="_blank" rel="noopener"' : '') + '>Privacy Policy</a>.';
  var gateAgree = document.createElement("label");
  gateAgree.className = "avonix-cep-gate__check";
  gateAgree.innerHTML = '<input type="checkbox" id="avonix-cep-agree"> <span>I agree</span>';
  var gateRemember = document.createElement("label");
  gateRemember.className = "avonix-cep-gate__check";
  gateRemember.innerHTML = '<input type="checkbox" id="avonix-cep-remember" checked> <span>This is a private computer, remember me</span>';
  var gateGo = document.createElement("button");
  gateGo.type = "button";
  gateGo.className = "avonix-cep-gate__go";
  gateGo.textContent = theme.startButtonLabel || "Continue →";
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
  statusEl.innerHTML = '<svg class="avonix-cep-header__status-ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2.5 3.2c0-.9.7-1.6 1.6-1.6h7.8c.9 0 1.6.7 1.6 1.6v5.2c0 .9-.7 1.6-1.6 1.6H7.2L4 13.2V10H4.1c-.9 0-1.6-.7-1.6-1.6V3.2z"/></svg><span></span>';
  statusEl.lastChild.textContent = statusText;
  meta.appendChild(nameEl);
  meta.appendChild(statusEl);
  header.appendChild(meta);
  var menuBtn = document.createElement("button");
  menuBtn.type = "button";
  menuBtn.className = "avonix-cep-icon-btn avonix-cep-icon-btn--ghost";
  menuBtn.setAttribute("aria-label", "Close");
  menuBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h12M4 17h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
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
  input.placeholder = config.placeholder || theme.placeholder || "Write a reply...";
  input.setAttribute("aria-label", "Your message");
  inputWrap.appendChild(input);
  var heartBtn = document.createElement("button");
  heartBtn.type = "button";
  heartBtn.className = "avonix-cep-tool";
  heartBtn.setAttribute("aria-label", "React");
  heartBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 20s-7-4.4-7-9.2C5 8 6.8 6.2 9 6.2c1.3 0 2.4.6 3 1.5.6-.9 1.7-1.5 3-1.5 2.2 0 4 1.8 4 4.6C19 15.6 12 20 12 20z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  var galleryBtn = document.createElement("button");
  galleryBtn.type = "button";
  galleryBtn.className = "avonix-cep-tool";
  galleryBtn.setAttribute("aria-label", "Attach image");
  galleryBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.6" fill="currentColor"/><path d="M6.5 16.5l4.2-4.2 2.6 2.6 2.4-2.8 3.8 4.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var send = document.createElement("button");
  send.type = "submit";
  send.className = "avonix-cep-send";
  send.setAttribute("aria-label", "Send");
  send.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  inputWrap.appendChild(heartBtn);
  inputWrap.appendChild(galleryBtn);
  inputWrap.appendChild(send);
  form.appendChild(inputWrap);

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
