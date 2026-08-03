/**
 * sceneSetup.js
 * Builds the Three.js scene, camera, renderer and lighting rig for the hero
 * animation. Kept separate from animation/content logic so the render target
 * can be reasoned about (and disposed of) independently.
 */

import * as THREE from 'three';
import { CAMERA } from './config.js';

/**
 * @param {HTMLElement} container
 * @returns {{ scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, resize: () => void, dispose: () => void }}
 */
export function createSceneRig(container) {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);
  camera.position.set(CAMERA.position.x, CAMERA.position.y, CAMERA.position.z);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const hemisphereLight = new THREE.HemisphereLight(0xfffbef, 0x304232, 1.7);
  const keyLight = new THREE.DirectionalLight(0xffe5bc, 2.7);
  keyLight.position.set(5, 7, 8);
  const rimLight = new THREE.DirectionalLight(0x8ba48d, 1.4);
  rimLight.position.set(-5, 2, -4);
  scene.add(hemisphereLight, keyLight, rimLight);

  function resize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function dispose() {
    renderer.dispose();
    hemisphereLight.dispose?.();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  }

  return { scene, camera, renderer, resize, dispose };
}

/** Feature-detects WebGL so the caller can fail safely without throwing. */
export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext) &&
      Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch (error) {
    return false;
  }
}
