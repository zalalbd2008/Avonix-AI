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
    ".avonix-cep-root{position:fixed;z-index:" +
    z +
    ";" +
    rootPosCss +
    "font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;flex-direction:" +
    (stackUp ? "column-reverse" : "column") +
    ";align-items:" +
    (alignEnd ? "flex-end" : "flex-start") +
    ";gap:12px;max-width:calc(100vw - 16px);}" +
    ".avonix-cep-root--wizard{position:relative;inset:auto;z-index:1;width:100%;max-width:100%;align-items:stretch;bottom:auto;top:auto;left:auto;right:auto;flex-direction:column;}" +
    ".avonix-cep-launcher{cursor:pointer;border:0;border-radius:999px;padding:14px 20px;font-size:15px;font-weight:600;color:#fff;background:" +
    primary +
    ";box-shadow:0 8px 24px rgba(0,0,0,.18);position:relative;}" +
    (theme.pulse
      ? ".avonix-cep-launcher::after{content:'';position:absolute;inset:-4px;border-radius:999px;border:2px solid " +
        primary +
        ";opacity:.45;animation:avonix-cep-pulse 1.8s ease infinite;}" +
        "@keyframes avonix-cep-pulse{0%{transform:scale(1);opacity:.45}70%{transform:scale(1.15);opacity:0}100%{opacity:0}}"
      : "") +
    ".avonix-cep-online{position:absolute;top:4px;right:4px;width:10px;height:10px;border-radius:50%;background:#22c55e;border:2px solid #fff;}" +
    ".avonix-cep-panel{display:none;flex-direction:column;width:" +
    deskW +
    ";height:" +
    deskH +
    ";background:" +
    (theme.backgroundColor || "#fff") +
    ";color:" +
    (theme.textColor || "#13233c") +
    ";border-radius:" +
    radius +
    "px;overflow:hidden;box-shadow:0 20px 55px rgba(0,0,0,.22);}" +
    ".avonix-cep-root--wizard .avonix-cep-panel{display:flex;width:100%;height:min(640px,70vh);max-width:100%;box-shadow:none;border:1px solid #e6e9f0;}" +
    ".avonix-cep-root--wizard .avonix-cep-launcher{display:none;}" +
    ".avonix-cep-header{padding:14px 16px;font-size:14px;font-weight:700;color:#fff;background:" +
    (theme.headerColor || primary) +
    ";display:flex;align-items:center;gap:10px;}" +
    ".avonix-cep-avatar{width:32px;height:32px;border-radius:50%;object-fit:cover;background:rgba(255,255,255,.25);flex-shrink:0;}" +
    ".avonix-cep-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f7f8fa;}" +
    ".avonix-cep-row{display:flex;gap:8px;align-items:flex-end;}" +
    ".avonix-cep-row--you{flex-direction:row-reverse;}" +
    ".avonix-cep-row .avonix-cep-avatar{width:28px;height:28px;}" +
    ".avonix-cep-bubble{max-width:88%;padding:10px 12px;border-radius:14px;font-size:14px;line-height:1.45;word-break:break-word;}" +
    ".avonix-cep-bubble--bot{align-self:flex-start;background:#fff;border:1px solid #e6e9f0;}" +
    ".avonix-cep-bubble--you{align-self:flex-end;background:" +
    primary +
    ";color:#fff;}" +
    ".avonix-cep-bubble--system{align-self:center;background:transparent;border:0;color:#64748b;font-size:12px;text-align:center;max-width:94%;}" +
    ".avonix-cep-bubble a{color:inherit;text-decoration:underline;}" +
    ".avonix-cep-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}" +
    ".avonix-cep-btn{border:1px solid " +
    primary +
    ";background:#fff;color:" +
    primary +
    ";border-radius:999px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;}" +
    ".avonix-cep-lead{margin-top:8px;border:1px solid #e6e9f0;border-radius:12px;padding:10px;background:#fafbfc;max-height:320px;overflow:auto;}" +
    ".avonix-cep-form{display:flex;gap:8px;padding:10px;border-top:1px solid #e6e9f0;background:#fff;}" +
    ".avonix-cep-input{flex:1;min-width:0;border:1px solid #dbe1ea;border-radius:10px;padding:10px 12px;font-size:14px;outline:none;}" +
    ".avonix-cep-send{cursor:pointer;border:0;border-radius:10px;padding:10px 14px;font-size:14px;font-weight:600;color:#fff;background:" +
    primary +
    ";}" +
    "@media (max-width:640px){.avonix-cep-root:not(.avonix-cep-root--wizard) .avonix-cep-panel{width:" +
    mobW +
    ";height:" +
    mobH +
    ";border-radius:14px;}}";
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

  var button = document.createElement("button");
  button.type = "button";
  button.className = "avonix-cep-launcher";
  button.setAttribute("aria-label", "Open chat");
  button.textContent = theme.launcherLabel || config.label || "Chat";
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

  var header = document.createElement("div");
  header.className = "avonix-cep-header";
  if (config.bot_avatar_url) {
    var hav = document.createElement("img");
    hav.className = "avonix-cep-avatar";
    hav.src = config.bot_avatar_url;
    hav.alt = "";
    header.appendChild(hav);
  }
  var titleEl = document.createElement("span");
  titleEl.textContent = config.title || "Ask us anything";
  header.appendChild(titleEl);

  var log = document.createElement("div");
  log.className = "avonix-cep-log";
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");

  var form = document.createElement("form");
  form.className = "avonix-cep-form";

  var input = document.createElement("input");
  input.type = "text";
  input.className = "avonix-cep-input";
  input.placeholder = config.placeholder || "Type a message…";
  input.setAttribute("aria-label", "Your message");

  var send = document.createElement("button");
  send.type = "submit";
  send.className = "avonix-cep-send";
  send.textContent = "Send";

  form.appendChild(input);
  form.appendChild(send);
  panel.appendChild(header);
  panel.appendChild(log);
  panel.appendChild(form);
  root.appendChild(panel);
  root.appendChild(button);

  function showGreeting() {
    if (log.childNodes.length) return;
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

  button.addEventListener("click", function () {
    open = !open;
    panel.style.display = open ? "flex" : "none";
    placeRoot();
    if (open) {
      showGreeting();
      input.focus();
      startPoll();
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
      showGreeting();
      startPoll();
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
        if (!open) button.click();
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
    if (!open) button.click();
  };
  window.AvonixCep.close = function () {
    if (open) button.click();
  };
})();
