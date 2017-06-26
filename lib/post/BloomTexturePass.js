
const glslify = require('glslify');
const path = require('path');
const clamp = require('clamp');
const CopyShader = require('three-copyshader');
const injectDefines = require('glsl-inject-defines');
const { assets, floatBufferType, floatBufferDefine } = require('../context');
const isMobile = require('../util/isMobile');
const assign = require('object-assign');

const downsample = 2;
const ssaoDownsample = 2;
const maxSize = 2048;
const blurLevels = [ 2, 1 ];

const dustKey = assets.queue({
  url: 'assets/textures/dust_compressed.jpg',
  minFilter: THREE.LinearFilter,
  generateMipmaps: false
});

const lutKey = assets.queue({
  url: 'assets/textures/lookup_miss_etikate.png',
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  generateMipmaps: false
});

const palettes = [
  ['hsl(0, 0%, 8%)', 'hsl(0, 0%, 92%)'],
  // [ '#0f0e0e', 'white' ],
  // ['#12052b', '#cc3116'],
  // ['#070b1c', '#9731ea'],
  // ['#12052b', '#ea31bf'],
  // ['#12052b', '#ffaa00'],
  // ['#49173f', '#3089e8'],
  // ['#4f0c3b', '#ffaa00'],
]

module.exports = BloomPass;
function BloomPass (scene, camera, opt = {}) {
  this.scene = scene;
  this.camera = camera;

  this.debugCopyShader = new THREE.ShaderMaterial(CopyShader);

  this._lastWidth = null;
  this._lastHeight = null;
  this._blurTarget = null; // lazily created
  this._thresholdTarget = null;
  this._useSSAO = false;

  this.enabled = true;
  this.needsSwap = true;
  this.oldColor = new THREE.Color();
  this.oldAlpha = 1;
  this.clearColor = new THREE.Color('#fff');
  this.clearAlpha = 0;

  this.vignetteScale = 1;
  this.vignetteSize = 0.6;
  this.vignetteMin = 0.428;
  this.vignetteMax = 0.713;
  this.vignetteStrength = 0.611;

  if (this._useSSAO && floatBufferType) {
    this.ssaoShader = new THREE.RawShaderMaterial({
      blending: THREE.NoBlending,
      vertexShader: glslify(path.resolve(__dirname + '/../shaders/pass.vert')),
      fragmentShader: glslify(path.resolve(__dirname + '/../shaders/bloom/ssao.frag')),
      uniforms: {
        cameraFar: { type: 'f', value: 0 },
        cameraNear: { type: 'f', value: 0 },
        tDiffuse: { type: 't', value: null },
        resolution: { type: "v2", value: new THREE.Vector2( 512, 512 ) },
        onlyAO: { type: "i", value: 0 },
        aoClamp: { type: "f", value: 0.15 },
        lumInfluence: { type: "f", value: 1 }
      }
    });
    this.ssaoShader.name = 'bloom-gaussian-blur-material';
  }

  this.thresholdBackground = new THREE.Color(opt.background);
  this.thresholdShader = new THREE.RawShaderMaterial({
    blending: THREE.NoBlending,
    vertexShader: glslify(path.resolve(__dirname + '/../shaders/pass.vert')),
    fragmentShader: injectDefines(glslify(path.resolve(__dirname + '/../shaders/bloom/threshold.frag')), floatBufferDefine),
    uniforms: {
      vignetteScale: { type: 'f', value: this.vignetteScale },
      vignetteMin: { type: 'f', value: this.vignetteMin },
      vignetteMax: { type: 'f', value: this.vignetteMax },
      vignetteStrength: { type: 'f', value: this.vignetteStrength },
      lumaThreshold: { type: 'f', value: 1.0 },
      background: { type: 'c', value: this.thresholdBackground },
      tDiffuse: { type: 't', value: null },
      resolution: { type: 'v2', value: new THREE.Vector2(1, 1) }
    }
  });
  this.thresholdShader.name = 'bloom-threhsold-material';

  this.gaussianShader = new THREE.RawShaderMaterial({
    blending: THREE.NoBlending,
    vertexShader: glslify(path.resolve(__dirname + '/../shaders/pass.vert')),
    fragmentShader: injectDefines(glslify(path.resolve(__dirname + '/../shaders/bloom/gaussian-blur.frag')), floatBufferDefine),
    uniforms: {
      vignetteScale: { type: 'f', value: this.vignetteScale },
      vignetteMin: { type: 'f', value: this.vignetteMin },
      vignetteMax: { type: 'f', value: this.vignetteMax },
      vignetteStrength: { type: 'f', value: this.vignetteStrength },
      tDiffuse: { type: 't', value: null },
      direction: { type: 'v2', value: new THREE.Vector2() },
      resolution: { type: 'v2', value: new THREE.Vector2(1, 1) }
    }
  });
  this.gaussianShader.name = 'bloom-gaussian-blur-material';

  const defines = assign({}, floatBufferDefine);
  if (opt.gammaOutput) {
    defines.GAMMA_OUTPUT = opt.gammaOutput.toFixed(1);
  }
  if (this._useSSAO) {
    defines.INCLUDE_SSAO = '';
  }
  if (isMobile) {
    defines.IS_PORTRAIT = '';
    defines.IS_MOBILE = '';
  }
  const dustMap = assets.get(dustKey);
  const lutMap = assets.get(lutKey);
  this.lutStrength = 0;
  this.combineShader = new THREE.RawShaderMaterial({
    blending: THREE.NoBlending,
    vertexShader: glslify(path.resolve(__dirname + '/../shaders/pass.vert')),
    fragmentShader: injectDefines(glslify(path.resolve(__dirname + '/../shaders/bloom/combine.frag')), defines),
    uniforms: {
      animation: { type: 'f', value: 0 },
      dustMap: { type: 't', value: dustMap },
      lookupMap: { type: 't', value: lutMap },
      dustMapResolution: { type: 'v2', value: new THREE.Vector2(dustMap.image.width, dustMap.image.height) },
      vignetteScale: { type: 'f', value: this.vignetteScale },
      vignetteMin: { type: 'f', value: this.vignetteMin },
      vignetteMax: { type: 'f', value: this.vignetteMax },
      vignetteStrength: { type: 'f', value: this.vignetteStrength },
      lensDistort: { type: 'f', value: 0.005 },
      lensDistortK: { type: 'f', value: 0.5 },
      lensDistortCubicK: { type: 'f', value: 1 },
      time: { type: 'f', value: 0 },
      lensDistortScale: { type: 'f', value: 0.96 },
      vignetteStrength: { type: 'f', value: 1 },
      bloomOpacity: { type: 'f', value: 0.95 },
      bloomMultiply: { type: 'f', value: 1.15 },
      lutStrength: { type: 'f', value: this.lutStrength },
      resolution: { type: 'v2', value: new THREE.Vector2() },
      grayscale: { type: 'i', value: 0 },
      grainStrength: { type: 'f', value: window.devicePixelRatio >= 2 ? 5 : 0 },
      tBloomDiffuse: { type: 't', value: null },
      tDiffuse: { type: 't', value: null },
      tSSAO: { type: 't', value: null },
      shockwavePosition: { type: 'v2', value: new THREE.Vector2() },
      shockwaveStrength: { type: 'f', value: 0 },
      shockwaveRadius: { type: 'f', value: 0 },
      steps: { type: 'f', value: 4 },
      color1: { type: 'c', value: new THREE.Color() },
      color2: { type: 'c', value: new THREE.Color() }
    }
  });
  this.combineShader.name = 'bloom-combine-material';

  this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  this.postScene = new THREE.Scene();

  this.postQuad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2));
  this.postQuad.name = 'godray-post-quad';
  this.postScene.add(this.postQuad);

  this.renderToScreen = false;
  this.blurRadius = 1;
  this.time = 0;
  this.animation = 0;

  const recolor = () => {
    const [ a, b ] = palettes[this.paletteIndex++ % palettes.length];
    this.combineShader.uniforms.color1.value.set(a);
    this.combineShader.uniforms.color2.value.set(b);
  };
  this.paletteIndex = 0;
  recolor();
  window.addEventListener('mousedown', recolor);

  const gui = opt.gui;
  if (gui) {
    const folder = gui.addFolder('post-fx');
    const params = {
      radius: this.blurRadius,
      grayscale: this.combineShader.uniforms.grayscale.value === 1,
      lensDistort: this.combineShader.uniforms.lensDistort.value,
      lensDistortK: this.combineShader.uniforms.lensDistortK.value,
      lensDistortCubicK: this.combineShader.uniforms.lensDistortCubicK.value,
      lensDistortScale: this.combineShader.uniforms.lensDistortScale.value,
      grain: this.combineShader.uniforms.grainStrength.value,
      opacity: this.combineShader.uniforms.bloomOpacity.value,
      threshold: this.thresholdShader.uniforms.lumaThreshold.value,
      vignetteMin: this.combineShader.uniforms.vignetteMin.value,
      vignetteMax: this.combineShader.uniforms.vignetteMax.value,
      vignetteStrength: this.combineShader.uniforms.vignetteStrength.value,
    };
    const onChange = () => {
      this.blurRadius = params.radius;
      this.combineShader.uniforms.grayscale.value = params.grayscale ? 1 : 0;
      this.combineShader.uniforms.grainStrength.value = params.grain;
      this.combineShader.uniforms.bloomOpacity.value = params.opacity;
      this.combineShader.uniforms.vignetteMin.value = params.vignetteMin;
      this.combineShader.uniforms.vignetteMax.value = params.vignetteMax;
      this.combineShader.uniforms.vignetteStrength.value = params.vignetteStrength;
      this.combineShader.uniforms.lensDistort.value = params.lensDistort;
      this.combineShader.uniforms.lensDistortK.value = params.lensDistortK;
      this.combineShader.uniforms.lensDistortCubicK.value = params.lensDistortCubicK;
      this.combineShader.uniforms.lensDistortScale.value = params.lensDistortScale;
      this.thresholdShader.uniforms.lumaThreshold.value = params.threshold;
    };
    folder.add(params, 'threshold', 0, 1).onChange(onChange);
    folder.add(params, 'radius', 0, 2).onChange(onChange);
    folder.add(params, 'opacity', 0, 2).onChange(onChange);
    folder.add(params, 'grain', 0, 10).onChange(onChange);
    folder.add(params, 'vignetteMin', 0, 1).onChange(onChange);
    folder.add(params, 'vignetteMax', 0, 1).onChange(onChange);
    folder.add(params, 'vignetteStrength', 0, 1).onChange(onChange);
    folder.add(params, 'grayscale').onChange(onChange);
    // folder.add(params, 'lensDistort', 0, 1).onChange(onChange);
    // folder.add(params, 'lensDistortK', 0, 1).onChange(onChange);
    // folder.add(params, 'lensDistortCubicK', 0, 1).onChange(onChange);
    // folder.add(params, 'lensDistortScale', 0, 1).onChange(onChange);
  }
}

BloomPass.prototype = {

  tick: function (dt) {
    this.time += dt;
  },

  _updateVignette: function (shader) {
    const resolution = shader.uniforms.resolution.value;
    const aspect = resolution.x / resolution.y;
    const vignetteScale = resolution.x > resolution.y
      ? 1 * aspect
      : 1 / aspect;
    shader.uniforms.vignetteScale.value = vignetteScale * this.vignetteSize;
  },

  setShockwave: function (position, radius, strength) {
    this.combineShader.uniforms.shockwavePosition.value.copy(position);
    this.combineShader.uniforms.shockwaveRadius.value = radius;
    this.combineShader.uniforms.shockwaveStrength.value = strength;
  },

  _updateTargets: function (renderTarget) {
    var width = renderTarget.width;
    var height = renderTarget.height;
    var downWidth = clamp(Math.floor(width / downsample), 2, maxSize);
    var downHeight = clamp(Math.floor(height / downsample), 2, maxSize);
    if (!this._thresholdTarget || !this._blurTarget) {      
      this._blurTarget = new THREE.WebGLRenderTarget(downWidth, downHeight);
      this._blurTarget.texture.minFilter = floatBufferType ? THREE.LinearFilter : THREE.NearestFilter;
      this._blurTarget.texture.magFilter = floatBufferType ? THREE.LinearFilter : THREE.NearestFilter;
      this._blurTarget.texture.generateMipmaps = false;
      this._blurTarget.texture.type = floatBufferType ? THREE.HalfFloatType : THREE.UnsignedByteType;
      this._blurTarget.texture.format = floatBufferType ? THREE.RGBFormat : THREE.RGBAFormat;
      this._blurTarget.depthBuffer = false;
      this._blurTarget.stencilBuffer = false;
      this._blurTarget2 = this._blurTarget.clone();
      this._ldrBlurTarget = this._blurTarget.clone();
      this._ldrBlurTarget.texture.type = THREE.UnsignedByteType;
      this._ldrBlurTarget.texture.format = THREE.RGBFormat;
      this._thresholdTarget = this._blurTarget.clone();
    } else if (this._thresholdTarget.width !== downWidth || this._thresholdTarget.height !== downHeight) {
      this._thresholdTarget.setSize(downWidth, downHeight);
      this._blurTarget.setSize(downWidth, downHeight);
      this._blurTarget2.setSize(downWidth, downHeight);
      this._ldrBlurTarget.setSize(downWidth, downHeight);
    }

    if (this._useSSAO){
      var ssaoDownWidth = clamp(Math.floor(width / ssaoDownsample), 2, maxSize);
      var ssaoDownHeight = clamp(Math.floor(height / ssaoDownsample), 2, maxSize);
      if (!this._ldrTarget) {
        this._ldrTarget = new THREE.WebGLRenderTarget(ssaoDownWidth, ssaoDownHeight);
        this._ldrTarget.texture.minFilter = THREE.LinearFilter;
        this._ldrTarget.texture.magFilter = THREE.LinearFilter;
        this._ldrTarget.texture.generateMipmaps = false;
        this._ldrTarget.depthBuffer = false;
        this._ldrTarget.stencilBuffer = false;
        this._ldrTarget.texture.type = THREE.UnsignedByteType;
        this._ldrTarget.texture.format = THREE.RGBFormat;
      } else if (this._ldrTarget.width !== ssaoDownWidth || this._ldrTarget.height !== ssaoDownHeight) {
        this._ldrTarget.setSize(ssaoDownWidth, ssaoDownHeight);
      }
    }
  },

  render: function (renderer, writeBuffer, readBuffer) {
    var dpr = renderer.getPixelRatio();
    this._updateTargets(readBuffer);
    var finalBuffer = this.renderToScreen ? undefined : writeBuffer;

    // 1. First, render scene into downsampled FBO and threshold color
    this.oldColor.copy(renderer.getClearColor());
    this.oldAlpha = renderer.getClearAlpha();
    var oldAutoClear = renderer.autoClear;

    // Clear target
    renderer.setClearColor(this.clearColor, this.clearAlpha);
    renderer.autoClear = false;
    renderer.clearTarget(this._thresholdTarget, true, true, false);

    // Draw existing texture into smaller target & also threshold colors
    this.postScene.overrideMaterial = this.thresholdShader;
    this.thresholdShader.uniforms.resolution.value.set(this._thresholdTarget.width, this._thresholdTarget.height);
    this.thresholdShader.uniforms.tDiffuse.value = readBuffer.texture;
    this._updateVignette(this.thresholdShader);
    renderer.render(this.postScene, this.postCamera, this._thresholdTarget, true);

    let nextTarget;
    let bufferA = this._blurTarget;
    let bufferB = this._blurTarget2;
    const iterations = blurLevels.length * 2;

    // apply gaussian blur
    this.postScene.overrideMaterial = this.gaussianShader;
    this.gaussianShader.uniforms.resolution.value.set(this._thresholdTarget.width, this._thresholdTarget.height);
    this._updateVignette(this.gaussianShader);
    for (var i = 0; i < iterations; i++) {
      const blurAmount = blurLevels[Math.floor(i / 2)];
      const radius = this.blurRadius * blurAmount;

      if (i === 0) {
        bufferA = this._thresholdTarget;
      } else if (i === iterations - 1 && floatBufferType) {
        // last iteration, let's use LDR target to save bandwidth
        // if no float buffer, then just use default pattern for convenience
        bufferB = this._ldrBlurTarget;
      }
      this.gaussianShader.uniforms.tDiffuse.value = bufferA.texture;
      const direction = this.gaussianShader.uniforms.direction.value;
      if (i % 2 === 0) direction.set(radius, 0);
      else direction.set(0, radius);

      // render to buffer
      renderer.render(this.postScene, this.postCamera, bufferB, true);

      // swap buffers if we have another iteration
      if (i < (iterations - 1)) {
        var t = bufferA;
        bufferA = bufferB;
        bufferB = t;
      }
    }

    nextTarget = bufferB;

    if (this._useSSAO) {
      // If SSAO is enabled, we draw into a downsampled LDR target
      // and apply SSAO to the depth (G channel of tDiffuse).
      this.postScene.overrideMaterial = this.ssaoShader;
      this.ssaoShader.uniforms.tDiffuse.value = readBuffer.texture;
      this.ssaoShader.uniforms.cameraFar.value = this.camera.far;
      this.ssaoShader.uniforms.cameraNear.value = this.camera.near;
      this.ssaoShader.uniforms.resolution.value.set(this._ldrTarget.width, this._ldrTarget.height);
      renderer.render(this.postScene, this.postCamera, this._ldrTarget, true);
    }

    // Now we render back to original scene, with additive blending!
    this.postScene.overrideMaterial = this.combineShader;
    if (this._useSSAO) {
      this.combineShader.uniforms.tSSAO.value = this._ldrTarget.texture;
    }
    this.combineShader.uniforms.tDiffuse.value = readBuffer.texture;
    this.combineShader.uniforms.tBloomDiffuse.value = nextTarget.texture;
    this.combineShader.uniforms.time.value = this.time;
    this.combineShader.uniforms.animation.value = this.animation;
    this.combineShader.uniforms.lutStrength.value = this.lutStrength;

    this.combineShader.uniforms.resolution.value.set(
      finalBuffer ? finalBuffer.width : (window.innerWidth * dpr),
      finalBuffer ? finalBuffer.height : (window.innerHeight * dpr)
    );
    this._updateVignette(this.combineShader);
    renderer.render(this.postScene, this.postCamera, finalBuffer, true);

    renderer.setClearColor(this.oldColor, this.oldAlpha);
    renderer.autoClear = oldAutoClear;
  },
};
