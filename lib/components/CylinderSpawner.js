const Spawner = require('./Spawner');
const HDRMaterial = require('../shaders/HDRMaterial');
const HDRBasicMaterial = require('../shaders/HDRBasicMaterial');
const { randomFloat, randomSphere, randomQuaternion, nextSeed } = require('../util/random');
const tweenr = require('tweenr')();
const clamp = require('clamp');
const lerp = require('lerp');

const tmpColor = new THREE.Color();

module.exports = class CylinderSpawner extends Spawner {
  constructor () {
    const geometries = [
      createTubeGeometry(),
      createTubeGeometry(0.1)
    ];
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

    this.delay = [ 0.1, 0.45 ];
    this.emissiveMaterial = emissiveMaterial;
    this.reflectiveMaterial = reflectiveMaterial;
    this.currentColor = new THREE.Color();
  }

  emit () {
    this.currentColor.setStyle('#fff');
    this.isNextSpawnEmissive = randomFloat(1) > 0.5;
    super.emit();
  }

  spawn (angle, x, y) {
    const mesh = super.spawn(angle, x, y);
    if (!mesh) return;
    
    const isEmissive = this.isNextSpawnEmissive;
    const nextMaterial = isEmissive ? this.emissiveMaterial : this.reflectiveMaterial;
    const matIndex = 0;
    mesh.isEmissive = isEmissive;
    mesh.emissiveFactor = isEmissive
      ? randomFloat(1, 2)
      : 1;
    mesh.materialIndex = matIndex;
    mesh.material[matIndex] = nextMaterial.clone();
    mesh.material[matIndex].uniforms.emissiveFactor.value = mesh.emissiveFactor;
    mesh.material[matIndex].color.set(isEmissive ? this.currentColor : '#fff');
    mesh.scale.y = 1e-5;
    mesh.scale.x = mesh.scale.z = randomFloat(0.5, 2);
    tweenr.to(mesh.scale, {
      y: randomFloat(0.5, 2),
      duration: 2,
      ease: 'linear'
    });
    return mesh;
  }

  update (dt) {
    super.update(dt);
    this.meshPool.meshes.forEach(mesh => {
      if (!mesh.active) return;
      let factor = mesh.material[mesh.materialIndex].uniforms.emissiveFactor.value;
      if (mesh.isEmissive) {
        // const f = Math.sin(mesh.time * 1) * 0.5 + 0.5;
        const f = Math.sin(mesh.time - Math.PI * Math.tan(mesh.time * 1.0) * 0.01) * 0.5 + 0.5;
        const min = 0;
        const max = mesh.emissiveFactor;
        factor = lerp(min, max, f);
        factor += this.audio * 0.5;
      }
      mesh.material[mesh.materialIndex].uniforms.emissiveFactor.value = factor;
    });
  }
}

function createTubeGeometry (padding = 0) {
  const radius = 0.075;
  const length = 3;
  const sides = 5;
  const endCapLength = 0.25;
  const tubeGeometry = new THREE.CylinderGeometry(radius, radius, length, sides);
  const endCap = new THREE.CylinderGeometry(radius, radius, endCapLength, sides);
  const mults = [ 1, -1 ];
  mults.forEach(mult => {
    tubeGeometry.merge(
      endCap,
      new THREE.Matrix4().makeTranslation(0, mult * (length / 2 + endCapLength / 2 + padding), 0),
      1
    );
  });
  return tubeGeometry;
}