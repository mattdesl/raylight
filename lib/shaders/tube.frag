#extension GL_OES_standard_derivatives : enable
precision highp float;

varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vViewPosition;
varying float vArclen;
varying float vRandomScale;
varying vec3 vBarycentric;

uniform vec3 color;
uniform vec3 tipColor;
uniform float animateRadius;
uniform float time;
uniform float animateStrength;

#pragma glslify: aastep = require('glsl-aastep');
#pragma glslify: faceNormal = require('glsl-face-normal');
#pragma glslify: noise = require('glsl-noise/simplex/4d');

float pattern(float v, float repeats, float threshold, float offset) {
  float result = mod(v * repeats + offset, 1.0);
  return step(threshold, result);
}

void main () {
  // handle flat and smooth normals
  vec3 normal = vNormal;
  #ifdef FLAT_SHADED
    normal = faceNormal(vViewPosition);
  #endif

  // Z-normal "fake" shading
  float diffuse = normal.z * 0.5 + 0.5;
  float isCap = step(0.999999, abs(vArclen * 2.0 - 1.0));

  // add some "rim lighting"
  vec3 V = normalize(vViewPosition);
  float vDotN = 1.0 - max(dot(V, normal), 0.0);
  float rim = smoothstep(0.5, 1.0, vDotN);
  diffuse += mix(rim * 0.75, 0.0, isCap);

  // we'll animate in the new color from the center point
  float distFromCenter = clamp(length(vViewPosition) / 5.0, 0.0, 1.0);
  float edge = 0.05;
  float t = animateRadius;
  
  float pColor = pattern(vUv.x, 4.0, 0.5, 0.0);
  
  float wire = min(vBarycentric.x, min(vBarycentric.y, vBarycentric.z));
  // diffuseColor = vec3(wire);
  wire = aastep(0.1, wire);
  // wire = aastep(0.5 * (sin(vRandomScale + time) * 0.5 + 0.5), wire);

  // float n = noise(vec4(vViewPosition * 10.0, time * 0.15)) * 0.5 + 0.5;
  vec3 bodyColor = color * 0.75; //mix(tipColor, color, pColor);
  vec3 capColor = tipColor;
  vec3 diffuseColor = vec3(mix(bodyColor, capColor, isCap));


  // float diffuseColor = mix(pColor, capColor, isCap);
  // gl_FragColor = vec4(vec3(finalColor), 1.0);
  
  // vec3 curColor = mix(color, #fff, smoothstep(t - edge, t + edge, vUv.y) * animateStrength);



  // final color
  gl_FragColor = vec4(diffuse * diffuseColor, 1.0);
  // gl_FragColor = vec4(vec3(step(0.25, vUv.y)), 1.0);
  
}
