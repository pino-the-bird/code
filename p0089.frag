// Neon Torus Kaleidoscope
// SPDX-License-Identifier: CC-BY-NC-SA-4.0
// Copyright (c) 2026 pino (https://pino-the-bird.github.io/code/p0089.html)
// https://creativecommons.org/licenses/by-nc-sa/4.0/
// uniforms: vec3 iResolution, float iTime, vec4 iMouse, int iFrame

const float P_w0_amount = 0.218;
const float P_w0_size = 1.0;
const float P_w1_amount = 0.8;
const float P_w2_speed = 0.807;
const float P_w3_size = 1.5;
const float P_w3_layers = 3.662;
const float P_w3_amount = 0.465;
const float P_a_scale = 3.286;
const float P_a_layers = 3.676;
const float P_a_cover = 0.611;
const float P_s_slices = 7.043;
const float P_s_zoom = 2.512;
const float P_shift = 0.0;
const float P_spread = 1.5;
const float P_glow = 0.728;
const float P_exposure = 1.059;
const float P_grain = 0.011;
const float P_vignette = 0.293;
const float P_speed = 0.515;

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
  p *= 1.0 + P_w0_amount * sin(t * 2.0 - length(p) * P_w0_size);
  return p;
}

vec3 warp1(vec3 p, float t) {
  p.xy = rot(p.z * P_w1_amount) * p.xy;
  return p;
}

vec3 warp2(vec3 p, float t) {
  p.z += t * P_w2_speed;
  return p;
}

vec3 warp3(vec3 p, float t) {
  float f = P_w3_size; for (int i = 0; i < 6; i++) { if (float(i) >= P_w3_layers) break; p += P_w3_amount * sin(p.zxy * f + t + float(i)) / f; p.xy = rot(0.7) * p.xy; f *= 1.7; }
  return p;
}

float formA(vec3 p) {
  return (fbm(p * P_a_scale, P_a_layers) - P_a_cover) / P_a_scale;
}

float field(vec3 p, float t) {
  vec3 q = p;
  p = warp0(p, t);
  p = warp1(p, t);
  p = warp2(p, t);
  p = warp3(p, t);
  float a = formA(p);
  return a;
}

vec3 look(vec2 uv, float t) {
  float n = 6.28318 / floor(P_s_slices);
  float a = abs(mod(atan(uv.y, uv.x), n) - 0.5 * n);
  vec2 q = vec2(cos(a), sin(a)) * length(uv);
  vec3 p = vec3(q * P_s_zoom, 0.0);
  float d = field(p, t);
  float v = (length(uv) * 0.6);
  vec3 col = pal(v) * smoothstep(0.012 * P_s_zoom, -0.012 * P_s_zoom, d);
  col += pal(v + 0.15) * P_glow * exp(-abs(d) * 5.0 / P_s_zoom);
  return col + pal(v + 0.5) * 0.04;
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
  c = clamp(c, 0.0, 1.0);
  vec2 q = fragCoord / iResolution.xy - 0.5;
  c *= 1.0 - P_vignette * dot(q, q) * 2.0;
  c += (hash(fragCoord + fract(iTime) * 91.7) - 0.5) * P_grain;
  fragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
