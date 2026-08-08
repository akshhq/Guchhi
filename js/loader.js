/**
 * loader.js
 * Netflix-style brand intro that doubles as a real asset preloader.
 * Tracks asset progress (fonts, page load, window assets, 3D models & textures)
 * and smoothly drives a progress bar before performing an elegant wipe-up exit.
 *
 * Written as a plain classic IIFE (not an ES module) for maximum robustness.
 *
 * Asset synchronisation:
 *   main.js (ES module) populates window.__guchhiReady — a Promise that resolves
 *   only after every registered asset (GLB models, box textures) has finished
 *   loading (or failed with a graceful fallback). This loader awaits that promise
 *   in addition to fonts and the window.load event so the brand intro never
 *   dismisses before 3D content is ready to display.
 */
(function () {
  var loaderEl = document.getElementById('page-loader');
  var barEl = document.getElementById('page-loader-bar');
  if (!loaderEl) return;

  var MIN_VISIBLE_MS = 2200; // Allow brand moment to breathe
  var MAX_WAIT_MS = 10000;   // Failsafe timeout (10 s covers the 6 MB GLB)
  var EXIT_TRANSITION_MS = 750;

  var startedAt = Date.now();
  var dismissed = false;
  var progress = 0;
  var targetProgress = 15;

  document.documentElement.classList.add('loader-active');

  // Smooth progress bar animation loop
  function updateProgressBar() {
    if (dismissed) return;
    if (progress < targetProgress) {
      progress += (targetProgress - progress) * 0.12;
      if (barEl) {
        barEl.style.width = Math.min(Math.round(progress), 100) + '%';
      }
    }
    requestAnimationFrame(updateProgressBar);
  }
  requestAnimationFrame(updateProgressBar);

  // Simulated progressive load increments — advances to 90 while real loads finish
  var progressInterval = setInterval(function () {
    if (targetProgress < 90) {
      targetProgress += Math.random() * 12;
      if (targetProgress > 90) targetProgress = 90;
    }
  }, 300);

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    clearInterval(progressInterval);

    targetProgress = 100;
    if (barEl) barEl.style.width = '100%';

    setTimeout(function () {
      loaderEl.setAttribute('data-state', 'exit');
      document.documentElement.classList.remove('loader-active');

      setTimeout(function () {
        if (loaderEl && loaderEl.parentNode) {
          loaderEl.parentNode.removeChild(loaderEl);
        }
      }, EXIT_TRANSITION_MS);
    }, 150);
  }

  function whenPageAssetsReady() {
    // 1. DOM + sub-resources loaded
    var pageLoaded =
      document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise(function (resolve) {
            window.addEventListener('load', resolve, { once: true });
          });

    // 2. Fonts
    var fontsReady =
      document.fonts && document.fonts.ready
        ? document.fonts.ready.catch(function () {})
        : Promise.resolve();

    // 3. 3D assets (GLB models + textures) — populated by assetReady.js / main.js.
    //    We poll with a short rAF-delay in case the ES module hasn't executed yet.
    var assetsReady = new Promise(function (resolve) {
      function check() {
        if (window.__guchhiReady) {
          window.__guchhiReady.then(resolve, resolve);
        } else {
          // Module not yet parsed — try again next frame
          requestAnimationFrame(check);
        }
      }
      check();
    });

    return Promise.all([pageLoaded, fontsReady, assetsReady]);
  }

  function scheduleDismiss() {
    var elapsed = Date.now() - startedAt;
    window.setTimeout(dismiss, Math.max(MIN_VISIBLE_MS - elapsed, 0));
  }

  whenPageAssetsReady().then(scheduleDismiss, scheduleDismiss);

  // Hard failsafe — never block the site for more than MAX_WAIT_MS
  window.setTimeout(dismiss, MAX_WAIT_MS);
})();
