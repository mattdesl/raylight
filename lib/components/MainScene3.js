
const HDRMaterial = require('../shaders/HDRMaterial');
const HDRBasicMaterial = require('../shaders/HDRBasicMaterial');
const pngStream = require('three-png-stream');
const defined = require('defined');
const concatStream = require('concat-stream');
const createFogMaterial = require('../shaders/createFogMaterial');
const getImagePixels = require('get-image-pixels');
const { randomFloat, shuffle, randomSphere, randomQuaternion, simplex, nextSeed, getSeed } = require('../util/random');
const unindex = require('unindex-mesh');
const palettes = require('nice-color-palettes/500');
const weighted = require('weighted').select;
const convexHull = require('convex-hull');
const smoothMesh = require('taubin-smooth');
const isosurface = require('isosurface');
const { assets } = require('../context');
const BezierEasing = require('bezier-easing');
const newArray = require('new-array');
const colorLuminance = require('color-luminance');
const sampleData = require('sampling');
const vec2 = require('gl-vec2');
const lerp = require('lerp');
const xhr = require('xhr');
const smoothstep = require('smoothstep');
const clamp = require('clamp');
const unlerp = require('unlerp');
const buffer = require('three-buffer-vertex-data');
const triangulate = require('delaunay-triangulate');
const sc = require('simplicial-complex');
const alphaComplex = require('alpha-complex');
const tweenr = require('tweenr')();
const streamSaver = require('streamsaver');
// const VerletPoint = require('verlet-point');
// const VerletPoint = require('verlet-system');
// const VerletPoint = require('verlet-point');

const clustering = require('density-clustering');

const maxSize = 16384;

// const aspect = 10000;
let clicks = 0;
const aspect = 1200 / 1920;
const outputWidth = 7600;
const outputHeight = Math.floor(outputWidth / aspect);

// const glslify = require('glslify');
// const path = require('path');

const imageKey = assets.queue({
  texture: false,
  url: 'assets/textures/sym6.jpg'
});

const envMapKey = assets.queue({
  envMap: true,
  // level: 1,
  // mapping: THREE.CubeReflectionMapping,
  pbr: true,
  url: 'assets/textures/studio015.png',
  equirectangular: true
});

module.exports = class MainScene extends THREE.Object3D {
  constructor (app, colors) {
    super();
    this.app = app;
    this.meshes = [];
    const ambient = new THREE.AmbientLight('hsl(0, 0%, 30%)', 1);
    this.add(ambient);


    const light = new THREE.RectAreaLight('white', 2, 2, 2);
    light.position.z = 4;
    light.position.x = -2;
    light.position.y = 4;
    light.lookAt(new THREE.Vector3());
    const helper = new THREE.RectAreaLightHelper(light);
    // light.add(helper);
    this.add(light);

    // this.colors = [ 'hsl(0, 0%, 5%)', 'white' ];
    this.colors = colors;
    this.colorWeights = getUniformWeights(this.colors.length, [ 0.6 ]);
    
    // const icoGeom = new THREE.TetrahedronGeometry(1.25, 2);
    // const icoGeom = new THREE.SphereGeometry(1, 4, 5);
    // const icoGeom = new THREE.BoxGeometry(1, 3, 1, 1, 2, 1);
    // const icoGeom = new THREE.IcosahedronGeometry(1, 0);
    // const segmentPoints = icoGeom.vertices.slice();
    // icoGeom.dispose();
    // const segmentPoints = newArray(25).map((_, i, list) => {
    //   const t = i / (list.length - 1);
    //   const px = (t * 2 - 1) * 4;
    //   return new THREE.Vector3(px, 0, 0);
    // });

    // const allPoints = this._createBox3DVolume(1, 2);
    // segmentPoints[0] = segmentPoints[segmentPoints.length - 1] = new THREE.Vector3();
    this._createRibbonGroup();
    // this.rotation.y = Math.PI * 2;
    // const segmentPoints = newArray(10).map((_, i, list) => {
    //   const t = i / Math.max(1, list.length - 1);
    //   const angle = t * 2 * Math.PI;
    //   // const cos = Math.cos(angle);
    //   // const sin = Math.sin(angle);
    //   const u = simplex.noise3D(Math.cos(angle), Math.sin(angle), 0);
    //   const v = simplex.noise3D(Math.cos(angle), Math.sin(angle), Math.PI * 2);
    //   return new THREE.Vector3().fromArray(randomSphere([], 1, u, v));
    // });

    
  }

  _createRibbonGroup () {
    // const samples = 11;
    // const sampleStart = Math.floor(randomFloat(0, originalPoints.length));
    // const segmentPoints = originalPoints.slice(sampleStart, sampleStart + samples);

    const sliceCount = 30;
    const spacing = 1;

    const mat = new THREE.Matrix4();
    const mat2 = new THREE.Matrix4();
    const slices = newArray(sliceCount).map((_, c) => {
      const sliceT = c / Math.max(1, sliceCount - 1);

      const segmentPoints = newArray(10).map((_, i, list) => {
        const t = i / (list.length - 1);
        const a = (t * 2 - 1);
        const b = (sliceT * 2 - 1);
        const taper = 1 - (Math.cos(t * Math.PI * 2) * 0.5 + 0.5);
        // const angle = Math.PI * 2 * sliceT;
        // const r = 1;
        // const cos = Math.cos(angle) * r;
        // const sin = Math.sin(angle) * r;
        return new THREE.Vector3(a * 2, b, 0);
      });
      // const segmentPoints = newArray(4).map((_, i, list) => {
      //   const k = i / (list.length - 1);
      //   const angle = Math.PI * 2 * k;

      //   const radius = 1;
      //   const Z = (sliceT * 2.0) - 1.0;
      //   const zScale = Math.sqrt(1.0 - Z * Z) * radius;
      //   const x = Math.cos(angle) * zScale;
      //   const y = Math.sin(angle) * zScale;
      //   const z = Z * radius;
      //   return new THREE.Vector3(x, z, y);
      //   // const r = sliceT * 2 - 1;
      //   // const x = Math.cos(angle) * r;
      //   // const z = Math.sin(angle) * r;
      //   // return new THREE.Vector3(x, (sliceT * 2 - 1), z);
      // });

      const segments = segmentPoints.length;
      return segmentPoints.map((geometryPosition, i) => {
        const t = i / (segments - 1);
        const height = 1;
        const squeeze = 1;
        // const taper = 1 - Math.abs(t * 2 - 1);
        const taper = 1 - (Math.cos(t * Math.PI * 2) * 0.5 + 0.5);
        const tx = (sliceT * 2 - 1) * spacing;
        // const ty = (t * 2 - 1) * height / 2;
        // const tz = 0;
        const position = geometryPosition.clone();
        // mat.makeRotationX((sliceT * 2 - 1) * 0.5 * taper);
        // mat2.makeShear(1, 0, 0);
        // mat.multiply(mat2);
        // position.applyMatrix4(mat);
        // position.y += (sliceT * 2 - 1) * 2;
        const freq = new THREE.Vector3(1, 0, 0.25).multiplyScalar(1);
        const amp = 1;
        const curl = new THREE.Vector3();
        const offset = sliceT * 0.05;
        curlNoise(position.x * freq.x, position.y * freq.y + offset, position.z * freq.z, curl);
        position.add(curl.multiplyScalar(amp));
        return position;
      });
    });
    slices.forEach(ribbon => {
      const spline = new THREE.CatmullRomCurve3(ribbon);
      spline.tension = 1;
      spline.type = 'catmullrom';

      const volume = createVolumeLine(spline, {
        width: 0.01,
        height: 0.01,
        square: false,
        steps: 600,
        radius: randomFloat(0.001, 0.02),
        color: weighted.select(this.colors, this.colorWeights)
      });
      this.add(volume);
    });
  }


  _createBox3DVolume (size = 1, subdivs = 1) {
    if (typeof size === 'number') size = new THREE.Vector3(size, size, size);
    if (typeof subdivs === 'number') subdivs = new THREE.Vector3(subdivs, subdivs, subdivs);
    const geom = new THREE.BoxGeometry(size.x, size.y, size.z, subdivs.x, subdivs.y, subdivs.z);
    const points = geom.vertices.slice();
    geom.dispose();
    return points;
  }

  _renderLine (vertices, color = 'black') {
    const geometry = new THREE.Geometry();
    geometry.vertices = vertices;
    const material = new THREE.LineBasicMaterial({
      color
    });
    const line = new THREE.Line(geometry, material);
    this.add(line);
    return line;
  }

  _renderPoints (vertices, color = 'black') {
    const geometry = new THREE.Geometry();
    geometry.vertices = vertices;
    const material = new THREE.PointsMaterial({
      color,
      size: 4,
      sizeAttenuation: false
    });
    const points = new THREE.Points(geometry, material);
    this.add(points);
    return points;
  }

  update (dt) {
    if (this.meshes) {
      this.meshes.forEach(mesh => {
        mesh.rotation.y += dt * mesh.rotationSpeed;
        if (mesh.material && mesh.material.uniforms) mesh.material.uniforms.time.value += dt;
      });
    }
    // this.rotation.y += dt * 0.5;
  }
}

function getUniformWeights (count, args = []) {
  const computeSum = (a, b) => {
    return (a || 0) + (b || 0);
  };
  const sum = args.reduce(computeSum, 0);
  const remainingAmount = Math.max(0, 1 - sum);
  // const nonFinites = args.reduce((a, b) => {
  //   return a + (typeof b === 'number' ? 0 : 1)
  // }, 0);
  const remainingValues = count - args.length;
  // const remainingValues = Math.max(0, Math.min(count - 1, nonFinites + count - args.length));
  const step = remainingAmount / remainingValues;
  const ret = args.slice();
  for (let i = 0; i < remainingValues; i++) {
    ret.push(step);
  }
  const newSum = ret.reduce(computeSum, 0);
  if (newSum > 1) console.warn('Sum is greater than one on:', args);
  if (newSum < 1) console.warn('Sum is less than one on:', args);
  return ret;
}

function save (dataURL) {
  if (!this.outTarget) {
    this.outTarget = new THREE.WebGLRenderTarget(outputWidth, outputHeight);
    this.outTarget.generateMipmaps = false;
    this.outTarget.minFilter = THREE.LinearFilter;
    this.outTarget.format = THREE.RGBFormat;
  }

  const base64 = dataURL.slice('data:image/png;base64,'.length);
  xhr.post('/save', {
    json: true,
    body: {
      frame: 0,
      totalFrames: 1,
      data: base64
    }
  }, err => {
    if (err) throw err;
  });
}


function curlNoise (x, y, z, out = new THREE.Vector3()) {
  const eps = 1.0;
  let n1, n2, a, b;

  n1 = simplex.noise3D(x, y + eps, z);
  n2 = simplex.noise3D(x, y - eps, z);

  a = (n1 - n2) / (2 * eps);

  n1 = simplex.noise3D(x, y, z + eps);
  n2 = simplex.noise3D(x, y, z - eps);

  b = (n1 - n2) / (2 * eps);

  out.x = a - b;

  n1 = simplex.noise3D(x, y, z + eps);
  n2 = simplex.noise3D(x, y, z - eps);

  a = (n1 - n2)/(2 * eps);

  n1 = simplex.noise3D(x + eps, y, z);
  n2 = simplex.noise3D(x + eps, y, z);

  b = (n1 - n2)/(2 * eps);

  out.y = a - b;

  n1 = simplex.noise3D(x + eps, y, z);
  n2 = simplex.noise3D(x - eps, y, z);

  a = (n1 - n2)/(2 * eps);

  n1 = simplex.noise3D(x, y + eps, z);
  n2 = simplex.noise3D(x, y - eps, z);

  b = (n1 - n2)/(2 * eps);

  out.z = a - b;

  return out;
};


function createVolumeLine (spline, opt = {}) {
  const steps = defined(opt.steps, 20);
  const width = defined(opt.width, 0.5);
  const height = defined(opt.height, 0.5);
  const radius = defined(opt.radius, 0.15);
  const color = opt.color || 'black';
  const square = opt.square;
  
  const shape = new THREE.Shape();
  let sides;
  if (square) {
    sides = 4;
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width, height);
    shape.lineTo(0, height);
    shape.lineTo(0, 0);
  } else {
    sides = 4;
    const steps = sides + 1;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const angle = Math.PI * 2 * t;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
  }

  const extrusion = new THREE.ExtrudeGeometry(shape, {
    extrudePath: spline,
    steps
  });

  const geometry = new THREE.BufferGeometry();
  geometry.fromGeometry(extrusion);

  const material = new THREE.MeshStandardMaterial({
    color,
    fog: true,
    roughness: 1,
    metalness: 0,
    // normalMap: assets.get(normalMapKey),
    // normalScale: new THREE.Vector2(1, 1).multiplyScalar(0.5),
    envMap: assets.get(envMapKey),
    // reflectivity: 0.15,
    // combine: THREE.AddOperation,
    // refractionRatio: 0.95,
    opacity: 0.85,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    shading: THREE.SmoothShading,
    wireframe: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}