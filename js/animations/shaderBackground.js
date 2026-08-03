/**
 * shaderBackground.js
 * The soft, fixed mountain-mist WebGL background. Logic is unchanged from
 * the original implementation — only moved into its own module.
 */

export function initShaderBackground() {
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
