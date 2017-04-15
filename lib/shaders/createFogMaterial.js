const defined = require('defined');
const glslify = require('glslify');
const path = require('path');
const injectDefines = require('glsl-inject-defines');
const { floatBufferType, floatBufferDefine } = require('../context');

// Our custom shaders
const fragmentShader = injectDefines(glslify(path.resolve(__dirname, 'fog.frag')), floatBufferDefine);
const vertexShader = glslify(path.resolve(__dirname, 'fog.vert'));

module.exports = function (opt) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    blending: THREE.NoBlending,
    transparent: !floatBufferType,
    uniforms: {
      cameraWorldPosition: { type: 'v3', value: new THREE.Vector3() },
      pointLightPosition: { type: 'v3', value: new THREE.Vector3() },
      pointLightDiffuse: { type: 'f', value: 1 },
      fogLightStrength: { type: 'f', value: 0 },
      diffuse: { type: 'f', value: defined(opt.diffuse, 1) }
    }
  });
}