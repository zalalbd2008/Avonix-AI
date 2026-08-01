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

  function outerSize(el, id) {
    if (!el) return 44;
    if (id === "chat") {
      var btn = el.querySelector(".avonix-cep-launcher");
      if (btn) {
        var br = btn.getBoundingClientRect();
        if (br.width > 0) return Math.round(br.width);
      }
      var css = window.getComputedStyle(el).getPropertyValue("--avx-launcher");
      var n = parseFloat(css);
      if (isFinite(n) && n > 0) return Math.round(n);
      return 44;
    }
    if (id === "accessibility") {
      var a = el.querySelector(".avonix-a11y-stack");
      if (a) {
        var ar = a.getBoundingClientRect();
        if (ar.width > 0) return Math.round(ar.width);
      }
    }
    if (id === "languages") {
      var l = el.querySelector(".avonix-lang-stack");
      if (l) {
        var lr = l.getBoundingClientRect();
        if (lr.width > 0) return Math.round(lr.width);
      }
    }
    var r = el.getBoundingClientRect();
    return r.width > 0 ? Math.round(r.width) : 44;
  }

  function placeChatClosed(el, x, y, size, openLeft, narrow) {
    if (el.classList.contains("is-open")) return false;
    var r = narrow ? Math.max(6, Math.round(size * (10 / 44))) + "px" : null;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.right = "auto";
    el.style.bottom = "auto";
    el.style.width = "";
    el.style.flexDirection = "column";
    el.style.alignItems = openLeft ? "flex-end" : "flex-start";
    el.classList.toggle("is-align-end", openLeft);
    el.classList.toggle("is-align-start", !openLeft);
    if (r) {
      el.style.setProperty("--avx-launcher-radius", r);
      var btn = el.querySelector(".avonix-cep-launcher");
      if (btn) btn.style.borderRadius = r;
    }
    return true;
  }

  function layout() {
    var g = readGroup();
    if (!g) return;

    var order = Array.isArray(g.order)
      ? g.order.slice()
      : ["accessibility", "languages", "chat"];
    var gap =
      typeof g.gap_px === "number" && isFinite(g.gap_px)
        ? Math.max(0, Math.round(g.gap_px))
        : 1;

    var vw = window.innerWidth || document.documentElement.clientWidth || 360;
    var vh = window.innerHeight || document.documentElement.clientHeight || 640;
    var narrow = vw < 640;
    var inset = narrow ? 8 : 0;

    var linked = [];
    var sizes = {};
    order.forEach(function (id) {
      if (!ROOTS[id] || !memberLinked(g, id)) return;
      var el = ROOTS[id]();
      if (!el || !el.isConnected) return;
      if (id === "chat" && el.classList.contains("is-open")) return;
      sizes[id] = outerSize(el, id);
      linked.push({ id: id, el: el });
    });
    if (linked.length < 1) return;

    var pl = g.placement || {};
    var xPct = Number(pl.xPercent);
    var yPct = Number(pl.yPercent);
    // Infer from current topmost FAB when studio has not saved a group yet.
    if (!isFinite(xPct) || !isFinite(yPct)) {
      var anchor = linked[0].el.getBoundingClientRect();
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
    var cursor = y;
    linked.forEach(function (item) {
      var size = sizes[item.id] || 44;
      var slotX = Math.min(
        Math.max(inset, vw - size - inset),
        Math.max(inset, x),
      );
      var el = item.el;
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
        if (item.id === "accessibility") {
          el.style.setProperty("--avonix-a11y-radius", radius);
        }
        if (item.id === "languages") {
          el.style.setProperty("--avonix-lang-radius", radius);
        }
      }
      cursor += size + gap;
    });
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
      var mo = new MutationObserver(schedule);
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
