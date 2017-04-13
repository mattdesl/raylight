precision highp float;
varying vec2 vUv;
uniform highp sampler2D tDiffuse;
uniform vec3 background;
uniform vec2 resolution;
uniform float lumaThreshold;

uniform float vignetteMin;
uniform float vignetteMax;
uniform float vignetteStrength;
uniform float vignetteScale;

#pragma glslify: rgbmToLinear = require('../rgbm-to-linear');
#pragma glslify: linearToRgbm = require('../linear-to-rgbm');
#pragma glslify: vignette = require('./vignette');
#pragma glslify: luma = require('glsl-luma');

void main () {
  vec4 outColor = texture2D(tDiffuse, vUv);
  // bool above = outColor.r > lumaThreshold || outColor.g > outColor || outColor.b > outColor;
  // outColor.rgb = step(vec3(lumaThreshold), gl_FragColor.rgb);
  // gl_FragColor = above ? outColor : vec4(vec3(0.0), 1.0);
  float v = vignette(vUv, resolution, vignetteMin, vignetteMax, vignetteScale);
  vec3 T = vec3(lumaThreshold);
  gl_FragColor.rgb = step(T, outColor.rgb);

  // allow our edge vignette to peek through
  gl_FragColor.rgb = mix(gl_FragColor.rgb, min(vec3(3.0), outColor.rgb), v);

  // encode luminance in R channel
  gl_FragColor.r = luma(gl_FragColor.rgb);

  gl_FragColor.a = outColor.a;
  // vec4 encoded = texture2D(tDiffuse, vUv);
  // vec4 outColor = rgbmToLinear(encoded);
  // vec4 finalColor = vec4(step(vec3(lumaThreshold), outColor.rgb), 1.0);
  // gl_FragColor = linearToRgbm(finalColor);
}
