/**
 * loader.js
 * Netflix-style brand intro that doubles as a real asset preloader.
 * Tracks asset progress (fonts, page load, window assets) and smoothly drives
 * a progress bar before performing an elegant wipe-up exit.
 *
 * Written as a plain classic IIFE (not an ES module) for maximum robustness.
 */
(function () {
  var loaderEl = document.getElementById('page-loader');
  var barEl = document.getElementById('page-loader-bar');
  if (!loaderEl) return;

  var MIN_VISIBLE_MS = 2200; // Allow brand moment to breathe
  var MAX_WAIT_MS = 5500;   // Failsafe timeout
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

  // Simulated progressive load increments
  var progressInterval = setInterval(function () {
    if (targetProgress < 90) {
      targetProgress += Math.random() * 20;
      if (targetProgress > 90) targetProgress = 90;
    }
  }, 250);

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

  // Hard failsafe
  window.setTimeout(dismiss, MAX_WAIT_MS);
})();
