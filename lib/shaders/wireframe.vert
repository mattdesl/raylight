precision highp float;
attribute vec4 position;
attribute vec3 barycentric;
varying float vNoise;
varying vec3 vPosition;
varying vec3 vBarycentric;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 modelMatrix;

void main() {
  vPosition = (modelMatrix * position).xyz;
  vBarycentric = barycentric;
  gl_Position = projectionMatrix * modelViewMatrix * position;
}
