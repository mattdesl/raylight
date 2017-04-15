uniform vec3 diffuse;
uniform float emissiveFactor;

#pragma glslify: encodeRGBM = require('./linear-to-rgbm.glsl');
#pragma glslify: encodeFloat = require('./encode-float.glsl');

void main() {
  float f = diffuse.r * emissiveFactor;
  #ifndef FLOAT_BUFFER
    gl_FragColor = encodeFloat(f);
  #else
    gl_FragColor = vec4(vec3(f), 1.0);
  #endif
}
