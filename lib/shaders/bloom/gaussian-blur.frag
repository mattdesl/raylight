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

#pragma glslify: rgbmToLinear = require('../rgbm-to-linear');
#pragma glslify: linearToRgbm = require('../linear-to-rgbm');
#pragma glslify: vignette = require('./vignette');

float sample (sampler2D image, vec2 uv) {
  return texture2D(image, uv).r;
}

float blur(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
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
  float edgeBlur = mix(1.0, 2.0, v);

  float finalColor = blur(tDiffuse, vUv, resolution.xy, direction * edgeBlur);
  gl_FragColor.rgb = vec3(finalColor);
  gl_FragColor.a = 1.0;
  // gl_FragColor = texture2D(tDiffuse, vUv);
}