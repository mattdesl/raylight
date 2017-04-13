const noop = () => {};

module.exports = function loadTexture (src, opt, cb) {
  if (typeof opt === 'function') {
    cb = opt;
    opt = {};
  }
  opt = Object.assign({}, opt);
  cb = cb || noop;

  const loader = new SimpleTextureLoader();
  loader.encoding = opt.encoding || THREE.LinearEncoding;

  const texture = loader.load(src, texture => {
    texture.name = src;
    setTextureParams(texture, opt);
    if (opt.renderer) {
      // Force texture to be uploaded to GPU immediately,
      // this will avoid "jank" on first rendered frame
      opt.renderer.setTexture2D(texture, 0);
    }
    cb(null, texture);
  }, progress => {
    // nothing..
  }, () => {
    const msg = `Could not load texture ${src}`;
    console.error(msg);
    cb(new Error(msg));
  }, opt);
  return texture;
}

function setTextureParams (texture, opt) {
  texture.needsUpdate = true;
  if (typeof opt.flipY === 'boolean') texture.flipY = opt.flipY;
  if (typeof opt.mapping !== 'undefined') {
    texture.mapping = opt.mapping;
  }
  if (typeof opt.format !== 'undefined') texture.format = opt.format;
  if (opt.repeat) texture.repeat.copy(opt.repeat);
  texture.wrapS = opt.wrapS || THREE.ClampToEdgeWrapping;
  texture.wrapT = opt.wrapT || THREE.ClampToEdgeWrapping;
  texture.minFilter = opt.minFilter || THREE.LinearMipMapLinearFilter;
  texture.magFilter = opt.magFilter || THREE.LinearFilter;
  texture.generateMipmaps = opt.generateMipmaps !== false;
}

// The default ThreeJS Image/Texture loader has some
// really weird code that breaks on Chrome sometimes.
// Here's a simpler loader that seems to work better.

function SimpleTextureLoader () {
}

SimpleTextureLoader.prototype.load = function (url, onLoad, onProgress, onErorr, opt) {
  var texture = new THREE.Texture();
  if (opt && opt.encoding) texture.encoding = opt.encoding;

  var image = new window.Image();
  image.onload = function () {
    texture.image = image;
    texture.needsUpdate = true;
    onLoad(texture);
  };
  image.onerror = function (err) {
    onErorr(err);
  };
  image.src = url;
  return texture;
};
