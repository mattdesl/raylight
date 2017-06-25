precision mediump float;
#pragma glslify: grain = require('glsl-film-grain')
#pragma glslify: random = require('glsl-random')
#pragma glslify: blend = require('glsl-blend-soft-light')
#pragma glslify: luma = require('glsl-luma')

uniform vec3 color1;
uniform vec3 color2;
uniform float zoom;
uniform vec2 offset;
uniform vec2 scale;
uniform float noiseAlpha;
uniform bool aspectCorrection;
uniform float grainScale;
uniform float grainTime;
uniform vec2 smoothing;

varying vec2 vUv;

void main() {
  float y = clamp(vUv.y * zoom, 0.0, 1.0);
  y = smoothstep(smoothing.x, smoothing.y, y);
  gl_FragColor.rgb = mix(color1, color2, y);

  float L = luma(gl_FragColor.rgb);
  float noiseScale = 0.05;
  gl_FragColor.rgb -= random(gl_FragCoord.xy) * noiseScale;

  // gl_FragColor.rgb = blend(gl_FragColor.rgb, gl_FragColor.rgb + random(gl_FragCoord.xy) * 0.25);
  // gl_FragColor.rgb += random(gl_FragCoord.xy) * 0.05;
  gl_FragColor.a = 1.0;
}