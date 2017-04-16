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
  
  #ifdef FLOAT_BUFFER
    float color = texture2D(tDiffuse, vUv).r;
  #else
    float color = decodeHDR(texture2D(tDiffuse, vUv));
  #endif

  // threshold
  float outColor = step(lumaThreshold, color);

  // allow vignette to peek through
  float v = vignette(vUv, resolution, vignetteMin, vignetteMax, vignetteScale);
  outColor = mix(outColor, min(3.0, color), v);

  #ifdef FLOAT_BUFFER
    gl_FragColor = vec4(vec3(outColor), 1.0);
  #else
    gl_FragColor = encodeHDR(outColor);
  #endif
}
