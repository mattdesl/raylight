varying vec3 vWorldPos;
uniform float diffuse;
uniform vec3 cameraWorldPosition;
uniform vec3 pointLightPosition;
uniform float pointLightDiffuse;
uniform float fogLightStrength;

#pragma glslify: encodeHDR = require('./encode-hdr');
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

  #ifdef FLOAT_BUFFER
    // encode with zero depth
    gl_FragColor = vec4(vec3(color, 0.0, 0.0), 1.0);
  #else
    gl_FragColor = encodeHDR(color);
  #endif
}
