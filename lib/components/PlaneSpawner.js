const Spawner = require('./Spawner');
const HDRMaterial = require('../shaders/HDRMaterial');
const HDRBasicMaterial = require('../shaders/HDRBasicMaterial');
const { randomFloat, randomSphere, randomQuaternion, nextSeed } = require('../util/random');
const tweenr = require('tweenr')();
const clamp = require('clamp');
const lerp = require('lerp');

const tmpColor = new THREE.Color();
const rotMat = new THREE.Matrix4();
const tmpArray4 = [ 0, 0, 0, 0 ];

module.exports = class DustSpawner extends Spawner {
  constructor (app, data) {
    const scale = 0.1;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const emissiveMaterial = new HDRBasicMaterial({
    });
    const reflectiveMaterial = new HDRMaterial({
      color: 'hsl(0, 0%, 100%)',
      // wireframe: true,
      metalness: 1,
      roughness: 1,
      // envMap: this.envMap,
      shading: THREE.FlatShading
    });
    super(geometry, [ emissiveMaterial, emissiveMaterial ], 50);

    this.app = app;
    this.delay = [ 2, 8 ];
    this.emissiveMaterial = emissiveMaterial;
    this.reflectiveMaterial = reflectiveMaterial;
    this.currentColor = new THREE.Color();
    this.rotationOffset = 0;
    this.nextSpawnSize = new THREE.Vector3();
  }

  emit () {
    this.currentColor.setStyle('#fff');
    this.isNextSpawnEmissive = randomFloat(1) > 0.5;
    this.radius = 6//randomFloat(3, 8);
    this.nextSpawnSize.set(
      randomFloat(0.2, 1),
      randomFloat(0.5, 3),
      0.1
    );
    super.emit();
  }

  spawn (angle, x, y) {
    const mesh = super.spawn(angle, x, y);
    if (!mesh) return;
    
    const isEmissive = this.isNextSpawnEmissive;
    const nextMaterial = isEmissive ? this.emissiveMaterial : this.reflectiveMaterial;
    mesh.isEmissive = isEmissive;
    
    mesh.rotationZAmount = randomFloat(-0.1, 0.1);
    mesh.tiltAmount = randomFloat(-0.1, 0.1);
    // mesh.quaternion.fromArray(randomQuaternion(tmpArray4));
    mesh.emissiveFactor = isEmissive ? randomFloat(1, 2) : 1;
    mesh.material[0] = nextMaterial.clone();
    mesh.material[0].uniforms.emissiveFactor.value = mesh.emissiveFactor;
    mesh.material[0].color.set(isEmissive ? this.currentColor : '#fff');
    mesh.material[1] = mesh.material[0];
    const zero = 1e-5;
    mesh.scale.x = mesh.scale.z = randomFloat(2, 4)
    mesh.scale.y = zero;
    tweenr.to(mesh.scale, {
      y: randomFloat(0.5, 3),
      duration: 2,
      ease: 'linear'
    });
    return mesh;
  }

  update (dt) {
    super.update(dt);
    this.meshPool.meshes.forEach(mesh => {
      if (!mesh.active) return;
      let val = 1;
      if (mesh.isEmissive) {
        // const f = Math.sin(mesh.time * 1) * 0.5 + 0.5;
        const f = Math.sin(mesh.time - Math.PI * Math.tan(mesh.time * 1.0) * 0.01) * 0.5 + 0.5;
        val = f * mesh.emissiveFactor;
        val += this.audio * 0.5;
      }
      mesh.material[0].uniforms.emissiveFactor.value = val * this.emission;
      mesh.material[1].uniforms.emissiveFactor.value = this.emission;
    });
  }
}
