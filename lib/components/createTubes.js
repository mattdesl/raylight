const createTubeGeometry = require('../geom/createTubeGeometry');
const glslify = require('glslify');
const path = require('path');
const newArray = require('new-array');
const tweenr = require('tweenr')();
const isMobile = require('../util/isMobile');
const bufferData = require('three-buffer-vertex-data');

const randomSamplesInMesh = require('../util/randomSamplesInMesh');

const {
  randomFloat,
  randomSphere,
} = require('../util/random');

module.exports = function (app, opt = {}) {
  const bodyColor = '#1c2938';
  const tipColor = opt.tipColor || 'white';
  
  const container = new THREE.Object3D();
  const totalMeshes = 8000;
  const isSquare = true;
  const subdivisions = 5;
  const numSides = 5;
  const openEnded = false;

  const baseGeometry = opt.baseGeometry;
  const baseMesh = new THREE.Mesh(baseGeometry, new THREE.MeshBasicMaterial({
    colorWrite: false,
    color: bodyColor//app.renderer.getClearColor().clone(),
    // wireframe: true
  }));
  container.add(baseMesh);

  const geometry = createTubeGeometry(numSides, subdivisions, openEnded);

  // add barycentric coords
  const triCount = geometry.getAttribute('position').count;
  const barycentric = [];
  for (let i = 0; i < triCount / 3; i++) {
    barycentric.push([0, 0, 1], [0, 1, 0], [1, 0, 0]);
  }
  bufferData.attr(geometry, 'barycentric', barycentric, 3);

  geometry.maxInstancedCount = totalMeshes;

  const material = new THREE.RawShaderMaterial({
    vertexShader: glslify(path.resolve(__dirname, '../shaders/tube.vert')),
    fragmentShader: glslify(path.resolve(__dirname, '../shaders/tube.frag')),
    side: THREE.FrontSide,
    transparent: true,
    extensions: {
      deriviatives: true
    },
    defines: {
      lengthSegments: subdivisions.toFixed(1),
      ROBUST: false,
      ROBUST_NORMALS: true, // can be disabled for a slight optimization
      FLAT_SHADED: true
    },
    // depthTest: false,
    uniforms: {
      thickness: { type: 'f', value: 0.01 },
      time: { type: 'f', value: 0 },
      color: { type: 'c', value: new THREE.Color(bodyColor) },
      tipColor: { type: 'c', value: new THREE.Color(tipColor) },
      animateRadius: { type: 'f', value: 0 },
      animateStrength: { type: 'f', value: 0 },
      index: { type: 'f', value: 0 },
      totalMeshes: { type: 'f', value: totalMeshes },
      radialSegments: { type: 'f', value: numSides }
    }
  });

  const instanceIndices = new THREE.InstancedBufferAttribute(new Float32Array(totalMeshes * 1), 1, 1);
  geometry.addAttribute('instanceIndex', instanceIndices);

  const offsetScales = new THREE.InstancedBufferAttribute(new Float32Array(totalMeshes * 4), 4, 1);
  geometry.addAttribute('offsetScale', offsetScales);

  const surfaceNormals = new THREE.InstancedBufferAttribute(new Float32Array(totalMeshes * 3), 3, 1);
  geometry.addAttribute('surfaceNormal', surfaceNormals);

  const samples = randomSamplesInMesh(baseMesh, totalMeshes);
  if (samples.length !== totalMeshes) throw new Error('invalid sample count!');

  for (let i = 0; i < totalMeshes; i++) {
    const t = totalMeshes <= 1 ? 0 : i / (totalMeshes - 1);
    const sample = samples[i];
    const p = sample.position;
    const n = sample.normal;
    // const scale = randomFloat(1) > 0.9 ? randomFloat(1.0, 2.0) : randomFloat(0.5, 1.0);
    surfaceNormals.setXYZ(i, n.x, n.y, n.z);
    offsetScales.setXYZW(i, p.x, p.y, p.z, randomFloat(0.0, 1));
    instanceIndices.setX(i, t);
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false; // to avoid ThreeJS errors
  container.add(mesh);

  return {
    object3d: container,
    update
  };

  function update (dt) {
    dt = dt / 1000;
    mesh.material.uniforms.time.value += dt;
  }
};
