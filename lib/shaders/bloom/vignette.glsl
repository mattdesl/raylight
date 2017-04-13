float vignette (vec2 uv, vec2 resolution, float minVal, float maxVal, float scale) {
  vec2 vigUV = uv - 0.5;
  vigUV /= scale;
  vigUV.x *= resolution.x / resolution.y;
  float vigDist = length(vigUV);
  return smoothstep(minVal, maxVal, vigDist);
}
#pragma glslify: export(vignette);