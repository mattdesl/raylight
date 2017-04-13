const { randomFloat, randomSphere, randomQuaternion, nextSeed } = require('../util/random');
const meshPool = require('../util/meshPool');
const newArray = require('new-array');
const HDRMaterial = require('../shaders/HDRMaterial');
const HDRBasicMaterial = require('../shaders/HDRBasicMaterial');
const tweenr = require('tweenr')();

const tmpVec = new THREE.Vector3();
const tmpCameraPosition = new THREE.Vector3();
const tmpMeshWorldPosition = new THREE.Vector3();

module.exports = class SimpleSpawner extends THREE.Object3D {

  constructor (app, sceneData) {
    super();

    this.delay = [ 0.1, 0.45 ];
    this.currentDelay = this.computeDelay();
    this.spawnTime = 0;
    this.time = 0;
    this.app = null;

    this.angleOffset = 0;
    this.sides = 3;
    this.radius = 4;
    this.initialZ = -20;

    this.sceneData = sceneData;

    this.reflectiveMaterial = new HDRMaterial({
      color: 'hsl(0, 0%, 100%)',
      metalness: 1,
      roughness: 1,
      // envMap: this.envMap,
      shading: THREE.FlatShading
    });
    this.emissiveMaterial = new HDRBasicMaterial();

    // one of the groups of meshes
    const group = this.sceneData.findObjects(/^cylinder/i);

    this.items = newArray(50).map(() => {
      const container = new THREE.Object3D();
      group.forEach(mesh => {
        const child = mesh.clone();
        child.initialPosition = child.position.clone();
        child.friction = 0.98;
        child.velocity = new THREE.Vector3().fromArray(randomSphere([], 1));
        container.add(child);
      });
      container.active = false;
      container.visible = false;
      container.frustumCulled = false;
      this.add(container);
      return container;
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
    const mesh = this.items.find(item => !item.active);
    if (!mesh) {
      console.log('skip')
      return;
    }
    
    mesh.visible = true;
    mesh.active = true;

    mesh.position.x = x * this.radius;
    mesh.position.y = y * this.radius;
    mesh.position.z = this.initialZ;
    mesh.time = 0;
    mesh.speed = randomFloat(0.5, 1) * 0.1;
    mesh.rotation.z = angle;

    const isEmissive = randomFloat(1) > 0.5;
    mesh.children.forEach(child => {
      child.isEmissive = isEmissive;
      child.material = child.isEmissive ? this.emissiveMaterial : this.reflectiveMaterial
      child.position.copy(child.initialPosition);
      child.velocity.fromArray(randomSphere([], 1));
      child.speed = randomFloat(0.1, 0.3) * 0.1;
    });
    return mesh;
  }

  update (dt) {
    this.time += dt;
    this.spawnTime += dt;
    if (this.spawnTime > this.currentDelay) {
      this.spawnTime = 0;
      this.currentDelay = this.computeDelay();
      this.emit();
    }

    tmpCameraPosition.setFromMatrixPosition(this.app.camera.matrixWorld);
    this.items.forEach(mesh => {
      if (!mesh.active) return;
      mesh.time += dt;
      mesh.position.z += mesh.speed;
      mesh.updateMatrixWorld();
      // if (Array.isArray(mesh.material)) {
      //   mesh.material.forEach(mat => {
      //     if (mat.uniforms && mat.uniforms.time) mat.uniforms.time.value = mesh.time;
      //   });
      // } else if (mesh.material.uniforms && mesh.material.uniforms.time) {
      //   mesh.material.uniforms.time.value = mesh.time;
      // }

      mesh.children.forEach(child => {
        tmpVec.copy(child.velocity).multiplyScalar(child.speed);
        child.position.add(tmpVec);
        child.velocity.multiplyScalar(child.friction);
      });

      // determine if culled
      tmpMeshWorldPosition.setFromMatrixPosition(mesh.matrixWorld);
      if (tmpMeshWorldPosition.z > tmpCameraPosition.z) {
        mesh.active = false;
        mesh.visible = false;
      }
    });
  }
};