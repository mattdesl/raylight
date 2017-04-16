const vec4 decodeFactor = vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 160581375.0);

float DecodeFloat(vec4 rgba) {
  return dot(rgba, decodeFactor);
}

#pragma glslify: export(DecodeFloat);