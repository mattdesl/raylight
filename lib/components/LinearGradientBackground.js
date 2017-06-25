const glslify = require('glslify')
const path = require('path')
const vert = glslify(path.resolve(__dirname, '../shaders/linear-gradient.vert'));
const frag = glslify(path.resolve(__dirname, '../shaders/linear-gradient.frag'));
const defined = require('defined');

module.exports = class LinearGradientBackground extends THREE.Mesh {

  constructor (opt = {}) {
    let colors = opt.colors || [ 'white', 'black' ];
    colors = Array.isArray(colors) ? colors : [ colors ];
    if (colors.length !== 2) throw new TypeError('Must provide 2 colors');

    const geometry = opt.geometry || new THREE.PlaneGeometry(2, 2, 1);
    const material = new THREE.RawShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        smoothing: { type: 'v2', value: opt.smoothing || new THREE.Vector2(0, 1) },
        zoom: { type: 'f', value: defined(opt.zoom, 1.0) },
        color1: { type: 'c', value: new THREE.Color(colors[0]) },
        color2: { type: 'c', value: new THREE.Color(colors[1]) }
      }
    });

    super(geometry, material);
    this.frustumCulled = false;
  }
}
