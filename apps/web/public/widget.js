/*
 * Avonix chat widget.
 *
 * Plain JS, no build step, no framework: this runs on somebody else's
 * WordPress site next to whatever else they have loaded, so it must not
 * assume — or install — anything global.
 *
 * The connector key is NOT here. The widget talks to the site's own
 * /wp-admin/admin-ajax.php proxy, which holds the key server-side. A key in a
 * public script is a key anyone can use to write into someone else's CRM.
 */
(function () {
  "use strict";

  var config = window.AVONIX_CHAT || {};
  var proxy = config.proxy;
  if (!proxy) return;

  var conversationId = null;
  var open = false;
  var busy = false;

  var root = document.createElement("div");
  root.setAttribute("data-avonix", "chat");
  root.style.cssText =
    "position:fixed;bottom:20px;right:20px;z-index:2147483000;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif";

  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Open chat");
  button.textContent = config.label || "Chat";
  button.style.cssText =
    "cursor:pointer;border:0;border-radius:999px;padding:13px 20px;font-size:15px;font-weight:600;color:#fff;background:" +
    (config.color || "#ff6600") +
    ";box-shadow:0 6px 20px rgba(0,0,0,.18)";

  var panel = document.createElement("div");
  panel.style.cssText =
    "display:none;flex-direction:column;width:340px;max-width:calc(100vw - 40px);height:460px;max-height:calc(100vh - 120px);" +
    "background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.22);margin-bottom:12px";

  var header = document.createElement("div");
  header.style.cssText =
    "padding:13px 15px;font-size:14px;font-weight:700;color:#fff;background:" + (config.color || "#ff6600");
  header.textContent = config.title || "Ask us anything";

  var log = document.createElement("div");
  log.style.cssText = "flex:1;overflow-y:auto;padding:13px;display:flex;flex-direction:column;gap:9px;background:#f7f8fa";
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");

  var form = document.createElement("form");
  form.style.cssText = "display:flex;gap:7px;padding:10px;border-top:1px solid #e6e9f0;background:#fff";

  var input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type your question…";
  input.setAttribute("aria-label", "Your question");
  input.style.cssText =
    "flex:1;min-width:0;border:1px solid #dbe1ea;border-radius:9px;padding:9px 11px;font-size:14px;outline:none";

  var send = document.createElement("button");
  send.type = "submit";
  send.textContent = "Send";
  send.style.cssText =
    "cursor:pointer;border:0;border-radius:9px;padding:9px 14px;font-size:14px;font-weight:600;color:#fff;background:" +
    (config.color || "#ff6600");

  form.appendChild(input);
  form.appendChild(send);
  panel.appendChild(header);
  panel.appendChild(log);
  panel.appendChild(form);
  root.appendChild(panel);
  root.appendChild(button);

  function bubble(text, who) {
    var el = document.createElement("div");
    var mine = who === "you";
    el.style.cssText =
      "max-width:82%;padding:9px 12px;border-radius:12px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-break:break-word;" +
      (mine
        ? "align-self:flex-end;background:" + (config.color || "#ff6600") + ";color:#fff"
        : "align-self:flex-start;background:#fff;border:1px solid #e6e9f0;color:#13233c");
    // textContent, never innerHTML: the reply is model output rendered on
    // somebody else's site, and this is the one place an injection would land.
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  button.addEventListener("click", function () {
    open = !open;
    panel.style.display = open ? "flex" : "none";
    button.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    if (open) {
      if (!log.childNodes.length) {
        bubble(config.greeting || "Hi — ask us anything about our services.", "them");
      }
      input.focus();
    }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;

    bubble(text, "you");
    input.value = "";
    busy = true;
    send.disabled = true;

    var thinking = bubble("…", "them");

    fetch(proxy, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:
        "action=avonix_chat&nonce=" +
        encodeURIComponent(config.nonce || "") +
        "&message=" +
        encodeURIComponent(text) +
        "&conversation_id=" +
        encodeURIComponent(conversationId || ""),
    })
      .then(function (r) {
        return r.json().catch(function () {
          return {};
        });
      })
      .then(function (data) {
        if (data && data.conversation_id) conversationId = data.conversation_id;
        thinking.textContent =
          (data && data.reply) ||
          "Sorry — we could not answer just now. Leave your email and we will follow up.";
      })
      .catch(function () {
        thinking.textContent = "Sorry — something went wrong. Please try again.";
      })
      .finally(function () {
        busy = false;
        send.disabled = false;
        input.focus();
      });
  });

  function mount() {
    document.body.appendChild(root);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
