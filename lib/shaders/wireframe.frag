#extension GL_OES_standard_derivatives : enable
precision highp float;

uniform float opacity;
uniform float time;
uniform float thickness;
uniform bool isWireframe;
uniform float emissiveFactor;
uniform vec3 color;
varying vec3 vBarycentric;
varying vec3 vPosition;

#pragma glslify: aastep = require('glsl-aastep')
#pragma glslify: noise = require('glsl-noise/simplex/4d')

void main() {
  float d = min(vBarycentric.x, min(vBarycentric.y, vBarycentric.z));
  
  // float f = 100.0;
  // float n = noise(vec4(vPosition.xyz * f, time));
  // float computedThickness = thickness + n * 0.025;
  // d = d * length(vPosition.yz);
  
  // float rsp = 0.05;
  // d = mod(d, rsp) - 0.5 * rsp;
  // d *= length(1.0 * vec2(vBarycentric - 0.5));
  d = 1.0 - aastep(thickness, d);
  if (!isWireframe) d = 1.0;
  gl_FragColor = vec4(color * emissiveFactor, d * opacity);
  // if (gl_FragColor.a < 0.01) discard;
}
