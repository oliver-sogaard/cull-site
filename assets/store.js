/**
 * The store's three pages, in one small script with no framework:
 *
 *  - pro.html     the buy buttons open Paddle's checkout over the page
 *  - thanks.html  shows the key once the license service has it
 *  - key.html     "lost your key": has it sent again
 *
 * Each page carries its settings as data attributes on the element with
 * [data-store]; nothing here is inline, so the pages can run under a
 * script-src 'self' policy. Text is always set with textContent.
 */
(function () {
  "use strict";

  var root = document.querySelector("[data-store]");
  if (!root) return;
  var cfg = root.dataset;
  var $ = function (id) {
    return document.getElementById(id);
  };
  /** Show exactly one of a page's states (elements with [data-state]). */
  function show(name) {
    var states = root.querySelectorAll("[data-state]");
    for (var i = 0; i < states.length; i++) states[i].hidden = states[i].dataset.state !== name;
  }

  // ── pro.html ────────────────────────────────────────────────────────────
  function pro() {
    var buttons = root.querySelectorAll("[data-buy]");
    var trouble = $("buy-trouble");
    if (typeof window.Paddle === "undefined") {
      // Paddle.js did not load (a content blocker, no network). Say so once
      // a button is pressed, rather than leaving a button that does nothing.
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener("click", function () {
          trouble.hidden = false;
        });
      }
      return;
    }
    // True only while a checkout opened by one of this page's buttons is up.
    // Paddle also opens checkouts here on its own (the links in its emails to
    // update a card land on this page): those must not end on the thank-you
    // page, which would wait for a key that is not coming.
    var ours = false;
    if (cfg.env === "sandbox") window.Paddle.Environment.set("sandbox");
    window.Paddle.Initialize({
      token: cfg.token,
      eventCallback: function (event) {
        if (!event || !event.name) return;
        if (event.name === "checkout.completed" && ours && event.data && event.data.transaction_id) {
          window.location.assign("./thanks.html?txn=" + encodeURIComponent(event.data.transaction_id));
        } else if (event.name === "checkout.closed") {
          ours = false;
        }
      },
    });
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].addEventListener("click", function (e) {
        var priceId = cfg[e.currentTarget.dataset.buy];
        if (!priceId) return;
        ours = true;
        window.Paddle.Checkout.open({
          items: [{ priceId: priceId, quantity: 1 }],
          settings: { displayMode: "overlay", variant: "one-page", theme: "dark" },
        });
      });
    }
  }

  // ── thanks.html ─────────────────────────────────────────────────────────
  var TXN = /^txn_[a-z0-9]{26}$/;
  var TXN_KEY = "cull:txn";
  var POLL_MS = 5000;
  var GIVE_UP_MS = 10 * 60 * 1000;
  var PLAN = { lifetime: "Lifetime", yearly: "Yearly", monthly: "Monthly" };

  function thanks() {
    // The transaction id is what lets this browser read the key, so it does
    // not stay in the address bar; the tab remembers it, so a reload within
    // the two hours still shows the key.
    var txn = new URLSearchParams(window.location.search).get("txn");
    try {
      if (txn && TXN.test(txn)) window.sessionStorage.setItem(TXN_KEY, txn);
      else txn = window.sessionStorage.getItem(TXN_KEY);
    } catch (_) {
      // Storage is off (a private window): the id from the address still works once.
    }
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
    if (!txn || !TXN.test(txn)) {
      show("sent");
      return;
    }

    var started = Date.now();
    var copy = $("copy");
    var keyEl = $("key");
    var copied;
    copy.addEventListener("click", function () {
      var done = function () {
        copy.textContent = "Copied";
        window.clearTimeout(copied);
        copied = window.setTimeout(function () {
          copy.textContent = "Copy";
        }, 2000);
      };
      var select = function () {
        var range = document.createRange();
        range.selectNodeContents(keyEl);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        copy.textContent = "Selected: copy it now";
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(keyEl.textContent).then(done, select);
      else select();
    });

    function ready(p) {
      keyEl.textContent = p.key;
      $("plan").textContent = "CULL Pro" + (PLAN[p.plan] ? " · " + PLAN[p.plan] : "");
      $("email").textContent = p.email;
      var seats = Number(p.seats) || 2;
      $("seats").textContent = seats === 1 ? "one computer" : seats === 2 ? "two computers" : seats + " computers";
      show("ready");
    }

    function ask() {
      fetch(cfg.api + "/v1/purchase?txn=" + encodeURIComponent(txn), { cache: "no-store" })
        .then(function (res) {
          return res.ok ? res.json() : null;
        })
        .then(function (p) {
          if (p && p.status === "ready" && p.key) return ready(p);
          if (p && p.status === "sent") return show("sent");
          again();
        })
        .catch(again);
    }
    function again() {
      // Still being made, or the service did not answer: keep the page as it
      // is and ask again, until ten minutes are up.
      if (Date.now() - started > GIVE_UP_MS) return show("sent");
      window.setTimeout(ask, POLL_MS);
    }
    show("pending");
    ask();
  }

  // ── key.html ────────────────────────────────────────────────────────────
  function lostKey() {
    var form = $("lost-form");
    if (!form) return;
    var button = $("lost-send");
    var problem = $("lost-problem");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = $("lost-email").value.trim();
      var token = "";
      try {
        token = window.turnstile ? window.turnstile.getResponse() : "";
      } catch (_) {
        token = "";
      }
      problem.hidden = true;
      if (!email) return;
      if (!token) {
        problem.textContent = "Tick the check above first. If it does not appear, reload the page.";
        problem.hidden = false;
        return;
      }
      button.disabled = true;
      button.textContent = "Sending…";
      fetch(cfg.api + "/v1/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email, turnstile: token }),
      })
        .then(function (res) {
          if (res.ok) return show("answer");
          problem.textContent =
            res.status === 429
              ? "Too many tries. Wait a minute, then try again."
              : "That did not go through. Reload the page and try again.";
          problem.hidden = false;
        })
        .catch(function () {
          problem.textContent = "The license service could not be reached. Try again in a minute.";
          problem.hidden = false;
        })
        .then(function () {
          button.disabled = false;
          button.textContent = "Send my key";
          try {
            if (window.turnstile) window.turnstile.reset();
          } catch (_) {
            /* nothing to reset */
          }
        });
    });
  }

  if (cfg.store === "pro") pro();
  else if (cfg.store === "thanks") thanks();
  else if (cfg.store === "key") lostKey();
})();
