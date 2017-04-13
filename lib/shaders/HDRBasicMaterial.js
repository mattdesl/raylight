const glslify = require('glslify');
const path = require('path');

// This is the original source, we will copy + paste it for our own GLSL
const vertexShader = THREE.ShaderChunk.meshphysical_vert;

// Our custom shaders
const fragmentShader = glslify(path.resolve(__dirname, 'basic-hdr.frag'));

module.exports = HDRMaterial;
function HDRMaterial (parameters = {}) {
  THREE.MeshBasicMaterial.call( this );
  this.uniforms = THREE.UniformsUtils.merge([
    THREE.ShaderLib.basic.uniforms,
    {
      time: { type: 'f', value: 1 },
      emissiveFactor: { type: 'f', value: 1 },
    }
  ]);
  setFlags(this);
  this.setValues(parameters);
}

HDRMaterial.prototype = Object.create( THREE.MeshBasicMaterial.prototype );
HDRMaterial.prototype.constructor = HDRMaterial;
HDRMaterial.prototype.isMeshBasicMaterial = true;

HDRMaterial.prototype.copy = function ( source ) {
  THREE.MeshBasicMaterial.prototype.copy.call( this, source );
  this.uniforms = THREE.UniformsUtils.clone(source.uniforms);
  setFlags(this);
  return this;
};

function setFlags (material) {
  material.vertexShader = vertexShader;
  material.fragmentShader = fragmentShader;
  material.type = 'HDRMaterial';
  material.blending = THREE.NoBlending;
}