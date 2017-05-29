#extension GL_OES_standard_derivatives : enable
precision highp float;

uniform float opacity;
uniform float time;
uniform vec3 color;
varying vec3 vBarycentric;
varying vec3 vPosition;

#pragma glslify: aastep = require('glsl-aastep')
#pragma glslify: noise = require('glsl-noise/simplex/4d')

void main() {
  float d = min(vBarycentric.x, min(vBarycentric.y, vBarycentric.z));
  
  // float f = 10.0 * length(vPosition);
  // float n = noise(vec4(vPosition.xyz * f, time));
  // float thickness = 0.05 + (n * 0.5 + 0.5) * 0.1;
  float thickness = 0.05;
  d = 1.0 - aastep(thickness, d);
  
  gl_FragColor = vec4(color, d * opacity);
  if (gl_FragColor.a < 0.01) discard;
}
