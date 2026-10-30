// Train Whistle Burst
// SPDX-License-Identifier: CC-BY-NC-SA-4.0
// Copyright (c) 2026 pino (https://pino-the-bird.github.io/code/p0034.html)
// https://creativecommons.org/licenses/by-nc-sa/4.0/
// uniforms: vec3 iResolution, float iTime, vec4 iMouse, int iFrame

const float P_w0_speed = 0.678;
const float P_w1_amount = 0.252;
const float P_w1_size = 2.0;
const float P_a_size = 0.857;
const float P_s_orbit = 0.205;
const float P_s_distance = 4.5;
const float P_s_steps = 76.766;
const float P_shift = 0.0;
const float P_spread = 1.54;
const float P_glow = 0.562;
const float P_exposure = 1.032;
const float P_grain = 0.027;
const float P_vignette = 0.347;
const float P_speed = 0.44;

float PAL_T = 0.0;

const mat3 TURN = mat3(0.346929, 0.292215, -0.891207, -0.327923, 0.928044, 0.176639, 0.878696, 0.230967, 0.417790);
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hash3(vec3 p) { p = fract(p * vec3(0.1213, 0.1471, 0.1693)); p += dot(p, p.yzx + 19.19); return fract((p.x + p.z) * p.y); }
float hash(vec2 p) { return hash3(vec3(p, p.x + p.y)); }
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 u = fract(x);
  u = u * u * (3.0 - 2.0 * u);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), u.x), mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), u.x), u.y),
             mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), u.x), mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), u.x), u.y), u.z);
}
float fbm(vec3 p, float layers) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (float(i) >= layers) break;
    v += a * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return v;
}
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }


vec3 pal(float x) { return vec3(0.5, 0.5, 0.5) + vec3(0.5, 0.5, 0.5) * cos(6.28318 * (vec3(2.0, 1.0, 0.0) * x * P_spread + vec3(0.5, 0.2, 0.25) + P_shift + PAL_T * 0.04)); }

vec3 warp0(vec3 p, float t) {
  p.z += t * P_w0_speed;
  return p;
}

vec3 warp1(vec3 p, float t) {
  p += P_w1_amount * sin(p.yzx * P_w1_size + t);
  return p;
}

float formA(vec3 p) {
  return length(p) - P_a_size;
}

float field(vec3 p, float t) {
  vec3 q = p;
  p = warp0(p, t);
  p = warp1(p, t);
  float a = formA(p);
  a = max(a, length(q) - 1.8);
  return a;
}

vec3 look(vec2 uv, float t) {
  float a = iTime * P_s_orbit;
  vec3 ro = vec3(sin(a) * P_s_distance, 0.6 * sin(a * 0.7), -cos(a) * P_s_distance);
  vec3 fw = normalize(-ro);
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.6 * fw);
  float z = 0.0;
  float near = 1e9;
  float k = 0.0;
  float hit = 0.0;
  vec3 p = ro;
  for (int i = 0; i < 128; i++) {
    if (float(i) >= P_s_steps) break;
    p = ro + rd * z;
    float d = field(p, t);
    near = min(near, d);
    if (d < 0.0015 * (1.0 + z)) { hit = 1.0; break; }
    z += d * 0.6;
    k += 1.0;
    if (z > 24.0) break;
  }
  vec3 bg = pal(uv.y * 0.25 + 0.6) * 0.07 + pal(0.25) * P_glow * 0.5 * exp(-max(near, 0.0) * 3.0);
  if (hit < 0.5) return bg;
  vec2 e = vec2(0.0015, 0.0);
  vec3 n = normalize(vec3(field(p + e.xyy, t) - field(p - e.xyy, t), field(p + e.yxy, t) - field(p - e.yxy, t), field(p + e.yyx, t) - field(p - e.yyx, t)));
  vec3 l = normalize(vec3(0.6, 0.8, -0.5));
  float dif = max(dot(n, l), 0.0);
  float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
  float occ = 1.0 - k / P_s_steps;
  float v = (dot(n, l) * 0.3 + t * 0.1);
  // (lit more kindly: the occlusion of a warped form, felt for in short steps, put most solids in the dark)
  float spec = pow(max(dot(reflect(rd, n), l), 0.0), 24.0);
  vec3 col = pal(v) * (0.2 + 0.8 * dif) * (0.6 + 0.4 * occ) + pal(v + 0.5) * 0.15 * (0.5 - 0.5 * dot(n, l)) + pal(v + 0.3) * rim * (0.25 + P_glow) + vec3(spec) * 0.5;
  return mix(col, bg, 1.0 - exp(-0.004 * z * z));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  float t = iTime * P_speed;
  PAL_T = t;
  vec3 col = vec3(0.0);
  for (int j = 0; j < 1; j++) {
    vec2 o = vec2(float(j % 1), float(j / 1)) / 1.0 - 0.0;
    vec2 uv = (2.0 * (fragCoord + o) - iResolution.xy) / iResolution.y;
    col += look(uv, t);
  }
  vec3 c = col / 1.0 * P_exposure;
  c = clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0);
  vec2 q = fragCoord / iResolution.xy - 0.5;
  c *= 1.0 - P_vignette * dot(q, q) * 2.0;
  c += (hash(fragCoord + fract(iTime) * 91.7) - 0.5) * P_grain;
  fragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
