precision mediump float;

#define LUT_FLIP_Y
#define LENS_DISTORT
// #define FILM_GRAIN
#define VIGNETTE
#define DUST_OVERLAY
// #define USE_LUT
// #define ALLOW_GRAYSCALE

varying vec2 vUv;
uniform highp sampler2D tDiffuse;
uniform highp sampler2D tBloomDiffuse;
uniform vec2 resolution;
uniform vec3 color1;
uniform vec3 color2;
uniform float cameraFar;
uniform float cameraNear;
uniform vec2 dustMapResolution;
uniform sampler2D dustMap;
uniform sampler2D lookupMap;
uniform float time;
uniform float steps;
uniform float animation;

#ifdef INCLUDE_SSAO
uniform highp sampler2D tSSAO;
#endif

#ifdef LENS_DISTORT
uniform float lensDistort;
uniform float lensDistortK;
uniform float lensDistortCubicK;
uniform float lensDistortScale;
#endif

#ifdef ALLOW_GRAYSCALE
uniform bool grayscale;
#endif

#ifdef FILM_GRAIN
uniform float grainStrength;
#endif

#ifdef VIGNETTE
uniform float vignetteMin;
uniform float vignetteMax;
uniform float vignetteStrength;
uniform float vignetteScale;
#pragma glslify: vignette = require('./vignette');

#endif

uniform float bloomOpacity;

#pragma glslify: random = require('glsl-random');
#pragma glslify: luma = require('glsl-luma');
#pragma glslify: PI = require('glsl-pi');
#pragma glslify: lut = require('glsl-lut');
#pragma glslify: screen = require('glsl-blend/screen');
#pragma glslify: backgroundUV = require('../glsl-background');
#pragma glslify: rgbmToLinear = require('../rgbm-to-linear');
#pragma glslify: decodeHDR = require('../decode-hdr');
#pragma glslify: decodeFloat = require('../decode-float');

#pragma glslify: blendScreen = require(glsl-blend/screen)


#define saturate(a) clamp( a, 0.0, 1.0 )
#define toneMappingExposure 1.0
#define toneMappingWhitePoint 1.0

// exposure only
vec3 LinearToneMapping( vec3 color ) {

  return toneMappingExposure * color;

}

// source: https://www.cs.utah.edu/~reinhard/cdrom/
vec3 ReinhardToneMapping( vec3 color ) {

  color *= toneMappingExposure;
  return saturate( color / ( vec3( 1.0 ) + color ) );

}

// source: http://filmicgames.com/archives/75
#define Uncharted2Helper( x ) max( ( ( x * ( 0.15 * x + 0.10 * 0.50 ) + 0.20 * 0.02 ) / ( x * ( 0.15 * x + 0.50 ) + 0.20 * 0.30 ) ) - 0.02 / 0.30, vec3( 0.0 ) )
vec3 Uncharted2ToneMapping( vec3 color ) {

  // John Hable's filmic operator from Uncharted 2 video game
  color *= toneMappingExposure;
  return saturate( Uncharted2Helper( color ) / Uncharted2Helper( vec3( toneMappingWhitePoint ) ) );

}

// source: http://filmicgames.com/archives/75
vec3 OptimizedCineonToneMapping( vec3 color ) {

  // optimized filmic operator by Jim Hejl and Richard Burgess-Dawson
  color *= toneMappingExposure;
  color = max( vec3( 0.0 ), color - 0.004 );
  return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );

}

float smootherstep(float edge0, float edge1, float x) {
  float t = (x - edge0)/(edge1 - edge0);
  float t1 = t*t*t*(t*(t*6. - 15.) + 10.);
  return clamp(t1, 0.0, 1.0);
}

vec4 sample (sampler2D map, vec2 uv) {
  #ifndef FLOAT_BUFFER
    float f = decodeHDR(texture2D(map, uv));
    return vec4(f, f, f, 1.0);
  #else
    return texture2D(map, uv).rrra;
  #endif
}

vec3 applyLensDistort (sampler2D map, vec2 uv, float distort, float k, float kCube, float scale) {
  vec3 eta = vec3(1.0 + distort * 0.9, 1.0 + distort * 0.6, 1.0 + distort * 0.3);
  
  //texture coordinates
  vec2 delta = uv - 0.5;
  float r2 = delta.x * delta.x + delta.y * delta.y;
  float f = 0.0;

  //only compute the cubic distortion if necessary
  if( kCube == 0.0)
  {
      f = 1.0 + r2 * k;
  }else {
      f = 1.0 + r2 * (k + kCube * sqrt(r2));
  }

  // get the right pixel for the current position
  vec2 rCoords = (f * eta.r) * scale * (delta) + 0.5;
  vec2 gCoords = (f * eta.g) * scale * (delta) + 0.5;
  vec2 bCoords = (f * eta.b) * scale * (delta) + 0.5;

  vec3 inputDistort = vec3(0.0); 
  inputDistort.r = sample(map, rCoords).r;
  inputDistort.g = sample(map, gCoords).g;
  inputDistort.b = sample(map, bCoords).b;
  return inputDistort;
}

vec2 kaleidoscope (vec2 uv, float n) {
  float aspect = resolution.x / resolution.y;
  float skew = 2.0;
  float angleStep = (PI * 2.0) / n;

  vec2 cUv = uv;
  cUv -= 0.5;
  cUv.x *= aspect;
  cUv.x *= skew * 0.5;

  float angle = atan(cUv.y, cUv.x);
  // angle = abs(mod(angle, angleStep * 2.0) - angleStep);
  angle += -PI / 2.0 + time * -0.025;
  angle = mod(angle, angleStep) / angleStep;
  angle = 1.0 - abs(angle * 2.0 - 1.0) * 0.5 + 0.5;
  angle = mix(angle, angle + 0.2, animation);
  angle *= angleStep;

  float radius = length(cUv);

  uv = vec2(cos(angle), sin(angle)) * radius;
  uv.x /= aspect;
  uv.x *= skew * 1.0;
  #ifdef IS_PORTRAIT
    uv *= mix(1.0, 1.5, animation);
  #else
    uv *= mix(1.25, 1.5, animation);
  #endif
  uv = uv * 0.5 + 0.5;
  return uv;
}

vec2 kaleidoscope2 (vec2 uv, float n) {
  float angleStep = PI / 3.0;
  vec2 targetResolution = vec2(911.0, 502.0);
  // uv = backgroundUV(uv, resolution, targetResolution);

  vec2 cUv = uv;
  float aspect = resolution.x / resolution.y;
  cUv -= 0.5;
  cUv.x *= aspect;

  float angle = atan(cUv.y, cUv.x);
  angle += time * 0.0;
  angle = abs(mod(angle, angleStep * 2.0) - angleStep);
  // angle += PI / 2.0;
  
  // angle -= time * 0.2;

  float radius = length(cUv);
  // uv.x = (radius * cos(angle)) + 0.5;
  // uv.y = (radius * sin(angle)) + 0.5;
  uv = vec2(cos(angle), sin(angle)) * radius;
  uv.x /= aspect;
  uv *= 2.0;
  uv = uv * 0.5 + 0.5;
  // float len = 0.5;
  // uv.x = len - abs(uv.x - len);
  // uv.y = 1.0 - (len - abs(uv.y - len));
  return uv;
}

vec2 kaleidoscope3 (vec2 uv, float n) {
  vec2 targetResolution = vec2(911.0, 502.0);
  float aspect = resolution.x / resolution.y;
  float targetAspect = targetResolution.x / targetResolution.y;
  uv = uv * 2.0 - 1.0;

  float kScale = 1.0;

  // uv.x *= resolution.x / resolution.y;
  float repeatAngle = PI / floor(n);

  uv.x *= aspect;
  uv.x *= targetAspect * 0.5;
  float r = length(uv);
  float originalAngle = atan(uv.y, uv.x);
  float a = originalAngle / repeatAngle;
  a += time * -0.025 + PI / 2.0;
  a += PI / 2.0;
  a = mix(fract(a), 1.0 - fract(a), mod(floor(a), 2.0)) * repeatAngle;
  vec2 newUV = (vec2(cos(a), sin(a)) * r);
  newUV.x /= aspect;
  newUV.x *= targetAspect * 1.0;
  // #ifdef IS_PORTRAIT
  //   newUV *= 1.0;
  // #else
    newUV *= kScale;
  // #endif
  newUV = newUV * 0.5 + 0.5;
  return newUV;
}

void main () {
  
  #ifdef VIGNETTE
  float v = vignette(vUv, resolution, vignetteMin, vignetteMax, vignetteScale);
  #endif
  
  vec2 texCoord = vUv;
  // texCoord = backgroundUV(texCoord, resolution, vec2(911.0, 502.0));
  // float anim = sin(time) * 0.5 + 0.5;
  vec2 modUV = kaleidoscope(texCoord, 3.0);
  // vec2 modUV = kaleidoscope2(texCoord * 2.0 - 1.0, 3.0);
  
  // texCoord = modUV;
  texCoord = modUV;
  // texCoord = mix(modUV, texCoord, v);

  #ifdef LENS_DISTORT
    vec3 distortRGB = applyLensDistort(tDiffuse, texCoord, lensDistort, lensDistortK, lensDistortCubicK, lensDistortScale);
    vec4 background = vec4(distortRGB, 1.0);
  #else
    vec4 background = (sample(tDiffuse, texCoord));
  #endif

  #ifdef INCLUDE_SSAO
    float texDepth = texture2D(tSSAO, texCoord).r;
    background.rgb *= texDepth;
  #endif

  vec4 foreground = (sample(tBloomDiffuse, texCoord));
  vec2 cUv = vUv - 0.5;
  cUv.x *= resolution.x / resolution.y;

  // foreground.rgb += deband * 150.0 * smoothstep(0.0, 0.1, L);
  // foreground.rgb += deband * 40.0;

  // gl_FragColor = foreground;
  gl_FragColor.rgb = background.rgb + foreground.rgb * bloomOpacity;
  // gl_FragColor.rgb = mix(gl_FragColor.rgb, background.rgb * 0.5 + foreground.rgb, animation);
  
  // gl_FragColor.rgb = blendScreen(background.rgb, foreground.rgb);
  gl_FragColor.a = 1.0;

  #ifdef VIGNETTE
  gl_FragColor.rgb = mix(gl_FragColor.rgb, foreground.rgb, v);
  #endif


  float dist = length(cUv);
  vec3 overlay = vec3(smoothstep(1.5, 0.0, dist));
  // gl_FragColor.rgb += overlay * 0.01;
  float deband = random(gl_FragCoord.xy) / 255.0;
  float L = luma(gl_FragColor.rgb);
  // gl_FragColor.rgb += deband * 30.0;

  // L = luma(gl_FragColor.rgb);
  // float whiteSpot = smoothstep(1.0, 4.0, L);
  // gl_FragColor = clamp(gl_FragColor, 0.0, 1.0);
  // gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), whiteSpot);
  // gl_FragColor = background;
 
 
  gl_FragColor.rgb = mix(vec3(color1), vec3(color2), L);
  L = luma(gl_FragColor.rgb);
  gl_FragColor.rgb += deband * 40.0 * smoothstep(0.0, 0.5, L);
 
  #if defined(DUST_OVERLAY) && !defined(IS_MOBILE)
    vec2 bgUV = backgroundUV(vUv, resolution, dustMapResolution);
    vec4 dustOverlay = texture2D(dustMap, bgUV);
    // vec3 colorWithDust = gl_FragColor.rgb + dustOverlay.r;
    vec3 colorWithDust = screen(gl_FragColor.rgb, vec3(dustOverlay.r));
    float dustFactor = smoothstep(0.0, 0.3, luma(foreground.rgb));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, colorWithDust, dustFactor * 1.0);
  #endif

  #if defined(USE_LUT) && !defined(IS_MOBILE)
    gl_FragColor.rgb = mix(gl_FragColor.rgb, lut(gl_FragColor, lookupMap).rgb, 0.5);
    // gl_FragColor.rgb = mix(gl_FragColor.rgb, effected, animation);
  #endif
  // gl_FragColor.rgb = vec3(texDepth);
  #ifdef FLOAT_BUFFER
    gl_FragColor.rgb = min(gl_FragColor.rgb, 1.0);
  #endif
}