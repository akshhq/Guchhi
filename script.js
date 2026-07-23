function initHeroAnimation() {
  const title = document.getElementById('hero-title');
  const description = document.getElementById('hero-desc');
  const cta = document.querySelector('#hero-text-container a');

  if (!title || !description) return;

  setTimeout(() => {
    title.style.opacity = '1';
    title.style.transform = 'translateY(0)';
  }, 500);

  setTimeout(() => {
    description.style.opacity = '1';
    description.style.transform = 'translateY(0)';
  }, 1000);

  setTimeout(() => {
    if (cta) {
      cta.style.opacity = '1';
      cta.style.transform = 'translateY(0)';
    }
  }, 1500);
}

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
  return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec2 uv = v_texCoord;
  float n = 0.0;
  vec2 st = uv * vec2(3.0, 1.5);
  st.x += u_time * 0.02;
  n += 0.5 * noise(st);
  st *= 2.0;
  n += 0.25 * noise(st);
  vec3 color1 = vec3(0.98, 0.98, 0.96);
  vec3 color2 = vec3(0.9, 0.92, 0.88);
  vec3 background = mix(color1, color2, n * uv.y);
  background -= 0.05 * smoothstep(0.4, 0.0, uv.y);
  gl_FragColor = vec4(background, 1.0);
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
  if (!container || typeof THREE === 'undefined') return;

  const devicePixelRatio = window.devicePixelRatio || 1;
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(devicePixelRatio);
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);

  const group = new THREE.Group();
  scene.add(group);

  const boxGeometry = new THREE.BoxGeometry(2, 1.2, 1);
  const boxMaterial = new THREE.MeshPhongMaterial({ color: 0xd2b48c, shininess: 10 });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  group.add(box);

  const lidGeometry = new THREE.BoxGeometry(2.1, 0.1, 1.1);
  const lid = new THREE.Mesh(lidGeometry, boxMaterial);
  lid.position.y = 0.6;
  box.add(lid);

  const mushroomGroup = new THREE.Group();
  mushroomGroup.visible = false;
  group.add(mushroomGroup);

  const capGeo = new THREE.ConeGeometry(0.5, 1, 8);
  const capMat = new THREE.MeshPhongMaterial({ color: 0x4b3621 });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 0.5;
  mushroomGroup.add(cap);

  const stemGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.6);
  const stemMat = new THREE.MeshPhongMaterial({ color: 0xf5f5dc });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = -0.2;
  mushroomGroup.add(stem);

  camera.position.z = 5;

  let scrollProgress = 0;
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const maxScroll = window.innerHeight;
    scrollProgress = Math.min(Math.max(scrollY / maxScroll, 0), 1);
  });

  function animate() {
    requestAnimationFrame(animate);

    if (scrollProgress < 0.3) {
      const t = scrollProgress / 0.3;
      box.position.y = 5 * (1 - t);
      box.rotation.x = t * Math.PI * 2;
      mushroomGroup.visible = false;
      lid.position.y = 0.6;
      lid.rotation.z = 0;
    } else if (scrollProgress < 0.6) {
      const t = (scrollProgress - 0.3) / 0.3;
      box.position.y = 0;
      box.rotation.y = t * Math.PI * 4;
      box.rotation.z = t * Math.PI;
      mushroomGroup.visible = false;
    } else if (scrollProgress < 0.9) {
      const t = (scrollProgress - 0.6) / 0.3;
      box.position.y = 0;
      lid.position.y = 0.6 + t * 0.5;
      lid.rotation.z = t * Math.PI * 0.5;

      mushroomGroup.visible = true;
      mushroomGroup.position.y = t * 1.5;
      mushroomGroup.rotation.y += 0.02;
      mushroomGroup.scale.set(t, t, t);

      box.material.opacity = 1 - t;
      box.material.transparent = true;
    } else {
      const t = (scrollProgress - 0.9) / 0.1;
      mushroomGroup.visible = true;
      mushroomGroup.position.y = 1.5;
      [cap, stem].forEach((mesh) => {
        mesh.material.opacity = 1 - t;
        mesh.material.transparent = true;
      });
      box.visible = false;
    }

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  animate();
}

function initPage() {
  initHeroAnimation();
  initRevealObserver();
  initShaderBackground();
  initThreeAnimation();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
