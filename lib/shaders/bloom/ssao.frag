precision highp float;

uniform float cameraNear;
uniform float cameraFar;
uniform bool onlyAO;
uniform vec2 resolution;
uniform float aoClamp;
uniform float lumInfluence;
uniform highp sampler2D tDiffuse;
varying vec2 vUv;
#pragma glslify: readDepth = require('../read-depth');
#pragma glslify: encodeFloat = require('../encode-float');

#define DL 2.399963229728653
#define EULER 2.718281828459045

const int samples = 4;
const float radius = 5.0;
const bool useNoise = false;
const float noiseAmount = 0.0003;
const float diffArea = 0.4;
const float gDisplace = 0.4;

highp vec2 rand( const vec2 coord ) {
  highp vec2 noise;
  if ( useNoise ) {
    float nx = dot ( coord, vec2( 12.9898, 78.233 ) );
    float ny = dot ( coord, vec2( 12.9898, 78.233 ) * 2.0 );
    noise = clamp( fract ( 43758.5453 * sin( vec2( nx, ny ) ) ), 0.0, 1.0 );
  } else {
    highp float ff = fract( 1.0 - coord.s * ( resolution.x / 2.0 ) );
    highp float gg = fract( coord.t * ( resolution.y / 2.0 ) );
    noise = vec2( 0.25, 0.75 ) * vec2( ff ) + vec2( 0.75, 0.25 ) * gg;
  }
  return ( noise * 2.0  - 1.0 ) * noiseAmount;
}

float compareDepths( const in float depth1, const in float depth2, inout int far ) {
  float garea = 2.0;
  float diff = ( depth1 - depth2 ) * 100.0;
  if ( diff < gDisplace ) {
    garea = diffArea;
  } else {
    far = 1;
  }
  float dd = diff - gDisplace;
  float gauss = pow( EULER, -2.0 * dd * dd / ( garea * garea ) );
  return gauss;
}

float calcAO( float depth, vec2 coord1, vec2 coord2 ) {
  float temp1 = 0.0;
  float temp2 = 0.0;
  int far = 0;
  temp1 = compareDepths( depth, readDepth(tDiffuse, coord1, cameraNear, cameraFar), far );
  if ( far > 0 ) {
    temp2 = compareDepths( readDepth(tDiffuse, coord2, cameraNear, cameraFar), depth, far );
    temp1 += ( 1.0 - temp1 ) * temp2;
  }
  return temp1;
}

void main() {
  float aspect = resolution.x / resolution.y;
  float threshold = 0.5;
  float thresholdSq = threshold * threshold;

  highp vec2 noise = rand( vUv );
  float depth = readDepth(tDiffuse, vUv, cameraNear, cameraFar);
  float tt = clamp( depth, aoClamp, 1.0 );
  vec2 texelRes = 1.0 / resolution / tt + noise * (1.0 - noise);

  float ao = 0.0;
  float dz = 1.0 / float( samples );
  float z = 1.0 - dz / 2.0;
  float l = 0.0;
  for ( int i = 0; i <= samples; i ++ ) {
    float r = sqrt( 1.0 - z );
    float pw = cos( l ) * r;
    float ph = sin( l ) * r;

    float dd = radius - depth * radius;
    vec2 vv = vec2( pw, ph ) * texelRes * dd;
    vec2 coord1 = vUv + vv;
    vec2 coord2 = vUv - vv;
    ao += calcAO( depth, coord1, coord2 );
    z = z - dz;
    l = l + DL;
  }
  ao /= float( samples );
  ao = 1.0 - ao;
  // vec3 lumcoeff = vec3( 0.299, 0.587, 0.114 );
  // float lum = dot( color.rgb, lumcoeff );
  // float aoVal = mix(ao, 1.0, lum * lumInfluence);
  // gl_FragColor = encodeFloat(ao);
  gl_FragColor = vec4(vec3(ao), 1.0);
}