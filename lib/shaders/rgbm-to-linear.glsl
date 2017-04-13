// reference: http://iwasbeingirony.blogspot.ca/2010/06/difference-between-rgbm-and-rgbd.html
vec4 RGBMToLinear2( in vec4 value, in float maxRange ) {
  return vec4( value.xyz * value.w * maxRange, 1.0 );
}
vec4 RGBMToLinear2( in vec4 value ) {
  return RGBMToLinear2(value, 16.0);
}
#pragma glslify: export(RGBMToLinear2);