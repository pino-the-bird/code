// crisp hats on a wall
// SPDX-License-Identifier: CC-BY-NC-SA-4.0
// Copyright (c) 2026 pino (https://pino-the-bird.github.io/code/p0027.html)
// https://creativecommons.org/licenses/by-nc-sa/4.0/
// uniforms: vec3 iResolution, float iTime, vec4 iMouse, int iFrame

const float P_w0_cell = 2.5;
const float P_w1_speed = 0.6;
const float P_w2_amount = 0.15;
const float P_w2_size = 1.0;
const float P_a_size = 0.2;
const float P_a_round = 0.1;
const float P_s_distance = 2.679;
const float P_s_steps = 19.0;
const float P_s_density = 0.602;
const float P_shift = 0.0;
const float P_spread = 1.5;
const float P_glow = 0.3;
const float P_exposure = 1.2;
const float P_grain = 0.02;
const float P_vignette = 0.3;
const float P_speed = 0.5;

float PAL_T = 0.0;

const mat3 TURN = mat3(0.346929, 0.292215, -0.891207, -0.327923, 0.928044, 0.176639, 0.878696, 0.230967, 0.417790);
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
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


vec3 pal(float x) { return vec3(0.6, 0.57, 0.53) + vec3(0.35, 0.33, 0.3) * cos(6.28318 * (vec3(1.0, 1.0, 1.0) * x * P_spread + vec3(0.0, 0.03, 0.06) + P_shift + PAL_T * 0.04)); }

vec3 warp0(vec3 p, float t) {
  p = mod(p + 0.5 * P_w0_cell, P_w0_cell) - 0.5 * P_w0_cell;
  return p;
}

vec3 warp1(vec3 p, float t) {
  p.z += t * P_w1_speed;
  return p;
}

vec3 warp2(vec3 p, float t) {
  p *= 1.0 + P_w2_amount * sin(t * 2.0 - length(p) * P_w2_size);
  return p;
}

float formA(vec3 p) {
  vec3 q = abs(p) - vec3(P_a_size); return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - P_a_round;
}

float field(vec3 p, float t) {
  vec3 q = p;
  p = warp0(p, t);
  p = warp1(p, t);
  p = warp2(p, t);
  float a = formA(p);
  a = max(a, length(q) - 1.6);
  return a;
}

vec3 look(vec2 uv, float t) {
  vec3 ro = vec3(0.0, 0.0, -P_s_distance);
  vec3 rd = normalize(vec3(uv, 1.4));
  // (it turns slowly whatever else it does: a cloud of a gyroid with a twist in it held still, and every shader moves)
  ro.xz = rot(t * 0.25) * ro.xz;
  rd.xz = rot(t * 0.25) * rd.xz;
  vec3 col = vec3(0.0);
  float z = 0.0;
  for (int i = 0; i < 96; i++) {
    if (float(i) >= P_s_steps) break;
    vec3 p = ro + rd * z;
    float d = field(p, t);
    float s = 0.006 + abs(d) * 0.45;
    float v = (d * 1.5);
    col += pal(v) * P_s_density / s;
    z += s;
  }
  // (squared, so the light gathers in bright cores with dark between, the way glow through a volume looks: summed flat
  // it came out a white wash)
  col *= 0.0012 * (0.35 + 0.65 * P_glow) * 36.0 / P_s_steps;
  return col * col * 1.6;
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
