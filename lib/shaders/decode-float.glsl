const vec4 decodeFactor = vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 160581375.0);

float DecodeFloatRGBA(vec4 rgba) {
  float f = dot(rgba, decodeFactor);
  return f * 16.0;
}

#pragma glslify: export(DecodeFloatRGBA);