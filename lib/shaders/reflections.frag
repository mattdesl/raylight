precision highp float;
varying vec2 vUv;
uniform vec3 color1;
uniform vec3 color2;

float pattern(float v, float repeats, float threshold) {
  float result = mod(v * repeats, 1.0);
  return step(threshold, result);
}

void main () {
  float repeats = 150.0;
  float threshold = 0.5;
  float d = pattern(vUv.y, repeats, threshold);
  gl_FragColor = vec4(mix(color1, color2, d), 1.0);
}