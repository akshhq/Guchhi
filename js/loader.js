/**
 * loader.js
 * Netflix-style brand intro that doubles as a real asset preloader: it stays
 * on screen until the page has actually finished loading (images, fonts,
 * scripts), not just for a fixed decorative delay.
 *
 * Deliberately a plain classic script (not an ES module) so it can never be
 * taken down by an unrelated module failing to resolve elsewhere on the
 * page — this needs to be the most robust piece of JS on the site, since
 * everything else is hidden behind it.
 */
(function () {
  var loaderEl = document.getElementById('page-loader');
  if (!loaderEl) return;

  var MIN_VISIBLE_MS = 1900; // let the brand moment breathe, even on a fast connection
  var MAX_WAIT_MS = 5000; // never hold the page hostage for a slow/stalled resource
  var EXIT_TRANSITION_MS = 700;

  var startedAt = Date.now();
  var dismissed = false;

  document.documentElement.classList.add('loader-active');

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    loaderEl.setAttribute('data-state', 'exit');
    document.documentElement.classList.remove('loader-active');
    window.setTimeout(function () {
      if (loaderEl && loaderEl.parentNode) {
        loaderEl.parentNode.removeChild(loaderEl);
      }
    }, EXIT_TRANSITION_MS);
  }

  function whenPageAssetsReady() {
    var pageLoaded =
      document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise(function (resolve) {
            window.addEventListener('load', resolve, { once: true });
          });

    var fontsReady =
      document.fonts && document.fonts.ready
        ? document.fonts.ready.catch(function () {})
        : Promise.resolve();

    return Promise.all([pageLoaded, fontsReady]);
  }

  function scheduleDismiss() {
    var elapsed = Date.now() - startedAt;
    window.setTimeout(dismiss, Math.max(MIN_VISIBLE_MS - elapsed, 0));
  }

  whenPageAssetsReady().then(scheduleDismiss, scheduleDismiss);

  // Hard failsafe: guarantees the site is never blocked indefinitely, even
  // if some resource never fires a load/error event.
  window.setTimeout(dismiss, MAX_WAIT_MS);
})();
