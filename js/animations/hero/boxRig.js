/**
 * boxRig.js
 * The premium wooden box: a textured body plus a hinged lid that swings
 * open. Exposes a single `update(progress)` call so the orchestrator never
 * needs to know about hinges, materials or geometry.
 */

import * as THREE from 'three';
import { BOX_GEOMETRY, ASSET_PATHS, SCROLL_PHASES } from './config.js';
import { ease, rangeProgress } from './mathUtils.js';
import { registerAsset } from '../../assetReady.js';

const FACE_FILES = {
  right: 'right.jpeg',
  left: 'left.jpeg',
  top: 'top.jpeg',
  bottom: 'buttom.jpeg',
  front: 'front.jpeg',
  back: 'back.jpeg'
};

function loadBoxMaterials(renderer) {
  const textureLoader = new THREE.TextureLoader();
  const materials = {};
  const faceEntries = Object.entries(FACE_FILES);
  const doneTextures = registerAsset('box-textures');
  let loaded = 0;
  const total = faceEntries.length;

  faceEntries.forEach(([face, fileName]) => {
    const texture = textureLoader.load(
      ASSET_PATHS.boxTexture(fileName),
      () => { if (++loaded >= total) doneTextures(); },
      undefined,
      () => { if (++loaded >= total) doneTextures(); }
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    materials[face] = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.62 });
  });

  // Box geometry face order: +x, -x, +y, -y, +z, -z
  return [materials.right, materials.left, materials.top, materials.bottom, materials.front, materials.back];
}

/**
 * @param {THREE.WebGLRenderer} renderer
 * @returns {{ root: THREE.Group, top: THREE.Vector3, update: (progress: number, floatOffset: number) => void, dispose: () => void }}
 */
export function createBoxRig(renderer) {
  const { width, height, depth, lidThickness } = BOX_GEOMETRY;
  const materials = loadBoxMaterials(renderer);

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials);
  bodyGroup.add(body);

  const lidHinge = new THREE.Group();
  lidHinge.position.set(0, height / 2, -depth / 2);
  bodyGroup.add(lidHinge);

  const lid = new THREE.Mesh(new THREE.BoxGeometry(width, lidThickness, depth), materials);
  lid.position.set(0, 0, depth / 2);
  lidHinge.add(lid);

  /** Local-space point on the box's top face, used as the mushroom emergence anchor. */
  const topFaceCenter = new THREE.Vector3(0, height / 2, 0);

  /**
   * @param {number} scrollProgress 0-1 progress through the pinned hero scroll range.
   * @param {number} introAmount 0-1 eased entrance progress, driven by elapsed time since load.
   * @param {number} floatOffset small continuous idle bob, in scene units.
   */
  function update(scrollProgress, introAmount, floatOffset) {
    const flip = ease(rangeProgress(scrollProgress, SCROLL_PHASES.boxFlip.start, SCROLL_PHASES.boxFlip.end));
    const open = ease(rangeProgress(scrollProgress, SCROLL_PHASES.lidOpen.start, SCROLL_PHASES.lidOpen.end));
    const exit = ease(rangeProgress(scrollProgress, SCROLL_PHASES.boxExit.start, SCROLL_PHASES.boxExit.end));

    const isMobile = window.innerWidth < 768;
    const dropInHeight = isMobile ? 1.95 : 2.8;
    const exitTravel = isMobile ? 4.1 : 4.8;

    root.rotation.set(flip * Math.PI, -0.28 + flip * 0.68, -0.16 - flip * 0.5);
    // Settles in from above on load (introAmount 0 -> 1), then rises away on scroll exit.
    root.position.y = dropInHeight * (1 - introAmount) + exit * exitTravel + floatOffset;

    const scale = isMobile ? 0.34 : window.innerWidth < 1200 ? 0.52 : 0.68;
    bodyGroup.scale.setScalar(scale);
    lidHinge.rotation.set(-open * 1.85, 0, 0);

    // Box fades out once the mushrooms have taken over the visual focus.
    materials.forEach((material) => {
      material.transparent = exit > 0.001;
      material.opacity = 1 - exit;
      material.depthWrite = exit < 0.95;
    });

    root.updateMatrixWorld(true);
  }

  function dispose() {
    body.geometry.dispose();
    lid.geometry.dispose();
    materials.forEach((material) => {
      material.map?.dispose();
      material.dispose();
    });
  }

  return { root, bodyGroup, topFaceCenter, update, dispose };
}
