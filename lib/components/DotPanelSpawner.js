const Spawner = require('./Spawner');
const HDRMaterial = require('../shaders/HDRMaterial');
const HDRBasicMaterial = require('../shaders/HDRBasicMaterial');
const { randomFloat, randomSphere, randomQuaternion, nextSeed } = require('../util/random');
const tweenr = require('tweenr')();
const clamp = require('clamp');
const defined = require('defined');
const lerp = require('lerp');

const tmpColor = new THREE.Color();

module.exports = class CylinderSpawner extends Spawner {
  constructor () {
    const r = 0.075;
    const length = 3;
    const sides = 4;
    const geometries = [];
    geometries.push(createDotsGeometry({ xCount: 6 }));
    geometries.push(createDotsGeometry({ xCount: 4 }));
    geometries.push(createDotsGeometry({ xSpacing: 0.5, xCount: 6 }));
    geometries.push(createDotsGeometry({ xSpacing: 0.5, xCount: 6, yCount: 2 }));
    geometries.push(createDotsGeometry({ xSpacing: 0.5, ySpacing: 0.25, xCount: 4, yCount: 3 }));
    const reflectiveMaterial = new HDRMaterial({
      color: 'hsl(0, 0%, 100%)',
      metalness: 1,
      roughness: 1,
      // envMap: this.envMap,
      shading: THREE.FlatShading
    });
    const emissiveMaterial = new HDRBasicMaterial({
    });
    const materials = [ emissiveMaterial, reflectiveMaterial ];
    super(geometries, materials);

    this.emissiveMaterial = emissiveMaterial;
    this.reflectiveMaterial = reflectiveMaterial;
    this.currentColor = new THREE.Color();
    this.nextSpawnSize = new THREE.Vector3();
    this.delay = [ 1, 4 ];
    this.radius = 5;
  }

  emit () {
    this.currentColor.setStyle('#fff');
    this.isNextSpawnEmissive = randomFloat(1) > 0.5;
    this.radius = randomFloat(3, 4);
    this.nextSpawnSize.set(1, 1, 1);
    super.emit();
  }

  spawn (angle, x, y) {
    const mesh = super.spawn(angle, x, y);
    if (!mesh) return;
    
    const isEmissive = this.isNextSpawnEmissive;
    const nextMaterial = isEmissive ? this.emissiveMaterial : this.reflectiveMaterial;
    const matIndex = 0;
    mesh.isEmissive = isEmissive;
    mesh.emissiveFactor = isEmissive ? randomFloat(1, 2) : 1;
    mesh.materialIndex = matIndex;
    mesh.material[matIndex] = nextMaterial.clone();
    mesh.material[matIndex].uniforms.emissiveFactor.value = mesh.emissiveFactor;
    mesh.material[matIndex].color.set(isEmissive ? this.currentColor : '#fff');
    const zero = 1e-5;
    mesh.scale.set(zero, zero, this.nextSpawnSize.z);
    tweenr.to(mesh.scale, {
      x: this.nextSpawnSize.x,
      y: this.nextSpawnSize.y,
      z: this.nextSpawnSize.z,
      duration: 2,
      ease: 'linear'
    });
    return mesh;
  }

  update (dt) {
    super.update(dt);
    this.meshPool.meshes.forEach(mesh => {
      if (mesh.isEmissive) {
        // const f = Math.sin(mesh.time * 1) * 0.5 + 0.5;
        // const f = Math.sin(mesh.time - Math.PI * Math.tan(mesh.time * 1.0) * 0.01) * 0.5 + 0.5;
        // const min = 0;
        // const max = mesh.emissiveFactor;
        let val = mesh.emissiveFactor;
        val = lerp(val * 0.5, val * 1.5, this.audio);
        mesh.material[mesh.materialIndex].uniforms.emissiveFactor.value = val;
      }
    });
  }
}

function createDotsGeometry (opt = {}) {
  const dot = new THREE.CircleGeometry(0.05, 8);
  const result = new THREE.Geometry();
  const xCount = defined(opt.xCount, 6);
  const yCount = defined(opt.yCount, 1);
  const tmpMat = new THREE.Matrix4();
  const xSpacing = defined(opt.xSpacing, 1);
  const ySpacing = defined(opt.ySpacing, 0.25);
  const brokenIndex = opt.hasBrokenDot ? Math.floor(randomFloat(0, xCount)) : -1;
  for (let j = 0; j < yCount; j++) {
    for (let i = 0; i < xCount; i++) {
      const t = i / Math.max(1, xCount);
      const k = j / Math.max(1, yCount);
      const x = t * 2 - 1;
      const y = k * 2 - 1;
      const matIndex = i === brokenIndex ? 1 : 0;
      result.merge(dot,
        tmpMat.makeTranslation(y * ySpacing, x * xSpacing, 0),
        matIndex
      );
    }
  }
  return result;
}