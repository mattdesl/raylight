#pragma glslify: encodeHDR = require('./encode-hdr');

vec4 encodePixel (float luminance) {
  #ifdef FLOAT_BUFFER
    return vec4(vec3(luminance), 1.0);
  #else
    return encodeHDR(luminance);
  #endif
}

#pragma glslify: export(encodePixel);