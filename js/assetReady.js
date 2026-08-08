/**
 * assetReady.js
 * Lightweight promise bus that lets independent asset loaders (textures, GLB
 * models, shaders) signal completion to the page-loader without coupling them
 * together or knowing about each other.
 *
 * Usage:
 *   // In any loader module:
 *   import { registerAsset } from '../assetReady.js';
 *   const done = registerAsset('morel-glb');
 *   loader.load(url, (gltf) => { ...setup...; done(); }, undefined, done);
 *
 *   // In loader.js (classic script, no imports):
 *   window.__guchhiReady   → Promise that resolves when all registered assets are done
 */

const _pending = [];
let _sealed = false;

let _masterResolve;
const _masterPromise = new Promise((res) => { _masterResolve = res; });

function _checkDone() {
  if (_pending.every((p) => p.done)) {
    _masterResolve();
  }
}

/**
 * Register a named asset. Returns a callback; call it (with or without an
 * argument) when the asset is ready OR has failed — either way the loader
 * should proceed.
 *
 * @param {string} name  Human-readable label for debugging.
 * @returns {() => void} done callback
 */
export function registerAsset(name) {
  if (_sealed) {
    // Called too late — just return a no-op so the caller doesn't break.
    console.warn(`[assetReady] registerAsset('${name}') called after seal — ignoring.`);
    return () => {};
  }
  const entry = { name, done: false };
  _pending.push(entry);

  return function markDone() {
    if (!entry.done) {
      entry.done = true;
      _checkDone();
    }
  };
}

/**
 * Seal the registry — no more assets can be registered after this.
 * Call once, after all modules have had a chance to register.
 * If nothing was registered at all, resolves immediately.
 */
export function sealAssets() {
  _sealed = true;
  _checkDone(); // handles the zero-registration edge case
}

// Expose the master promise on window so classic (non-module) loader.js can
// await it without needing ES-module import syntax.
window.__guchhiReady = _masterPromise;
