const AssetManager = require('./util/AssetManager');
const query = require('./util/query');
const isMobile = require('./util/isMobile');

// Our WebGL renderer with alpha and device-scaled
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#canvas'),
  alpha: false,
  stencil: false,
  depth: true,
  preserveDrawingBuffer: false,
  antialias: true
});

const assets = new AssetManager({
  renderer
});
const useHalfFloat = !isMobile && query.float !== false;
const floatBufferType = renderer.extensions.get('OES_texture_half_float') && useHalfFloat;
const floatBufferDefine = {};
if (floatBufferType) {
  floatBufferDefine.FLOAT_BUFFER = '';
}

module.exports = {
  renderer,
  assets,
  floatBufferType,
  floatBufferDefine
};
