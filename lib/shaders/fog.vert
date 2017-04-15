varying vec3 vWorldPos;
void main() {
  vec4 tPos = vec4(position.xyz, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * tPos;
  vWorldPos = (modelMatrix * tPos).xyz;
}
