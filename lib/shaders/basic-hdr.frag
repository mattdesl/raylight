uniform vec3 diffuse;
uniform float emissiveFactor;

#pragma glslify: encodeRGBM = require('./linear-to-rgbm');
#pragma glslify: encodePixel = require('./encode-pixel');

void main() {
  float f = diffuse.r * emissiveFactor;
  gl_FragColor = encodePixel(f);
}
