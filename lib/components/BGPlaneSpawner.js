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
    super(geometry, emissiveMaterial, 50);

    this.app = app;
    this.delay = [ 1, 2 ];
    this.emissiveMaterial = emissiveMaterial;
    this.reflectiveMaterial = reflectiveMaterial;
    this.currentColor = new THREE.Color();
    this.rotationOffset = 0;
    this.nextSpawnSize = new THREE.Vector3();
  }

  emit () {
    this.currentColor.setStyle('#fff');
    this.isNextSpawnEmissive = false;
    this.radius = 9;
    this.nextSpawnSize.set(
      2,
      8,
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
    mesh.material = nextMaterial.clone();
    mesh.material.uniforms.emissiveFactor.value = mesh.emissiveFactor;
    mesh.material.color.set(isEmissive ? this.currentColor : '#fff');
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
        const f = Math.sin(mesh.time - Math.PI * Math.tan(mesh.time * 1.0) * 0.01) * 0.5 + 0.5;
        const min = 0;
        const max = mesh.emissiveFactor;
        mesh.material.uniforms.emissiveFactor.value = lerp(min, max, f);
      }
      // rotMat.makeRotationZ(mesh.rotationZAmount * dt)
      // mesh.position.applyMatrix4(rotMat);
      // mesh.rotation.z += dt * mesh.tiltAmount;
      // mesh.quaternion.copy(this.app.camera.quaternion);
    });
  }
}
