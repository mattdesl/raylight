const assign = require('object-assign');

module.exports = createPostShader
function createPostShader (opt) {
  if (typeof global.THREE === 'undefined') {
    throw new TypeError('You must have THREE in global scope for this module.');
  }
  opt = opt || {};
  return {
    uniforms: assign({
      tDiffuse: { type: 't', value: new THREE.Texture() },
      resolution: { type: 'v2', value: opt.resolution || new THREE.Vector2() }
    }, opt),
    vertexShader: opt.vertexShader,
    fragmentShader: opt.fragmentShader
  };
};
