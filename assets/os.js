// Which system this is: "windows", "mac", "phone" (any phone or tablet) or "other". Runs in the
// head, before paint, and marks <html data-os>; the stylesheet shows the right download for it.
// A phone sees no installer button, a Windows or Mac visitor sees its own installer named.
(function () {
  var ua = navigator.userAgent || "";
  var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
  var os = /iPhone|iPad|iPod|Android|Mobile/i.test(ua) || /iPhone|iPad|Android/i.test(platform) ? "phone"
    : /Win/i.test(platform) ? "windows"
    : /Mac/i.test(platform) ? "mac"
    : "other";
  // an iPad says it is a Mac; a Mac has no touch screen
  if (os === "mac" && navigator.maxTouchPoints > 1) os = "phone";
  document.documentElement.dataset.os = os;
  var name = os === "windows" ? "Windows" : os === "mac" ? "Mac" : "";
  if (!name) return;
  document.addEventListener("DOMContentLoaded", function () {
    var els = document.querySelectorAll("[data-os-name]");
    for (var i = 0; i < els.length; i++) els[i].textContent = name;
  });
})();
