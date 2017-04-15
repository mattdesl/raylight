varying vec3 vWorldPos;
uniform float diffuse;
uniform vec3 cameraWorldPosition;
uniform vec3 pointLightPosition;
uniform float pointLightDiffuse;
uniform float fogLightStrength;

#pragma glslify: encodeRGBM = require('./linear-to-rgbm');
#pragma glslify: encodeFloat = require('./encode-float');
#pragma glslify: InScatter = require('./inscatter');

void main() {
  float color = diffuse;
  
  //direction from camera
  vec3 positionToCamera = vWorldPos - cameraWorldPosition;
  float positionToCameraLength = length(positionToCamera);
  // normalize
  positionToCamera = normalize(positionToCamera);

  float scatter = InScatter(cameraWorldPosition, positionToCamera, pointLightPosition, positionToCameraLength);
  float fogAmt = pointLightDiffuse * scatter * fogLightStrength;
  color += fogAmt;

  #ifndef FLOAT_BUFFER
    gl_FragColor = encodeFloat(color);
  #else
    gl_FragColor = vec4(vec3(color), 1.0);
  #endif
}
