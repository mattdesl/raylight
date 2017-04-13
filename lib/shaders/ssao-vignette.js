var glslify = require('glslify')
module.exports = threeShaderSSAO
function threeShaderSSAO (opt) {
  if (typeof global.THREE === 'undefined') {
    throw new TypeError('You must have THREE in global scope for this module.')
  }
  opt = opt || {}
  return {
    uniforms: {
      'tDiffuse':     { type: "t", value: null },
      'tDepth':       { type: "t", value: null },
      'resolution':   { type: "v2", value: new THREE.Vector2( 512, 512 ) },
      'cameraNear':   { type: "f", value: 1 },
      'cameraFar':    { type: "f", value: 100 },
      'onlyAO':       { type: "i", value: 0 },
      'aoClamp':      { type: "f", value: 0.95 },
      'lumInfluence': { type: "f", value: 1 }
    },
    vertexShader: glslify('./ssao-vignette.vert'),
    fragmentShader: glslify('./ssao-vignette.frag')
  };
};
