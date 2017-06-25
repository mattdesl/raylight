precision highp float;

varying vec2 vUv;
uniform highp sampler2D tDiffuse;
uniform vec2 resolution;
uniform vec2 direction;
uniform float radius;

uniform float vignetteMin;
uniform float vignetteMax;
uniform float vignetteStrength;
uniform float vignetteScale;

#pragma glslify: vignette = require('./vignette');
#pragma glslify: decodeHDR = require('../decode-hdr');
#pragma glslify: encodeHDR = require('../encode-hdr');

float sample (sampler2D image, vec2 uv) {
  #ifndef FLOAT_BUFFER
    return decodeHDR(texture2D(image, uv));
  #else
    return texture2D(image, uv).r;
  #endif
}

float blur5 (sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
  float color = 0.0;
  vec2 off1 = vec2(1.3333333333333333) * direction;
  color += sample(image, uv) * 0.29411764705882354;
  color += sample(image, uv + (off1 / resolution)) * 0.35294117647058826;
  color += sample(image, uv - (off1 / resolution)) * 0.35294117647058826;
  return color;
}

float blur9 (sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
  float color = 0.0;
  vec2 off1 = vec2(1.3846153846) * direction;
  vec2 off2 = vec2(3.2307692308) * direction;
  color += sample(image, uv) * 0.2270270270;
  color += sample(image, uv + (off1 / resolution)) * 0.3162162162;
  color += sample(image, uv - (off1 / resolution)) * 0.3162162162;
  color += sample(image, uv + (off2 / resolution)) * 0.0702702703;
  color += sample(image, uv - (off2 / resolution)) * 0.0702702703;
  return color;
}

float blur13 (sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
  float color = 0.0;
  vec2 off1 = vec2(1.411764705882353) * direction;
  vec2 off2 = vec2(3.2941176470588234) * direction;
  vec2 off3 = vec2(5.176470588235294) * direction;
  color += sample(image, uv) * 0.1964825501511404;
  color += sample(image, uv + (off1 / resolution)) * 0.2969069646728344;
  color += sample(image, uv - (off1 / resolution)) * 0.2969069646728344;
  color += sample(image, uv + (off2 / resolution)) * 0.09447039785044732;
  color += sample(image, uv - (off2 / resolution)) * 0.09447039785044732;
  color += sample(image, uv + (off3 / resolution)) * 0.010381362401148057;
  color += sample(image, uv - (off3 / resolution)) * 0.010381362401148057;
  return color;
}

void main () {
  float v = vignette(vUv, resolution, vignetteMin, vignetteMax, vignetteScale);
  float edgeBlur = v + 1.0;
  float finalColor = blur13(tDiffuse, vUv, resolution.xy, direction * edgeBlur);
  // float finalColor = sample(tDiffuse, vUv);
  #ifdef FLOAT_BUFFER
    gl_FragColor = vec4(vec3(finalColor), 1.0);
  #else
    gl_FragColor = encodeHDR(finalColor);
  #endif
}