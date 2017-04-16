// 16-bit depth stored in G channel
highp float readDepth(highp sampler2D map, in vec2 uv, float cameraNear, float cameraFar) {
  float cameraFarPlusNear = cameraFar + cameraNear;
  float cameraFarMinusNear = cameraFar - cameraNear;
  float cameraCoef = 2.0 * cameraNear;
  return cameraCoef / (cameraFarPlusNear - texture2D(map, uv).g * cameraFarMinusNear);
}
#pragma glslify: export(readDepth);