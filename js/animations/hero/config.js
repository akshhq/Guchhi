/**
 * config.js
 * All tunable constants for the hero box + mushroom animation live here so
 * behaviour can be adjusted without hunting through animation logic.
 */

export const DOM_IDS = {
  container: 'threejs-container-ANIMATION_3',
  hero: 'hero',
  title: 'hero-title',
  description: 'hero-desc',
  cta: 'hero-cta'
};

export const ASSET_PATHS = {
  mushroomModel: 'media/morel_3D_color.glb',
  boxTexture: (name) => `media/texture/${name}`
};

/** Responsive mushroom count by viewport width (min-width breakpoints, px). */
export const MUSHROOM_BREAKPOINTS = [
  { minWidth: 1200, count: 4 }, // desktop
  { minWidth: 992, count: 3 }, // laptop
  { minWidth: 640, count: 2 }, // tablet
  { minWidth: 0, count: 1 } // mobile
];

export const BOX_GEOMETRY = {
  width: 2.35,
  height: 2.35,
  depth: 1,
  lidThickness: 0.07
};

export const CAMERA = {
  fov: 42,
  near: 0.1,
  far: 100,
  position: { x: 0, y: 0.2, z: 7.5 }
};

/** Where mushrooms converge to, then push toward, before fading. */
export const CONVERGE_TARGET = { x: 0, y: 0.35, z: 2.1 };
export const ZOOM_TARGET = { x: 0, y: 0.45, z: 4.6 };

/** Horizontal spread (fraction of half box-width) across the top face, by tier count. */
export const SPREAD_BY_COUNT = {
  1: [0],
  2: [-0.5, 0.5],
  3: [-0.7, 0, 0.7],
  4: [-0.85, -0.3, 0.3, 0.85]
};

/**
 * Scroll-progress (0-1) windows that drive each phase of the sequence.
 * `stagger` values are added per mushroom index so instances move slightly
 * out of sync with one another for a more organic, less mechanical feel.
 */
export const SCROLL_PHASES = {
  boxFlip: { start: 0.0, end: 0.25 },
  lidOpen: { start: 0.2, end: 0.44 },
  boxExit: { start: 0.62, end: 0.84 },
  mushroomGrowth: { start: 0.27, end: 0.45, staggerPerIndex: 0.035 },
  converge: { start: 0.55, end: 0.8 },
  zoom: { start: 0.75, end: 0.95 },
  fade: { start: 0.86, end: 1.0 },
  titleIntro: { start: 0.08, end: 0.18 },
  descriptionIn: { start: 0.48, end: 0.6 },
  ctaIn: { start: 0.58, end: 0.69 }
};

export const INTRO_DURATION_MS = 1100;
export const MODEL_LOAD_TIMEOUT_MS = 4500;
export const MUSHROOM_TARGET_SIZE = 1.6;
