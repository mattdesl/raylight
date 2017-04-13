varying vec2 vUv;

//make sure to have a resolution uniform set to the screen size
uniform vec2 resolution;
uniform sampler2D tDiffuse;

#pragma glslify: decodeFloat = require('./decode-float');
#pragma glslify: rgbmToLinear = require('./rgbm-to-linear');
#pragma glslify: luma = require('glsl-luma');

void main() {
  // gl_FragColor = texture2D(tDiffuse, vUv);

  vec4 encoded = texture2D(tDiffuse, vUv);
  vec4 outColor = rgbmToLinear(encoded, 16.0);
  float L = luma(outColor.rgb);
  bool isAbove = outColor.r > 1.0 || outColor.g > 1.0 || outColor.b > 1.0;
  gl_FragColor.rgb = step(vec3(1.0), outColor.rgb);
  gl_FragColor.a = 1.0;
  
  // float luminance = clamp(decodeFloat(encoded), 0.0, 1.0);
  // gl_FragColor = vec4(vec3(luminance), 1.0);
}
