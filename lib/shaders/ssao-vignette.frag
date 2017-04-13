uniform float cameraNear;
uniform float cameraFar;
uniform bool onlyAO;
uniform vec2 resolution;
uniform float aoClamp;
uniform float lumInfluence;
uniform sampler2D tDiffuse;
uniform highp sampler2D tDepth;
varying vec2 vUv;

// #define CLIP_RADIUS

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

float readDepth( const in vec2 coord ) {
  float cameraFarPlusNear = cameraFar + cameraNear;
  float cameraFarMinusNear = cameraFar - cameraNear;
  float cameraCoef = 2.0 * cameraNear;
  return cameraCoef / ( cameraFarPlusNear - texture2D( tDepth, coord ).x * cameraFarMinusNear );
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
  temp1 = compareDepths( depth, readDepth( coord1 ), far );
  if ( far > 0 ) {
    temp2 = compareDepths( readDepth( coord2 ), depth, far );
    temp1 += ( 1.0 - temp1 ) * temp2;
  }
  return temp1;
}

bool isInside (vec2 uv, float thresholdSq, float aspect, out float alpha) {
  vec2 center = vUv - 0.5;
  center.x *= aspect;

  float centerDistSq = center.x * center.x + center.y * center.y;
  alpha = 1.0 - min(1.0, centerDistSq / thresholdSq);
  return centerDistSq < thresholdSq;
}

bool isInside (vec2 uv, float thresholdSq, float aspect) {
  float alpha = 1.0;
  return isInside(uv, thresholdSq, aspect, alpha);
}

void main() {
  float aspect = resolution.x / resolution.y;
  float threshold = 0.5;
  float thresholdSq = threshold * threshold;

  vec4 color = texture2D( tDiffuse, vUv );

  #ifdef CLIP_RADIUS
  if (!isInside(vUv, thresholdSq, aspect)) {
    gl_FragColor = color;
    return;
  }
  #endif

  highp vec2 noise = rand( vUv );
  float depth = readDepth( vUv );
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
    #ifdef CLIP_RADIUS
      float strength = 1.0;
      if (isInside(coord1, thresholdSq, aspect, strength)) {
        ao += calcAO( depth, coord1, coord2 ) * strength;
      }
    #else
      ao += calcAO( depth, coord1, coord2 );
    #endif
    z = z - dz;
    l = l + DL;
  }
  ao /= float( samples );
  ao = 1.0 - ao;
  vec3 lumcoeff = vec3( 0.299, 0.587, 0.114 );
  float lum = dot( color.rgb, lumcoeff );
  float aoVal = mix(ao, 1.0, lum * lumInfluence);
  vec3 final = vec3( color.rgb * aoVal );
  if ( onlyAO ) {
    final = vec3(aoVal);
  }
  gl_FragColor = vec4(final, 1.0);
}