const HDRMaterial = require('../shaders/HDRMaterial');
const HDRBasicMaterial = require('../shaders/HDRBasicMaterial');
const createFogMaterial = require('../shaders/createFogMaterial');
const { randomFloat, randomSphere, randomQuaternion, nextSeed } = require('../util/random');

const CylinderSpawner = require('./CylinderSpawner');
const PlaneSpawner = require('./PlaneSpawner');
const DotPanelSpawner = require('./DotPanelSpawner');
// const PhysicsSpawner = require('./PhysicsSpawner');

// const palette = palettes[Math.floor(randomFloat(0, palettes.length))];

// const sceneKey = assets.queue({
//   scene: true,
//   url: 'assets/blender_cracked_tube.json'
// });

module.exports = class FoggyScene extends THREE.Object3D {
  
  constructor (app) {
    super();

    this.fogStrength = 0.03;
    this.emissiveFactor = 1.5;
    this.app = app;
    this.setupLights();
    this.setupSkybox();
    // this.setupScene();
    this._updateFog();
    this.audio = 0;
    this.twist = 0;
    this.running = true;
    this.moveSpeed = 1;
    this.animation = 1;
    this.emission = 1;

    this.spawners = [
      new CylinderSpawner(this.app),
      new PlaneSpawner(this.app),
      new DotPanelSpawner(this.app)
    ];
    this.spawners.forEach(s => this.add(s));

    this.sideCountList = [ 3, 4, 5, 6 ];
    this.rotationOffset = 0;
    this.tubeSpawnTime = 0;
    this.cubeSpawnTime = 0;
    this.tubeSpawnMin = 0.1;
    this.tubeSpawnMax = 0.35;
    
    this.cubeSpawnMin = 2;
    this.cubeSpawnMax = 8;
    this.tubeSpawnDelay = randomFloat(this.tubeSpawnMin, this.tubeSpawnMax);
    this.cubeSpawnDelay = randomFloat(this.cubeSpawnMin, this.cubeSpawnMax);
    this.sideTime = 0;
    this.sideDelay = 6;
    this.currentSideIndex = 0;
    this.currentSideCount = this.sideCountList[0];
  }

  setupLights () {
    this.pointLights = [ '#fff' ].map((color, i, list) => {
      const t = i / list.length;
      const startAngle = Math.PI / 2;
      const angle = Math.PI * 2 * t + startAngle;

      const intensity = 1;
      const distance = 50;
      const pointLight = new THREE.PointLight(color, intensity, distance);
      const helper = new THREE.PointLightHelper(pointLight, 1);
      const r = 3;
      // pointLight.position.x = Math.cos(angle) * r;
      // pointLight.position.y = Math.sin(angle) * r;
      pointLight.position.z = -2;
      // this.add(helper);
      this.add(pointLight);
      return pointLight;
    });
  }

  setupSkybox () {
    const skyGeometry = new THREE.IcosahedronGeometry(20, 1);
    const skyMaterial = createFogMaterial({
      // depthTest: false,
      // depthWrite: false,
      // wireframe: true,
      // envMap: this.envMap,
      side: THREE.FrontSide,
      diffuse: 0
      // shading: THREE.FlatShading,
    });
    const skyBox = new THREE.Mesh(skyGeometry, skyMaterial);
    skyBox.scale.x *= -1;
    this.skyBox = skyBox;
    this.add(skyBox);
  }

  _updateFog () {
    const pointLight = this.pointLights[0];
    pointLight.updateMatrixWorld();

    const camera = this.app.camera;
    camera.updateMatrixWorld();
    this.traverse(child => {
      if (!child.material || !child.material.uniforms) return;

      if (child.material.uniforms.cameraMatrixWorld) {
        child.material.uniforms.cameraMatrixWorld.value.copy(camera.matrixWorld);
      }
      if (child.material.uniforms.fogLightStrength) {
        child.material.uniforms.fogLightStrength.value = this.fogStrength * this.emission;
      }
      if (child.material.uniforms.cameraWorldPosition) {
        child.material.uniforms.cameraWorldPosition.value.setFromMatrixPosition(camera.matrixWorld);
      }
      if (child.material.uniforms.pointLightPosition) {
        child.material.uniforms.pointLightPosition.value.setFromMatrixPosition(pointLight.matrixWorld);
      }
      if (child.material.uniforms.pointLightDiffuse) {
        const I = pointLight.color.r * pointLight.intensity;
        child.material.uniforms.pointLightDiffuse.value = I;
      }
    });
  }

  

  update (dt) {
    // this.tubeSpawnTime += dt;
    // if (this.tubeSpawnTime > this.tubeSpawnDelay) {
    //   this.tubeSpawnTime = 0;
    //   this.tubeSpawnDelay = randomFloat(this.tubeSpawnMin, this.tubeSpawnMax);
    //   this.spawn(false);
    // }

    // this.cubeSpawnTime += dt;
    // if (this.cubeSpawnTime > this.cubeSpawnDelay) {
    //   this.cubeSpawnTime = 0;
    //   this.cubeSpawnDelay = randomFloat(this.cubeSpawnMin, this.cubeSpawnMax);
    //   this.spawn(true);
    // }

    this.sideTime += dt;
    if (this.sideTime > this.sideDelay) {
      this.sideTime = 0;
      this.currentSideCount = this.sideCountList[this.currentSideIndex++ % this.sideCountList.length];
    }
    this._updateFog();

    this.spawners.forEach(spawner => {
      spawner.app = this.app;
      spawner.animation = this.animation;
      spawner.audio = this.audio;
      spawner.emission = this.emission;
      spawner.sides = this.currentSideCount;
      spawner.running = this.running;
      spawner.moveSpeed = this.moveSpeed;
      if (spawner.update) spawner.update(dt);
    });
  }
}