function initRevealObserver() {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observerInstance) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observerInstance.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal-element').forEach((el) => {
    observer.observe(el);
  });
}

function initShaderBackground() {
  const canvas = document.getElementById('shader-canvas-ANIMATION_4');
  if (!canvas) return;

  function syncSize() {
    const w = canvas.clientWidth || 1280;
    const h = canvas.clientHeight || 720;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(syncSize).observe(canvas);
  }
  syncSize();

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

  const fs = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float mountain(vec2 uv, float base, float amplitude, float scale, float seed) {
  float ridge = noise(vec2(uv.x * scale + seed, seed));
  ridge += 0.45 * noise(vec2(uv.x * scale * 2.2 + seed, 8.0 + seed));
  float horizon = base + ridge * amplitude;
  return 1.0 - smoothstep(horizon - 0.012, horizon + 0.012, uv.y);
}

void main() {
  vec2 uv = v_texCoord;
  float grain = noise(uv * vec2(3.0, 2.0) + u_time * 0.004);
  vec3 sky = mix(vec3(0.965, 0.962, 0.92), vec3(0.82, 0.87, 0.81), uv.y + grain * 0.035);
  float highRange = mountain(uv, 0.42, 0.075, 1.45, 0.7);
  float farRange = mountain(uv, 0.27, 0.10, 2.0, 1.4);
  float midRange = mountain(uv, 0.16, 0.16, 2.7, 3.1);
  float nearRange = mountain(uv, 0.05, 0.17, 3.8, 5.3);
  vec3 color = mix(sky, vec3(0.70, 0.77, 0.70), highRange * 0.20);
  color = mix(color, vec3(0.59, 0.67, 0.61), farRange * 0.34);
  color = mix(color, vec3(0.40, 0.52, 0.43), midRange * 0.35);
  color = mix(color, vec3(0.18, 0.31, 0.24), nearRange * 0.36);
  gl_FragColor = vec4(color, 1.0);
}`;

  function createShader(type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return shader;
  }

  const program = gl.createProgram();
  gl.attachShader(program, createShader(gl.VERTEX_SHADER, vs));
  gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(program);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(program, 'u_time');
  const uResolution = gl.getUniformLocation(program, 'u_resolution');

  function render(t) {
    if (typeof ResizeObserver === 'undefined') syncSize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (uTime) gl.uniform1f(uTime, t * 0.001);
    if (uResolution) gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }

  render(0);
}

function initThreeAnimation() {
  const container = document.getElementById('threejs-container-ANIMATION_3');
  const hero = document.getElementById('hero');
  const title = document.getElementById('hero-title');
  const description = document.getElementById('hero-desc');
  const cta = document.getElementById('hero-cta');
  if (!container || !hero || typeof THREE === 'undefined' || !THREE.OBJLoader || !THREE.GLTFLoader) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.HemisphereLight(0xfffbef, 0x304232, 1.7);
  scene.add(ambientLight);
  const keyLight = new THREE.DirectionalLight(0xffe5bc, 2.7);
  keyLight.position.set(5, 7, 8);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x8ba48d, 1.4);
  rimLight.position.set(-5, 2, -4);
  scene.add(rimLight);

  const motionGroup = new THREE.Group();
  const boxGroup = new THREE.Group();
  const mushroomGroup = new THREE.Group();
  motionGroup.add(boxGroup);
  scene.add(motionGroup);
  scene.add(mushroomGroup);
  mushroomGroup.visible = false;

  const boxTexture = new THREE.TextureLoader().load(
    'media/New%20folder/WhatsApp%20Image%202026-07-24%20at%201.51.32%20AM.jpeg'
  );
  boxTexture.encoding = THREE.sRGBEncoding;
  boxTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // The physical package is a short, wide carton. The lid pivots from its rear top edge.
  const lidHinge = new THREE.Group();
  lidHinge.position.set(0, 1.45, -0.5);
  boxGroup.add(lidHinge);
  const lidMaterial = new THREE.MeshStandardMaterial({ map: boxTexture, color: 0xffffff, roughness: 0.56 });
  const lid = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.07, 1), lidMaterial);
  lid.position.set(0, 0, 0.5);
  lidHinge.add(lid);

  function fitModel(model, targetSize) {
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

  new THREE.OBJLoader().load('media/box3D.obj', (model) => {
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const boxPivot = new THREE.Group();

    // OBJ axes are x = width, y = depth, z = height. Rotate z upright and match the photo proportions.
    model.position.sub(center);
    boxPivot.rotation.x = -Math.PI / 2;
    boxPivot.scale.set(3.25 / size.x, 1 / size.y, 2.9 / size.z);
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: boxTexture,
          color: 0xffffff,
          roughness: 0.56,
          metalness: 0
        });
      }
    });
    boxPivot.add(model);
    boxGroup.add(boxPivot);
  });

  new THREE.GLTFLoader().load('media/morel_3D_color.glb', (gltf) => {
    const model = gltf.scene;
    const softMushroomTint = new THREE.Color(0xd6c5ad);
    model.traverse((child) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (!material.isMeshStandardMaterial && !material.isMeshPhysicalMaterial) return;
        material.color.lerp(softMushroomTint, 0.24);
        material.roughness = Math.max(material.roughness || 0, 0.82);
        material.metalness = 0;
        material.emissive.set(0x3b2b20);
        material.emissiveIntensity = 0.08;
      });
    });
    fitModel(model, 1.38);
    model.rotation.z = -0.08;
    mushroomGroup.add(model);
  });

  camera.position.set(0, 0.2, 7.5);
  let scrollProgress = 0;
  let introStartedAt = null;
  const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
  const range = (value, start, end) => clamp((value - start) / (end - start));
  const ease = (value) => value * value * (3 - 2 * value);
  const boxOpeningPoint = new THREE.Vector3();
  const mushroomTarget = new THREE.Vector3(0, 0, 1.15);

  function updateProgress() {
    const scrollLength = Math.max(hero.offsetHeight - window.innerHeight, 1);
    scrollProgress = clamp((window.scrollY - hero.offsetTop) / scrollLength);
  }

  function setCopyState(element, visibility) {
    if (!element) return;
    element.style.opacity = visibility;
    element.style.transform = `translateY(${(1 - visibility) * 28}px)`;
  }

  function resize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', resize);
  resize();
  updateProgress();

  function animate(time = performance.now()) {
    requestAnimationFrame(animate);
    if (introStartedAt === null) introStartedAt = time;

    const t = scrollProgress;
    const intro = ease(clamp((time - introStartedAt) / 1150));
    const flip = ease(range(t, 0.04, 0.3));
    const open = ease(range(t, 0.3, 0.5));
    const mushroomExit = ease(range(t, 0.43, 0.62));
    const boxExit = ease(range(t, 0.5, 0.76));
    const fade = ease(range(t, 0.72, 0.96));
    const float = Math.sin(time * 0.0015) * 0.05;

    // The welcome motion ends at the screen centre; scrolling begins only after it has settled.
    motionGroup.position.y = 2.8 * (1 - intro) + boxExit * 4.8 + float;
    const boxScale = window.innerWidth < 640 ? 0.43 : window.innerWidth < 1024 ? 0.58 : 0.68;
    boxGroup.scale.setScalar(boxScale);
    motionGroup.rotation.set(flip * Math.PI, -0.28 + flip * 0.68, -0.16 - flip * 0.5);
    lidHinge.rotation.set(-open * 1.85, 0, 0);

    // Keep the mushroom independent from the exiting box, arriving at the exact screen centre before it zooms away.
    mushroomGroup.visible = mushroomExit > 0.01 && fade < 0.999;
    // Start from the centre of the opened top lid, then travel toward the screen centre.
    motionGroup.updateMatrixWorld(true);
    boxOpeningPoint.set(0, 0.16, 0.48);
    lidHinge.localToWorld(boxOpeningPoint);
    mushroomGroup.position.copy(boxOpeningPoint).lerp(mushroomTarget, mushroomExit);
    mushroomGroup.position.y += Math.sin(time * 0.0019) * 0.02;
    mushroomGroup.rotation.set(0.2 + mushroomExit * 0.25, -0.3 + mushroomExit * 0.5, -0.1);
    mushroomGroup.scale.setScalar((0.24 + mushroomExit * 0.68) * (1 + fade * 0.65));
    setModelOpacity(mushroomGroup, 1 - fade);

    setCopyState(title, Math.max(intro, ease(range(t, 0.08, 0.18))));
    setCopyState(description, ease(range(t, 0.48, 0.59)));
    setCopyState(cta, ease(range(t, 0.58, 0.68)));
    renderer.render(scene, camera);
  }

  animate();
}

function initPage() {
  initRevealObserver();
  initShaderBackground();
  initThreeAnimation();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
