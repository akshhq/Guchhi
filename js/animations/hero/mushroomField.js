/**
 * mushroomField.js
 * Owns every mushroom instance: loading the shared GLB, cloning it per
 * responsive tier, and animating growth-from-the-box, idle floating,
 * scroll-driven convergence toward camera-center, and a cinematic fade.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  ASSET_PATHS,
  MUSHROOM_BREAKPOINTS,
  SPREAD_BY_COUNT,
  SCROLL_PHASES,
  CONVERGE_TARGET,
  ZOOM_TARGET,
  MODEL_LOAD_TIMEOUT_MS,
  MUSHROOM_TARGET_SIZE
} from './config.js';
import { ease, rangeProgress, clamp, seededRandom } from './mathUtils.js';

function getResponsiveMushroomCount() {
  const width = window.innerWidth;
  const match = MUSHROOM_BREAKPOINTS.find((tier) => width >= tier.minWidth);
  return match ? match.count : 1;
}

function fitModelToSize(model, targetSize) {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const largestDimension = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / largestDimension;
  model.scale.multiplyScalar(scale);
  model.position.sub(center.multiplyScalar(scale));
}

function setModelOpacity(model, opacity) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      material.transparent = opacity < 0.999;
      material.opacity = opacity;
      material.depthWrite = opacity > 0.08;
    });
  });
}

function cloneModelWithOwnMaterials(source) {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    child.material = materials.map((material) => material.clone());
  });
  return clone;
}

function disposeModel(model) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      Object.values(material).forEach((value) => value?.isTexture && value.dispose());
      material.dispose();
    });
  });
}

/**
 * Builds the per-mushroom animation profile: emergence point on the box top
 * face, resting float position, growth timing, and small natural
 * imperfections so instances never look mechanically identical.
 */
function createMushroomProfile(index, total, boxWidth, boxHeight) {
  const spread = SPREAD_BY_COUNT[total] || SPREAD_BY_COUNT[1];
  const xFrac = spread[index] ?? 0;
  const jitter = seededRandom(index + 1);
  const zJitter = (jitter - 0.5) * 0.22;
  const heightJitter = 0.85 + jitter * 0.3;

  const { start, end, staggerPerIndex } = SCROLL_PHASES.mushroomGrowth;

  return {
    emergeLocal: new THREE.Vector3(xFrac * (boxWidth / 2) * 0.85, boxHeight / 2 - 0.05, zJitter),
    floatLocal: new THREE.Vector3(
      xFrac * (boxWidth / 2) * 1.05,
      boxHeight / 2 + 0.9 * heightJitter,
      zJitter * 1.6
    ),
    rotationBase: new THREE.Vector3(0.14 + index * 0.02, -0.15 + index * 0.12, -0.04 + index * 0.03),
    scaleBase: 0.9 + jitter * 0.22,
    growthStart: start + index * staggerPerIndex,
    growthEnd: end + index * staggerPerIndex,
    floatPhase: index * 1.7 + jitter,
    frozenAnchor: null
  };
}

/**
 * @param {{ renderer: THREE.WebGLRenderer, boxTopLocalPoint: THREE.Vector3, getBoxMatrixWorld: () => THREE.Matrix4 }} deps
 */
export function createMushroomField({ boxWidth, boxHeight, getBoxMatrixWorld }) {
  const root = new THREE.Group();

  let baseModel = null;
  let instances = [];
  let currentCount = 0;
  let modelReady = false;

  function buildInstances(count) {
    root.clear();
    instances = [];
    if (!baseModel) return;

    for (let i = 0; i < count; i += 1) {
      const instance = cloneModelWithOwnMaterials(baseModel);
      instance.userData.profile = createMushroomProfile(i, count, boxWidth, boxHeight);
      instance.visible = false;
      root.add(instance);
      instances.push(instance);
    }
    currentCount = count;
  }

  function activateModel(model) {
    if (modelReady) return;
    modelReady = true;
    baseModel = model;
    buildInstances(getResponsiveMushroomCount());
  }

  function tintModel(model) {
    const tint = new THREE.Color(0xd6c5ad);
    model.traverse((child) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (!material.isMeshStandardMaterial && !material.isMeshPhysicalMaterial) return;
        material.color.lerp(tint, 0.24);
        material.roughness = Math.max(material.roughness || 0, 0.82);
        material.metalness = 0;
        material.emissive?.set(0x3b2b20);
        material.emissiveIntensity = 0.08;
      });
    });
  }

  function load() {
    const loader = new GLTFLoader();
    let settled = false;

    const finish = (model) => {
      if (settled) return;
      settled = true;
      activateModel(model);
    };

    loader.load(
      ASSET_PATHS.mushroomModel,
      (gltf) => {
        tintModel(gltf.scene);
        fitModelToSize(gltf.scene, MUSHROOM_TARGET_SIZE);
        gltf.scene.rotation.z = -0.06;
        finish(gltf.scene);
      },
      undefined,
      (error) => {
        console.warn('Guchhi hero: mushroom model failed to load.', error);
      }
    );

    // Failsafe: if loading hangs, the hero still finishes without mushrooms
    // rather than blocking the rest of the animation state forever.
    setTimeout(() => {
      if (!settled) settled = true;
    }, MODEL_LOAD_TIMEOUT_MS);
  }

  function refreshResponsiveCount() {
    const nextCount = getResponsiveMushroomCount();
    if (nextCount !== currentCount && baseModel) {
      buildInstances(nextCount);
    }
  }

  const localPoint = new THREE.Vector3();
  const worldPoint = new THREE.Vector3();
  const finalPosition = new THREE.Vector3();
  const convergeTarget = new THREE.Vector3(CONVERGE_TARGET.x, CONVERGE_TARGET.y, CONVERGE_TARGET.z);
  const zoomTarget = new THREE.Vector3(ZOOM_TARGET.x, ZOOM_TARGET.y, ZOOM_TARGET.z);

  /**
   * @param {number} scrollProgress 0-1 progress through the pinned hero scroll range.
   * @param {number} elapsedMs time since animation start, for idle float + time-based growth fallback.
   */
  function update(scrollProgress, elapsedMs) {
    const convergeAmount = ease(rangeProgress(scrollProgress, SCROLL_PHASES.converge.start, SCROLL_PHASES.converge.end));
    const zoomAmount = ease(rangeProgress(scrollProgress, SCROLL_PHASES.zoom.start, SCROLL_PHASES.zoom.end));
    const fadeAmount = ease(rangeProgress(scrollProgress, SCROLL_PHASES.fade.start, SCROLL_PHASES.fade.end));
    const boxMatrixWorld = getBoxMatrixWorld();

    instances.forEach((instance) => {
      const profile = instance.userData.profile;

      const scrollGrowth = ease(rangeProgress(scrollProgress, profile.growthStart, profile.growthEnd));
      // Time-based fallback so a visitor who never scrolls still sees the
      // mushrooms emerge shortly after load, layered under the scroll-driven growth.
      const timeGrowth = ease(clamp((elapsedMs - 1800 - profile.floatPhase * 220) / 1000));
      const growthAmount = Math.max(scrollGrowth, timeGrowth);

      if (growthAmount <= 0) {
        instance.visible = false;
        profile.frozenAnchor = null;
        return;
      }

      instance.visible = fadeAmount < 0.999;
      if (!instance.visible) return;

      // Rise from the box's top face toward the floating position — a
      // gentle upward growth pulse rather than a launch arc.
      if (growthAmount < 0.999 || !profile.frozenAnchor) {
        localPoint.lerpVectors(profile.emergeLocal, profile.floatLocal, growthAmount);
        localPoint.y += Math.sin(growthAmount * Math.PI) * 0.08;
        worldPoint.copy(localPoint).applyMatrix4(boxMatrixWorld);

        if (growthAmount >= 0.999) {
          // Freeze the anchor once fully grown so the box's later exit
          // motion doesn't drag the already-floating mushroom along with it.
          profile.frozenAnchor = worldPoint.clone();
        }
      } else {
        worldPoint.copy(profile.frozenAnchor);
      }

      // Continuous idle float once grown — subtle bob and drift, never spin.
      const floatBob = Math.sin(elapsedMs * 0.0014 + profile.floatPhase) * 0.055 * growthAmount;
      const floatDrift = Math.cos(elapsedMs * 0.001 + profile.floatPhase) * 0.03 * growthAmount;
      worldPoint.y += floatBob;
      worldPoint.x += floatDrift;

      // Scroll-driven convergence toward a shared center point…
      const convergeBlend = convergeAmount * growthAmount;
      finalPosition.lerpVectors(worldPoint, convergeTarget, convergeBlend);
      // …then a further push toward the camera as it zooms and fades.
      finalPosition.lerp(zoomTarget, zoomAmount * growthAmount);

      instance.position.copy(finalPosition);

      const growthTilt = (1 - growthAmount) * 0.5;
      instance.rotation.set(
        profile.rotationBase.x + growthTilt + Math.sin(elapsedMs * 0.0009 + profile.floatPhase) * 0.025,
        profile.rotationBase.y + growthTilt * 1.4 + Math.cos(elapsedMs * 0.0008 + profile.floatPhase) * 0.025,
        profile.rotationBase.z + Math.sin(elapsedMs * 0.0011 + profile.floatPhase) * 0.02
      );

      const zoomScale = 1 + zoomAmount * 0.55;
      instance.scale.setScalar(growthAmount * profile.scaleBase * zoomScale * (1 - fadeAmount));

      setModelOpacity(instance, growthAmount * (1 - fadeAmount));
    });
  }

  function dispose() {
    instances.forEach(disposeModel);
    if (baseModel) disposeModel(baseModel);
    root.clear();
  }

  return { root, load, update, refreshResponsiveCount, dispose };
}
