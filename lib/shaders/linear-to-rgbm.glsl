vec4 LinearToRGBM2( in vec4 value, in float maxRange ) {
  float maxRGB = max( value.x, max( value.g, value.b ) );
  float M      = clamp( maxRGB / maxRange, 0.0, 1.0 );
  M            = ceil( M * 255.0 ) / 255.0;
  return vec4( value.rgb / ( M * maxRange ), M );
}
vec4 LinearToRGBM2( in vec4 value ) {
  return LinearToRGBM2(value, 16.0);
}
#pragma glslify: export(LinearToRGBM2);