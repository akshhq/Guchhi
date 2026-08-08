/**
 * backgroundMushroom.js
 * Renders a slow-rotating 3D Morel mushroom in the background for all sections
 * except the hero section.
 *
 * Key features:
 * - Orientation: Z-axis facing user displays top view (cap facing camera).
 * - Low opacity: 0.10 translucency to serve as an elegant ambient detail.
 * - Rotates continuously on its top-view axis.
 * - Section control: Fades out in Hero section, fades in when scrolled into rest of sections.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let hasInitialized = false;

function resolveAssetPath(filename) {
  if (window.location.pathname.includes('/products/')) {
    return `../media/${filename}`;
  }
  return `media/${filename}`;
}

export function initBackgroundMushroom() {
  if (hasInitialized) return;

  let canvas = document.getElementById('bg-mushroom-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'bg-mushroom-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block;';
    document.body.appendChild(canvas);
  }

  const glTest = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
  if (!glTest) return;

  hasInitialized = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const ambientLight = new THREE.AmbientLight(0xffeedd, 1.8);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(3, 5, 5);
  scene.add(dirLight);

  const backLight = new THREE.DirectionalLight(0x88b090, 0.8);
  backLight.position.set(-3, -4, -2);
  scene.add(backLight);

  const mushroomGroup = new THREE.Group();
  scene.add(mushroomGroup);

  let modelLoaded = false;
  const TARGET_OPACITY = 0.10;
  let currentOpacity = 0;
  let isHeroVisible = false;

  const heroSection = document.getElementById('hero');
  if (heroSection) {
    const observer = new IntersectionObserver((entries) => {
      isHeroVisible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0.1);
    }, { threshold: [0, 0.1, 0.5] });
    observer.observe(heroSection);
  }

  function setModelOpacity(model, opacity) {
    model.traverse((child) => {
      if (!child.isMesh) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        mat.transparent = true;
        mat.opacity = opacity;
        mat.depthWrite = false;
      });
    });
  }

  const loader = new GLTFLoader();
  const modelPath = resolveAssetPath('morel_3D_color.glb');

  loader.load(
    modelPath,
    (gltf) => {
      const model = gltf.scene;

      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const targetSize = 2.4;
      const scale = targetSize / maxDim;
      model.scale.setScalar(scale);

      const center = bounds.getCenter(new THREE.Vector3());
      model.position.sub(center.multiplyScalar(scale));

      // TOP VIEW ORIENTATION:
      // In GLTF, cap is +Y. Rotating X by -Math.PI / 2 points cap directly toward +Z facing user.
      model.rotation.set(-Math.PI / 2 + 0.15, 0, 0);

      const warmCream = new THREE.Color(0xfff2e6);
      model.traverse((child) => {
        if (!child.isMesh) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          mat.side = THREE.DoubleSide;
          if (mat.color) mat.color.lerp(warmCream, 0.25);
          mat.transparent = true;
          mat.opacity = 0;
          mat.depthWrite = false;
        });
      });

      mushroomGroup.add(model);
      modelLoaded = true;
    },
    undefined,
    (err) => console.warn('Background mushroom load failed:', err)
  );

  function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', handleResize);

  let animationFrameId = null;

  function animate(time) {
    animationFrameId = requestAnimationFrame(animate);

    const desiredOpacity = (heroSection && isHeroVisible) ? 0 : TARGET_OPACITY;

    currentOpacity += (desiredOpacity - currentOpacity) * 0.06;
    if (Math.abs(desiredOpacity - currentOpacity) < 0.001) {
      currentOpacity = desiredOpacity;
    }

    if (modelLoaded) {
      if (currentOpacity > 0.001) {
        mushroomGroup.visible = true;
        setModelOpacity(mushroomGroup, currentOpacity);

        const elapsedSec = time * 0.001;
        mushroomGroup.rotation.z = elapsedSec * 0.18;
        mushroomGroup.rotation.y = Math.sin(elapsedSec * 0.5) * 0.12;

        const floatY = Math.sin(elapsedSec * 0.7) * 0.15;
        const floatX = Math.cos(elapsedSec * 0.5) * 0.10;

        const responsiveX = window.innerWidth < 768 ? 0 : 1.3;
        mushroomGroup.position.set(responsiveX + floatX, floatY, 0);

        renderer.render(scene, camera);
      } else {
        mushroomGroup.visible = false;
        renderer.clear();
      }
    }
  }

  animationFrameId = requestAnimationFrame(animate);
}
