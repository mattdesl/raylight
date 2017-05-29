const defined = require('defined');
const glslify = require('glslify');
const path = require('path');
const injectDefines = require('glsl-inject-defines');
const { floatBufferType, floatBufferDefine } = require('../context');

// This is the original source, we will copy + paste it for our own GLSL
// const vertexShader = THREE.ShaderChunk.meshphysical_vert;
// const fragmentShader = THREE.ShaderChunk.meshphysical_frag;

// Our custom shaders
const fragmentShader = injectDefines(glslify(path.resolve(__dirname, 'standard-hdr.frag')), floatBufferDefine);
const vertexShader = glslify(path.resolve(__dirname, 'standard-hdr.vert'));

module.exports = HDRMaterial;
function HDRMaterial (parameters = {}) {
  THREE.MeshStandardMaterial.call( this );
  this.uniforms = THREE.UniformsUtils.merge([
    THREE.ShaderLib.standard.uniforms,
    {
      emissiveFactor: { type: 'f', value: defined(parameters.emissiveFactor, 1) },
      time: { type: 'f', value: 1 },
      cameraMatrixWorld: { value: new THREE.Matrix4() },
      fogLightStrength: { type: 'f', value: defined(parameters.fogLightStrength, 0.03) },
      fogLightColor: { type: 'c', value: new THREE.Color(parameters.fogLightColor || 'white') },
      fogLightPosition: { type: 'v3', value: parameters.fogLightPosition || new THREE.Vector3() },
    }
  ]);
  setFlags(this);
  delete parameters.emissiveFactor;
  this.setValues(parameters);
}

HDRMaterial.prototype = Object.create( THREE.MeshStandardMaterial.prototype );
HDRMaterial.prototype.constructor = HDRMaterial;
HDRMaterial.prototype.isMeshStandardMaterial = true;

HDRMaterial.prototype.copy = function ( source ) {
  THREE.MeshStandardMaterial.prototype.copy.call( this, source );
  this.uniforms = THREE.UniformsUtils.clone(source.uniforms);
  setFlags(this);
  return this;
};

function setFlags (material) {
  material.vertexShader = vertexShader;
  material.fragmentShader = fragmentShader;
  material.type = 'HDRMaterial';
  material.blending = THREE.NoBlending;
  material.transparent = !floatBufferType;
}