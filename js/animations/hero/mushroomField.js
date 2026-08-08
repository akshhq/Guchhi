/**
 * mushroomField.js
 * 3D Mushroom Field Manager for Guchhi Hero Animation.
 *
 * Trajectory Improvements:
 * - Emergence starts directly AT the mouth of the box lid (boxWorldPos.y + 0.38).
 * - Ultra-smooth Hermite curve (smoothstep) with a low-profile trajectory.
 * - Smooth, subtle X-dip (-X) that flows seamlessly into horizontal scatter.
 * - Compact refined size (MUSHROOM_TARGET_SIZE = 0.65).
 * - Lightened warm cream texture & slow Y-axis spin.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  ASSET_PATHS,
  MUSHROOM_BREAKPOINTS,
  SCROLL_PHASES,
  MUSHROOM_TARGET_SIZE
} from './config.js';
import { ease, rangeProgress, clamp, seededRandom } from './mathUtils.js';

function getResponsiveMushroomCount() {
  const width = window.innerWidth;
  const match = MUSHROOM_BREAKPOINTS.find((tier) => width >= tier.minWidth);
  return match ? match.count : 1;
}

let modelFittedScale = 1.0;

function fitModel(model, targetSize) {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const largestDimension = Math.max(size.x, size.y, size.z) || 1;
  modelFittedScale = targetSize / largestDimension;
  model.scale.setScalar(modelFittedScale);
}

function setModelOpacity(model, opacity) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      material.transparent = opacity < 0.99;
      material.opacity = clamp(opacity, 0, 1);
      material.depthWrite = opacity > 0.15;
    });
  });
}

function getScatterX(index, total) {
  if (total === 1) return 0;
  if (total === 2) return index === 0 ? -1.5 : 1.5;
  if (index === 0) return -2.4;
  if (index === 1) return 0;
  return 2.4;
}

function createMushroomProfile(index, total) {
  const jitter = seededRandom(index + 27);
  const zJitter = (jitter - 0.5) * 0.25;
  const scatterX = getScatterX(index, total);

  const { start, end, staggerPerIndex } = SCROLL_PHASES.mushroomGrowth;
  const growthStart = start + index * staggerPerIndex;
  const growthEnd = Math.min(end + index * staggerPerIndex, 0.56);

  const offsetX = (index - (total - 1) / 2) * 0.4;

  return {
    offsetX,
    // Scatter target centered in vertical viewport
    scatterTarget: new THREE.Vector3(scatterX, -0.05, 3.2 + zJitter),
    rotationBase: new THREE.Vector3(-Math.PI / 2, (index - (total - 1) / 2) * 0.3, 0),
    scaleBase: 0.85 + jitter * 0.1,
    growthStart,
    growthEnd,
    floatPhase: index * 1.7 + jitter,
    frozenAnchor: null
  };
}

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
      const instance = baseModel.clone(true);
      instance.userData.profile = createMushroomProfile(i, count);
      instance.visible = false;
      root.add(instance);
      instances.push(instance);
    }
    currentCount = count;
  }

  function activateModel(model) {
    modelReady = true;
    baseModel = model;
    buildInstances(getResponsiveMushroomCount());
  }

  /**
   * Lightens texture with warm cream tint and emissive ambient glow.
   */
  function tintModel(model) {
    const lightTint = new THREE.Color(0xffeedd);
    model.traverse((child) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.side = THREE.DoubleSide;
        if (!material.isMeshStandardMaterial && !material.isMeshPhysicalMaterial) return;
        material.color.lerp(lightTint, 0.35);
        material.roughness = Math.max(material.roughness || 0, 0.65);
        material.metalness = 0;
        material.emissive?.set(0x5c4838);
        material.emissiveIntensity = 0.22;
      });
    });
  }

  function load() {
    const loader = new GLTFLoader();
    loader.load(
      ASSET_PATHS.mushroomModel,
      (gltf) => {
        tintModel(gltf.scene);
        fitModel(gltf.scene, MUSHROOM_TARGET_SIZE);
        activateModel(gltf.scene);
      },
      undefined,
      (error) => {
        console.warn('Guchhi hero: mushroom model failed to load.', error);
      }
    );
  }

  function refreshResponsiveCount() {
    const nextCount = getResponsiveMushroomCount();
    if (nextCount !== currentCount && baseModel) {
      buildInstances(nextCount);
    }
  }

  const localPos = new THREE.Vector3();
  const worldPoint = new THREE.Vector3();
  const finalPosition = new THREE.Vector3();

  /**
   * @param {number} scrollProgress 0-1 progress through hero scroll range.
   * @param {number} elapsedMs time since animation start.
   */
  function update(scrollProgress, elapsedMs) {
    const scatterAmount = ease(rangeProgress(scrollProgress, SCROLL_PHASES.mushroomScatter.start, SCROLL_PHASES.mushroomScatter.end));
    const scaleAmount = ease(rangeProgress(scrollProgress, SCROLL_PHASES.mushroomScale.start, SCROLL_PHASES.mushroomScale.end));
    const fadeAmount = ease(rangeProgress(scrollProgress, SCROLL_PHASES.mushroomFade.start, SCROLL_PHASES.mushroomFade.end));

    // Get box matrix world transform
    const boxMatrixWorld = getBoxMatrixWorld();

    instances.forEach((instance) => {
      const profile = instance.userData.profile;

      // Emergence progress (0 -> 1) starts AFTER box finishes opening (scroll 0.36+)
      const rawGrowth = rangeProgress(scrollProgress, profile.growthStart, profile.growthEnd);
      const growthAmount = ease(rawGrowth);

      if (fadeAmount >= 0.99) {
        instance.visible = false;
        profile.frozenAnchor = null;
        return;
      }

      instance.visible = growthAmount > 0;
      if (!instance.visible) return;

      // Phase 1: Emergence directly out of the top face opening of the wooden box
      if (growthAmount < 0.999 || !profile.frozenAnchor) {
        const t = growthAmount;
        const smoothT = t * t * (3 - 2 * t);

        // Local box top face center is at Y = boxHeight / 2 (1.175).
        // Emergence starts right at top face rim (boxHeight / 2 - 0.05) and ascends straight out of top face.
        const localX = profile.offsetX * (0.25 + smoothT * 0.45);
        const localY = (boxHeight / 2 - 0.05) + (smoothT * 1.35) + (Math.sin(smoothT * Math.PI) * 0.12);
        const localZ = 0.05 + (smoothT * 0.40);

        localPos.set(localX, localY, localZ);
        // Transform local box top-face coordinate directly to 3D world space
        worldPoint.copy(localPos).applyMatrix4(boxMatrixWorld);

        if (growthAmount >= 0.999) {
          profile.frozenAnchor = worldPoint.clone();
        }
      } else {
        worldPoint.copy(profile.frozenAnchor);
      }

      // Continuous subtle float bobbing
      const floatBob = Math.sin(elapsedMs * 0.0014 + profile.floatPhase) * 0.05;
      const floatDrift = Math.cos(elapsedMs * 0.0009 + profile.floatPhase) * 0.025;
      worldPoint.y += floatBob;
      worldPoint.x += floatDrift;

      // Phase 2: Smooth scatter transition horizontally across screen
      finalPosition.lerpVectors(worldPoint, profile.scatterTarget, scatterAmount);

      // Phase 3: Push & scale up toward camera
      finalPosition.z += scaleAmount * 1.5;
      finalPosition.y += scaleAmount * 0.2;

      instance.position.copy(finalPosition);

      // Continuous slow Y-axis spin rotation + upright base (-Math.PI/2 on X)
      const slowSpinY = profile.rotationBase.y + elapsedMs * 0.0007 + profile.floatPhase;
      const emergenceTiltX = (1 - growthAmount) * 0.22;

      instance.rotation.set(
        profile.rotationBase.x + emergenceTiltX + Math.sin(elapsedMs * 0.001 + profile.floatPhase) * 0.03,
        slowSpinY,
        profile.rotationBase.z + Math.sin(elapsedMs * 0.0012 + profile.floatPhase) * 0.03
      );

      // Compact proportioned scaling
      const baseScale = (0.3 + 0.7 * growthAmount) * profile.scaleBase;
      const scaleMultiplier = 1 + scaleAmount * 0.45;
      const finalScale = modelFittedScale * baseScale * scaleMultiplier;

      instance.scale.setScalar(finalScale);

      // Opacity calculation
      const opacity = (0.4 + 0.6 * growthAmount) * (1 - fadeAmount);
      setModelOpacity(instance, opacity);
    });
  }

  function dispose() {
    instances.forEach(disposeModel);
    if (baseModel) disposeModel(baseModel);
    root.clear();
  }

  return { root, load, update, refreshResponsiveCount, dispose };
}
