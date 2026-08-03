/**
 * hero/index.js
 * Entry point for the hero animation. Wires the scene rig, box rig, mushroom
 * field and scroll driver together, runs a single render loop, and pauses
 * that loop whenever the hero is scrolled out of view to save GPU/battery.
 *
 * Public API: `initHeroAnimation()` — safe to call once; a repeat call is a
 * no-op. Fails silently (leaving the static hero markup intact) if the
 * required DOM nodes are missing or WebGL isn't available.
 */

import { createSceneRig, isWebGLAvailable } from './sceneSetup.js';
import { createBoxRig } from './boxRig.js';
import { createMushroomField } from './mushroomField.js';
import { createScrollDriver } from './scrollDriver.js';
import { DOM_IDS, BOX_GEOMETRY, SCROLL_PHASES, INTRO_DURATION_MS } from './config.js';
import { ease, rangeProgress } from './mathUtils.js';

let hasInitialized = false;

function setCopyVisibility(element, visibility) {
  if (!element) return;
  element.style.opacity = String(visibility);
  element.style.transform = `translateY(${(1 - visibility) * 28}px)`;
}

export function initHeroAnimation() {
  if (hasInitialized) return;

  const container = document.getElementById(DOM_IDS.container);
  const hero = document.getElementById(DOM_IDS.hero);
  if (!container || !hero || !isWebGLAvailable()) return;

  hasInitialized = true;

  const title = document.getElementById(DOM_IDS.title);
  const description = document.getElementById(DOM_IDS.description);
  const cta = document.getElementById(DOM_IDS.cta);

  const { scene, camera, renderer, resize, dispose: disposeSceneRig } = createSceneRig(container);
  const boxRig = createBoxRig(renderer);
  const mushroomField = createMushroomField({
    boxWidth: BOX_GEOMETRY.width,
    boxHeight: BOX_GEOMETRY.height,
    getBoxMatrixWorld: () => boxRig.bodyGroup.matrixWorld
  });

  scene.add(boxRig.root);
  scene.add(mushroomField.root);
  mushroomField.load();

  const scrollDriver = createScrollDriver(hero);

  let isVisible = true;
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      isVisible = entries.some((entry) => entry.isIntersecting);
    },
    { threshold: 0 }
  );
  visibilityObserver.observe(hero);

  function handleResize() {
    resize();
    mushroomField.refreshResponsiveCount();
  }
  window.addEventListener('resize', handleResize);
  resize();

  let animationFrameId = null;
  let introStartedAt = null;

  function renderFrame(time) {
    animationFrameId = requestAnimationFrame(renderFrame);
    if (!isVisible) return;

    if (introStartedAt === null) introStartedAt = time;
    const introAmount = ease(Math.min((time - introStartedAt) / INTRO_DURATION_MS, 1));
    const scrollProgress = scrollDriver.value;
    const idleFloat = Math.sin(time * 0.0015) * 0.05;

    boxRig.update(scrollProgress, introAmount, idleFloat);
    mushroomField.update(scrollProgress, time);

    setCopyVisibility(title, Math.max(introAmount, ease(rangeProgress(scrollProgress, SCROLL_PHASES.titleIntro.start, SCROLL_PHASES.titleIntro.end))));
    setCopyVisibility(description, ease(rangeProgress(scrollProgress, SCROLL_PHASES.descriptionIn.start, SCROLL_PHASES.descriptionIn.end)));
    setCopyVisibility(cta, ease(rangeProgress(scrollProgress, SCROLL_PHASES.ctaIn.start, SCROLL_PHASES.ctaIn.end)));

    renderer.render(scene, camera);
  }
  animationFrameId = requestAnimationFrame(renderFrame);

  function teardown() {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', handleResize);
    visibilityObserver.disconnect();
    scrollDriver.dispose();
    mushroomField.dispose();
    boxRig.dispose();
    disposeSceneRig();
  }
  window.addEventListener('pagehide', teardown, { once: true });
}
