varying vec2 vUv;

//make sure to have a resolution uniform set to the screen size
uniform vec2 resolution;
uniform highp sampler2D tDiffuse;

#pragma glslify: decodeFloat = require('./decode-float');
#pragma glslify: encodeFloat = require('./encode-float');
#pragma glslify: rgbmToLinear = require('./rgbm-to-linear');
#pragma glslify: luma = require('glsl-luma');

void main() {
  float t = 1.5;
  float n = decodeFloat(encodeFloat(t));
  n = n > 10.0 ? 1.0 : 0.0;
  gl_FragColor = vec4(vec3(n), 1.0);
  
  // float f = decodeFloat(texture2D(tDiffuse, vUv));
  // gl_FragColor = vec4(vec3(f), 1.0);

  // vec4 encoded = texture2D(tDiffuse, vUv);
  // vec4 outColor = rgbmToLinear(encoded, 16.0);
  // float L = luma(outColor.rgb);
  // bool isAbove = outColor.r > 1.0 || outColor.g > 1.0 || outColor.b > 1.0;
  // gl_FragColor.rgb = step(vec3(1.0), outColor.rgb);
  // gl_FragColor.a = 1.0;
  
  // float luminance = clamp(decodeFloat(encoded), 0.0, 1.0);
  // gl_FragColor = vec4(vec3(luminance), 1.0);
}
