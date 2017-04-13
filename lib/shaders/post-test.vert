varying vec2 vUv;
uniform vec2 resolution;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix *
              modelViewMatrix *
              vec4(position,1.0);
}
