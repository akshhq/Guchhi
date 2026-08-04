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
  { minWidth: 1024, count: 3 }, // desktop: 3 mushrooms
  { minWidth: 640, count: 2 },  // tablet: 2 mushrooms
  { minWidth: 0, count: 1 }     // mobile: 1 mushroom
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

/**
 * Scroll-progress (0-1) windows that drive each phase of the sequence.
 */
export const SCROLL_PHASES = {
  boxFlip: { start: 0.0, end: 0.25 },
  lidOpen: { start: 0.12, end: 0.35 },
  boxExit: { start: 0.60, end: 0.82 },
  
  // Mushroom sequence: starts AFTER box finishes opening (0.36)
  mushroomGrowth: { start: 0.36, end: 0.56, staggerPerIndex: 0.04 },
  mushroomScatter: { start: 0.52, end: 0.76 },
  mushroomScale: { start: 0.70, end: 0.88 },
  mushroomFade: { start: 0.82, end: 0.96 },

  // Text copy transitions
  titleIntro: { start: 0.05, end: 0.15 },
  descriptionIn: { start: 0.40, end: 0.55 },
  ctaIn: { start: 0.50, end: 0.65 }
};

export const INTRO_DURATION_MS = 1100;
export const MODEL_LOAD_TIMEOUT_MS = 4500;
export const MUSHROOM_TARGET_SIZE = 0.65;

