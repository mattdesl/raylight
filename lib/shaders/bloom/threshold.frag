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

#pragma glslify: decodeHDR = require('../decode-hdr');
#pragma glslify: encodeHDR = require('../encode-hdr');
#pragma glslify: vignette = require('./vignette');
#pragma glslify: luma = require('glsl-luma');

void main () {
  vec3 color = texture2D(tDiffuse, vUv).rgb;

  // threshold
  vec3 outColor = step(vec3(lumaThreshold), color);

  // allow vignette to peek through
  float v = vignette(vUv, resolution, vignetteMin, vignetteMax, vignetteScale);
  outColor = mix(outColor, clamp(color, 0.0, 3.0), v);

  gl_FragColor = vec4(vec3(outColor), 1.0);
}
