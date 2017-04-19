const { randomFloat, randomSphere, randomQuaternion, nextSeed } = require('../util/random');
const meshPool = require('../util/meshPool');
const isMobile = require('../util/isMobile');
const defined = require('defined');
const tmpCameraPosition = new THREE.Vector3();
const tmpMeshWorldPosition = new THREE.Vector3();

module.exports = class SimpleSpawner extends THREE.Object3D {

  constructor (geometries, material, capacity) {
    super();
    const defaultCapacity = isMobile ? 100 : 150;
    capacity = defined(capacity, defaultCapacity);
    this.delay = [ 0.1, 0.35 ];
    this.currentDelay = this.computeDelay();
    this.spawnTime = 0;
    this.time = 0;
    this.animation = 1;

    this.audio = 0;
    this.moveSpeed = 1;
    this.running = true;
    this.angleOffset = 0;
    this.sides = 3;
    this.radius = 4;
    this.initialZ = -20;

    this.meshPool = meshPool({
      count: capacity,
      geometries,
      baseMaterial: material
    });
    this.meshPool.meshes.forEach(m => {
      m.frustumCulled = false;
      this.add(m);
    });
  }

  computeDelay () {
    return Array.isArray(this.delay)
      ? randomFloat(this.delay[0], this.delay[1])
      : this.delay;
  }

  emit () {
    const sides = this.sides;
    for (let side = 0; side < sides; side++) {
      const rotOff = (Math.PI / 2) + this.angleOffset;
      const angle = Math.PI * 2 * (side / sides) - rotOff;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      // const rotationAngle = Math.atan2(y, x);
      this.spawn(angle, x, y);
    }
  }

  spawn (angle, x, y) {
    const mesh = this.meshPool.next();
    if (!mesh) {
      return;
    }
    mesh.position.x = x * this.radius;
    mesh.position.y = y * this.radius;
    mesh.position.z = this.initialZ;
    mesh.time = 0;
    mesh.speed = randomFloat(0.5, 1) * 0.1;
    mesh.rotation.z = angle;
    return mesh;
  }

  update (dt) {
    this.time += dt;
    if (this.running) {
      this.spawnTime += dt;
      if (this.spawnTime > this.currentDelay) {
        this.spawnTime = 0;
        this.currentDelay = this.computeDelay();
        this.emit();
      }
    }

    tmpCameraPosition.setFromMatrixPosition(this.app.camera.matrixWorld);
    this.meshPool.meshes.forEach(mesh => {
      if (!mesh.active) return;

      mesh.time += dt;
      mesh.position.z += this.moveSpeed * mesh.speed;
      mesh.updateMatrixWorld();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(mat => {
          if (mat.uniforms && mat.uniforms.time) mat.uniforms.time.value = mesh.time;
        });
      } else if (mesh.material.uniforms && mesh.material.uniforms.time) {
        mesh.material.uniforms.time.value = mesh.time;
      }

      // determine if culled
      tmpMeshWorldPosition.setFromMatrixPosition(mesh.matrixWorld);
      if (tmpMeshWorldPosition.z > tmpCameraPosition.z) {
        this.meshPool.free(mesh);
      }
    });
  }
};