const vec4 encodeFactorA = vec4(1.0, 255.0, 65025.0, 160581375.0);
const vec4 encodeFactorB = vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);

vec4 EncodeFloatRGBA(float v) {
  v = min(0.9999999, v / 16.0);
  vec4 enc = fract(encodeFactorA * v);
  enc -= enc.yzww * encodeFactorB;
  return enc;
}

#pragma glslify: export(EncodeFloatRGBA);