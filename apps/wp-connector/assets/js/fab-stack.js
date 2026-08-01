/**
 * Avonix FAB stack — keeps Live Chat / Accessibility / Languages in one column
 * with a fixed pixel gap when AVONIX_FAB_GROUP says they are linked.
 */
(function () {
  var ROOTS = {
    accessibility: function () {
      return document.getElementById("avonix-a11y-root");
    },
    languages: function () {
      return document.getElementById("avonix-lang-root");
    },
    chat: function () {
      return document.querySelector(
        ".avonix-cep-root:not(.avonix-cep-root--wizard)",
      );
    },
  };

  var layingOut = false;

  function readGroup() {
    var g =
      window.AVONIX_FAB_GROUP ||
      (window.AVONIX_CHAT && window.AVONIX_CHAT.fab_group) ||
      (window.AVONIX_A11Y && window.AVONIX_A11Y.fab_group) ||
      (window.AVONIX_LANG && window.AVONIX_LANG.fab_group) ||
      null;
    if (g && g.enabled === false) return null;
    // Default ON: stack all present Avonix FABs with a 1px gap.
    if (!g) {
      return {
        enabled: true,
        gap_px: 1,
        order: ["accessibility", "languages", "chat"],
        placement: null,
        members: {
          accessibility: { linked: true },
          languages: { linked: true },
          chat: { linked: true },
        },
      };
    }
    return g;
  }

  function memberLinked(g, id) {
    var m = g.members && g.members[id];
    return !m || m.linked !== false;
  }

  /** Vertical step size = tile height (not width — CTA row can be wider). */
  function tileHeight(el, id) {
    if (!el) return 44;
    var sel =
      id === "chat"
        ? ".avonix-cep-launcher"
        : id === "accessibility"
          ? ".avonix-a11y-btn, .avonix-a11y-stack"
          : id === "languages"
            ? ".avonix-lang-btn, .avonix-lang-stack"
            : null;
    var node = sel ? el.querySelector(sel) : el;
    if (node) {
      var br = node.getBoundingClientRect();
      if (br.height > 0) return Math.round(br.height);
      if (br.width > 0) return Math.round(br.width);
    }
    if (id === "chat") {
      var css = window.getComputedStyle(el).getPropertyValue("--avx-launcher");
      var n = parseFloat(css);
      if (isFinite(n) && n > 0) return Math.round(n);
    }
    return 44;
  }

  function placeChatClosed(el, x, y, size, openLeft, narrow) {
    if (el.classList.contains("is-open")) return false;
    el.classList.add("avonix-fab-stacked");
    el.style.gap = "0px";
    var pill = el.querySelector(".avonix-cep-cta-pill");
    if (pill) pill.setAttribute("hidden", "");
    var fabRow = el.querySelector(".avonix-cep-fab-row");
    if (fabRow) fabRow.style.flexDirection = "row";

    var r = narrow ? Math.max(6, Math.round(size * (10 / 44))) + "px" : null;
    el.style.flexDirection = "column";
    el.style.alignItems = openLeft ? "flex-end" : "flex-start";
    el.classList.toggle("is-align-end", openLeft);
    el.classList.toggle("is-align-start", !openLeft);
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.right = "auto";
    el.style.bottom = "auto";
    el.style.width = "";
    if (r) {
      el.style.setProperty("--avx-launcher-radius", r);
      var btn = el.querySelector(".avonix-cep-launcher");
      if (btn) btn.style.borderRadius = r;
    }

    var launcher = el.querySelector(".avonix-cep-launcher");
    if (launcher) {
      var rootBox = el.getBoundingClientRect();
      var btnBox = launcher.getBoundingClientRect();
      var driftX = Math.round(btnBox.left - rootBox.left);
      var driftY = Math.round(btnBox.top - rootBox.top);
      if (driftX !== 0 || driftY !== 0) {
        el.style.left = x - driftX + "px";
        el.style.top = y - driftY + "px";
      }
    }
    return true;
  }

  function layout() {
    if (layingOut) return;
    var g = readGroup();
    if (!g) return;

    layingOut = true;
    try {
      var order = Array.isArray(g.order)
        ? g.order.slice()
        : ["accessibility", "languages", "chat"];
      var gap =
        typeof g.gap_px === "number" && isFinite(g.gap_px)
          ? Math.max(0, Math.round(g.gap_px))
          : 1;

      var vw = window.innerWidth || document.documentElement.clientWidth || 360;
      var vh =
        window.innerHeight || document.documentElement.clientHeight || 640;
      var narrow = vw < 640;
      var inset = narrow ? 8 : 0;

      var linked = [];
      var sizes = {};
      order.forEach(function (id) {
        if (!ROOTS[id] || !memberLinked(g, id)) return;
        var el = ROOTS[id]();
        if (!el || !el.isConnected) return;
        if (id === "chat" && el.classList.contains("is-open")) return;
        sizes[id] = tileHeight(el, id);
        linked.push({ id: id, el: el });
      });
      if (linked.length < 1) return;

      var pl = g.placement || {};
      var xPct = Number(pl.xPercent);
      var yPct = Number(pl.yPercent);
      // Infer from current topmost FAB when studio has not saved a group yet.
      if (!isFinite(xPct) || !isFinite(yPct)) {
        var anchorEl = linked[0].el;
        var anchorBtn =
          anchorEl.querySelector(
            ".avonix-a11y-btn, .avonix-lang-btn, .avonix-cep-launcher",
          ) || anchorEl;
        var anchor = anchorBtn.getBoundingClientRect();
        xPct = (anchor.left / Math.max(1, vw)) * 100;
        yPct = (anchor.top / Math.max(1, vh)) * 100;
      }

      var firstSize = sizes[linked[0].id] || 44;
      var stackH = 0;
      linked.forEach(function (item, i) {
        stackH += sizes[item.id] || 44;
        if (i < linked.length - 1) stackH += gap;
      });

      var x = Math.round((xPct / 100) * vw);
      var y = Math.round((yPct / 100) * vh);
      x = Math.min(
        Math.max(inset, vw - firstSize - inset),
        Math.max(inset, x),
      );
      y = Math.min(Math.max(inset, vh - stackH - inset), Math.max(inset, y));

      var openLeft = xPct >= 50;
      var nearTop = yPct < 28;
      var cursor = y;
      linked.forEach(function (item) {
        var size = sizes[item.id] || 44;
        var slotX = Math.min(
          Math.max(inset, vw - size - inset),
          Math.max(inset, x),
        );
        var el = item.el;
        el.setAttribute("data-avonix-fab-stacked", "1");
        if (item.id === "chat") {
          placeChatClosed(el, slotX, cursor, size, openLeft, narrow);
        } else {
          el.style.left = slotX + "px";
          el.style.top = cursor + "px";
          el.style.right = "auto";
          el.style.bottom = "auto";
          var rad = Math.max(6, Math.round(size * (10 / 44)));
          var radius = narrow
            ? rad + "px"
            : openLeft
              ? rad + "px 0 0 " + rad + "px"
              : "0 " + rad + "px " + rad + "px 0";
          // Tooltip side classes — same as solo place()/placeLang().
          // Without these, tips sit on top of the icon (Live Chat was fine
          // because it uses is-align-start on the root).
          var localStack =
            item.id === "accessibility"
              ? el.querySelector(".avonix-a11y-stack")
              : el.querySelector(".avonix-lang-stack");
          if (localStack) {
            localStack.classList.toggle("is-end", openLeft);
            localStack.classList.toggle("is-start", !openLeft);
            localStack.classList.toggle("is-below", nearTop);
          }
          if (item.id === "accessibility") {
            el.style.setProperty("--avonix-a11y-radius", radius);
          }
          if (item.id === "languages") {
            el.style.setProperty("--avonix-lang-radius", radius);
          }
        }
        cursor += size + gap;
      });
    } finally {
      layingOut = false;
    }
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      layout();
    });
  }

  function boot() {
    schedule();
    setTimeout(schedule, 80);
    setTimeout(schedule, 400);
    setTimeout(schedule, 1200);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", schedule);
    }
    document.addEventListener(
      "click",
      function () {
        setTimeout(schedule, 30);
      },
      true,
    );
    try {
      var mo = new MutationObserver(function () {
        if (layingOut) return;
        schedule();
      });
      mo.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.AvonixFabStack = { layout: layout, schedule: schedule };
})();
