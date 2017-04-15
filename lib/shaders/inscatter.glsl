float InScatter(vec3 start, vec3 dir, vec3 lightPos, float d) {
  // http://blog.mmacklin.com/2010/06/10/faster-fog/
  // calculate quadratic coefficients a,b,c
  vec3 q = start - lightPos;
  float b = dot(dir, q);
  float c = dot(q, q);

  // evaluate integral
  float s = 1.0 / sqrt(c - b * b);
  float l = s * (atan((d + b) * s) - atan(b * s));
  return l;
}
#pragma glslify: export(InScatter);