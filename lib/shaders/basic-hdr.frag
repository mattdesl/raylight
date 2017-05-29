uniform vec3 diffuse;
uniform float emissiveFactor;
uniform float opacity;

#pragma glslify: encodeRGBM = require('./linear-to-rgbm');
#pragma glslify: encodePixel = require('./encode-pixel');

void main() {
  gl_FragColor = vec4(diffuse * emissiveFactor, opacity);
}
