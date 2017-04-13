const HDRMaterial = require('../shaders/HDRMaterial');
const HDRBasicMaterial = require('../shaders/HDRBasicMaterial');
const newArray = require('new-array');
const { randomFloat, randomSphere, randomQuaternion, nextSeed } = require('../util/random');
const clamp = require('clamp');
const lerp = require('lerp');
const shuffle = require('array-shuffle');
const palettes = require('nice-color-palettes');
const randomSamplesInMesh = require('../util/randomSamplesInMesh');
const { assets } = require('../context');
const tweenr = require('tweenr')();

module.exports = class SimpleSpawner extends THREE.Object3D {

  constructor () {
    super();

    const cubeBaseMeshes = [];
    const tubeMeshBase = this.createTubeBaseMesh();
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMats = [
      this.emissiveMaterial,
      this.emissiveMaterial
    ];
    cubeBaseMeshes.push(new THREE.Mesh(boxGeometry, cubeMats));

    const dotScale = 0.1;
    const dotGeom = new THREE.BoxGeometry(dotScale, dotScale, dotScale);
    const dotsGeom = new THREE.Geometry();
    dotsGeom.noScale = true;
    const dotCount = 6;
    for (let i = 0; i < dotCount; i++) {
      const t = i / Math.max(1, dotCount);
      const tNorm = t * 2 - 1;
      const spacing = 1;
      dotsGeom.merge(dotGeom,
        new THREE.Matrix4().makeTranslation(0, tNorm * spacing, 0)
      );
    }
    cubeBaseMeshes.push(new THREE.Mesh(dotsGeom, cubeMats));

    const maxMeshCount = 500;
    this.tubeMeshes = newArray(maxMeshCount).map((_, i) => {
      const isCubeType = i % 2 === 0;
      const mesh = isCubeType
        ? cubeBaseMeshes[Math.floor(randomFloat(0, cubeBaseMeshes.length))].clone()
        : tubeMeshBase.clone();
      mesh.material = mesh.material.map(m => m.clone());
      mesh.frustumCulled = false;
      mesh.isCubeType = isCubeType;
      mesh.active = false;
      mesh.visible = false;
      return mesh;
    });

    this.tubeMeshContainer = new THREE.Object3D();
    this.tubeMeshes.forEach(m => this.tubeMeshContainer.add(m));
    this.add(this.tubeMeshContainer);
  }

  createTubeBaseMesh () {
    this.reflectiveMaterial = new HDRMaterial({
      color: 'hsl(0, 0%, 100%)',
      metalness: 1,
      roughness: 1,
      // envMap: this.envMap,
      shading: THREE.FlatShading
    });
    this.emissiveMaterial = new HDRBasicMaterial()

    const radius = 0.075;
    const length = 3;
    const sides = 3;
    const endCapLength = 0.25;
    const tubeGeometry = new THREE.CylinderGeometry(radius, radius, length, sides);
    const endCap = new THREE.CylinderGeometry(radius, radius, endCapLength, sides);
    const mults = [ 1, -1 ];
    const padding = 0.1;
    mults.forEach(mult => {
      tubeGeometry.merge(
        endCap,
        new THREE.Matrix4().makeTranslation(0, mult * (length / 2 + endCapLength / 2 + padding), 0),
        1
      );
    });

    tubeGeometry.computeBoundingBox();

    const tubeMesh = new THREE.Mesh(tubeGeometry, [
      this.emissiveMaterial,
      this.reflectiveMaterial
    ]);

    return tubeMesh;
  }

  getFreeTubeMesh () {
    return this.tubeMeshes.find(m => !m.active);
  }

  spawn (sides) {
    tmpColor.setStyle(palette[Math.floor(randomFloat(0, palette.length))])

    const speed = randomFloat(0.5, 1);
    const radius = isCubeType ? 6 : 4;
    for (let side = 0; side < sides; side++) {
      const rotOff = (Math.PI / 2) + this.twist;
      const angle = Math.PI * 2 * (side / sides) - rotOff;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const rotationAngle = Math.atan2(y, x);

      const mesh = this.tubeMeshes.find(m => m.isCubeType === isCubeType && !m.active);
      if (!mesh) break;
      const startZ = -20;
      const isEmissive = isCubeType || randomFloat(1) > 0.5;
      const nextMaterial = isEmissive ? this.emissiveMaterial : this.reflectiveMaterial;
      const matIndex = isCubeType ? 1 : 0;
      mesh.materialIndex = matIndex;
      mesh.material[matIndex] = nextMaterial.clone();
      mesh.emissiveFactor = isEmissive ? randomFloat(1, 2) : 1;
      mesh.material[matIndex].uniforms.emissiveFactor.value = mesh.emissiveFactor;
      mesh.active = true;
      mesh.speed = speed;
      mesh.time = 0;
      mesh.isEmissive = isEmissive;
      mesh.visible = true;
      mesh.position.x = x;
      mesh.position.y = y;
      mesh.position.z = startZ;
      mesh.rotation.z = rotationAngle;
      mesh.material[matIndex].color.set(isEmissive ? tmpColor : '#fff');
      if (mesh.geometry.noScale !== false) {
        mesh.scale.y = 1e-5;
        mesh.scale.x = mesh.scale.z = isCubeType
          ? randomFloat(2, 4)
          : randomFloat(0.5, 2)
        tweenr.to(mesh.scale, {
          y: isCubeType ? randomFloat(0.5, 3) : randomFloat(0.5, 2),
          duration: 2,
          ease: 'linear'
        });
      }
    }
  }

  update (dt) {
    
    // this.twist += 0.001;
    // this.tubeMeshes.forEach(mesh => {
    //   if (!mesh.active) return;
    //   mesh.time += dt;
    //   mesh.position.z += 0.1 * mesh.speed;
    //   mesh.updateMatrixWorld();

    //   mesh.material.forEach(mat => {
    //     if (mat.uniforms && mat.uniforms.time) mat.uniforms.time.value = mesh.time;
    //   });

    //   if (mesh.isEmissive) {
    //     // const f = Math.sin(mesh.time * 1) * 0.5 + 0.5;
    //     const f = Math.sin(mesh.time - Math.PI * Math.tan(mesh.time * 1.0) * 0.01) * 0.5 + 0.5;
    //     const min = 0;
    //     const max = mesh.emissiveFactor;
    //     mesh.material[mesh.materialIndex].uniforms.emissiveFactor.value = lerp(min, max, f);
    //   }

    //   // determine if culled
    //   tmpMeshWorldPosition.setFromMatrixPosition(mesh.matrixWorld);
    //   if (tmpMeshWorldPosition.z > tmpCameraPosition.z) {
    //     mesh.active = false;
    //     mesh.visible = false;
    //   }
    // });
  }
}