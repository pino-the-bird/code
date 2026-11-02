// Ghost Train Beat Tunnel
// SPDX-License-Identifier: CC-BY-NC-SA-4.0
// Copyright (c) 2026 pino (https://pino-the-bird.github.io/code/p0051.html)
// https://creativecommons.org/licenses/by-nc-sa/4.0/
// uniforms: vec3 iResolution, float iTime, vec4 iMouse, int iFrame

const float P_w0_speed = -0.069;
const float P_w1_speed = 0.873;
const float P_w2_scale = 1.0;
const float P_w2_amount = 0.482;
const float P_a_scale = 0.3;
const float P_a_layers = 5.06;
const float P_a_cover = 0.439;
const float P_b_size = 0.8;
const float P_b_thickness = 0.139;
const float P_s_zoom = 0.999;
const float P_shift = 0.273;
const float P_spread = 1.052;
const float P_glow = 0.784;
const float P_exposure = 0.941;
const float P_grain = 0.019;
const float P_vignette = 0.376;
const float P_speed = 0.595;

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
  p.xy = rot(t * P_w0_speed) * p.xy;
  return p;
}

vec3 warp1(vec3 p, float t) {
  p.z += t * P_w1_speed;
  return p;
}

vec3 warp2(vec3 p, float t) {
  vec3 q = p * P_w2_scale + t * 0.3; p += P_w2_amount * (vec3(noise(q), noise(q + 17.1), noise(q - 9.3)) - 0.5);
  return p;
}

float formA(vec3 p) {
  return (fbm(p * P_a_scale, P_a_layers) - P_a_cover) / P_a_scale;
}

float formB(vec3 p) {
  vec2 q = vec2(length(p.xz) - P_b_size, p.y); return length(q) - P_b_thickness;
}

float field(vec3 p, float t) {
  vec3 q = p;
  p = warp0(p, t);
  p = warp1(p, t);
  p = warp2(p, t);
  float a = formA(p);
  float b = formB(p);
  a = min(a, b);
  return a;
}

vec3 look(vec2 uv, float t) {
  float r = max(length(uv), 1e-3);
  // (the walls repeat along its length and come towards you, so a form recurs down the tube)
  // (the walls are a real cylinder round you, so they meet themselves all the way round: an angle cut into tiles left a
  // hard edge at every tile)
  // (and along it each length the mirror of the next, so they meet too: cut off, a ring stood across the tube where one
  // length ended. what is in both still comes towards you)
  float a = atan(uv.y, uv.x);
  vec3 p = vec3(cos(a), sin(a), abs(mod(1.0 / r + t + 2.5, 5.0) - 2.5) - 1.25) * P_s_zoom;
  float d = field(p, t);
  float v = (length(uv) * 0.6);
  vec3 col = pal(v) * smoothstep(0.03, -0.03, d);
  col += pal(v + 0.15) * P_glow * exp(-abs(d) * 4.0);
  return (col + pal(v + 0.5) * 0.04) * smoothstep(0.0, 0.5, r);
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
  c = tanh(c);
  vec2 q = fragCoord / iResolution.xy - 0.5;
  c *= 1.0 - P_vignette * dot(q, q) * 2.0;
  c += (hash(fragCoord + fract(iTime) * 91.7) - 0.5) * P_grain;
  fragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
