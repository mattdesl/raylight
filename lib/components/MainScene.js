const BezierEasing = require('bezier-easing');
const { assets } = require('../context');
const newArray = require('new-array');
const filterCubeMap = require('../util/loadEnvMap').filterCubeMap;
const RAND = require('../util/random');
const weighted = require('weighted').select;
const getUniformWeights = require('../util/getUniformWeights');
const tweenr = require('tweenr')();
const glslify = require('glslify')
const path = require('path')

const tmpVec = new THREE.Vector3();

const envMapKey = assets.queue({
  envMap: true,
  // level: 1,
  // mapping: THREE.CubeUVRefractionMapping,
  mapping: THREE.CubeUVReflectionMapping,
  pbr: true,
  url: 'assets/textures/studio015.png',
  equirectangular: true
});

module.exports = class MainScene extends THREE.Object3D {

  constructor (app, colors) {
    super();

    this.app = app;

    const ambient = new THREE.AmbientLight('hsl(0, 0%, 80%)', 1);
    this.add(ambient);

    const light = new THREE.RectAreaLight('white', 1, 4, 4);
    light.position.fromArray(RAND.randomSphere([], 5));
    light.lookAt(new THREE.Vector3());
    // const helper = new THREE.RectAreaLightHelper(light);
    // light.add(helper);
    this.add(light);

    this.bezierEase = new BezierEasing(0.655, -0.035, 0.020, 1.215);

    // const skyGeometry = new THREE.SphereGeometry(5, 100, 100);
    // const skyGeometry = new THREE.SphereGeometry(10, 64, 64);
    // const skyMaterial = new THREE.RawShaderMaterial({
    //   side: THREE.DoubleSide,
    //   depthTest: false,
    //   depthWrite: false,
    //   uniforms: {
    //     color1: { type: 'c', value: new THREE.Color(colors[0]) },
    //     color2: { type: 'c', value: new THREE.Color(colors[1] || colors[0]) }
    //   },
    //   vertexShader: glslify(path.resolve(__dirname, '../shaders/pass.vert')),
    //   fragmentShader: glslify(path.resolve(__dirname, '../shaders/reflections.frag')),
    // });
    // this.reflectionBackground = new THREE.Mesh(skyGeometry, skyMaterial);
    // this.reflectionBackground.frustumCulled = false;
    // this.add(this.reflectionBackground);
    // this.setupCubeCamera();

    this.geometries = [
      // getBoxGeometry,
      new THREE.BoxGeometry(1, 1, 1),
      // { scalar: true, geometry: new THREE.IcosahedronGeometry(1, 0) },
      { scalar: false, scaleAxis: 'y', geometry: new THREE.CylinderGeometry(0.05, 0.05, 3, 8, 1) },
      { scalar: false, scaleAxis: 'y', geometry: new THREE.CylinderGeometry(0.025, 0.025, 3, 8, 1) },
      { scalar: false, geometry: new THREE.OctahedronGeometry(1, 0) },
      { scalar: false, geometry: new THREE.TetrahedronGeometry(1, 0) },
      // { scalar: true, geometry: new THREE.SphereGeometry(1, 16, 16) }
    ];
    this.geometryWeights = getUniformWeights(this.geometries.length, [ 0.5 ]);

    const chimneyHeight = 2;
    const chimneyRadius = 0.01;
    const chimneyGeom = new THREE.CylinderGeometry(chimneyRadius, chimneyRadius, chimneyHeight, 8, 1);
    chimneyGeom.translate(0, -chimneyHeight / 2, 0);
    const chimney = new THREE.Mesh(chimneyGeom, new THREE.MeshBasicMaterial({
      color: 'black',
      opacity: 1,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      shading: THREE.FlatShading,
    }));
    this.chimney = chimney;
    this.add(chimney);
    this.meshes = [];

    this.setColors(colors);
  }

  setColors (colors) {
    this.colors = colors;
    this.colorWeights = getUniformWeights(this.colors.length, [ 0.4 ]);

    for (let i = this.meshes.length - 1; i >= 0; i--) {
      this.remove(this.meshes[i]);
    }
    this.meshes.length = 0;
    this.chimney.material.color.set(this.colors[1]);
    tweenr.cancel();
    this.generate();
  }

  generate () {
    const createMesh = (position) => {
      const color = weighted(this.colors, this.colorWeights);
      const isEmissive = false;
      const isStandard = RAND.randomFloat(1) > 0.25;
      const metallic = true;
      // const isEmissive = RAND.randomFloat(1) > 0.5;
      const material = isStandard ? new THREE.MeshStandardMaterial({
        color: isEmissive ? color : color,
        emissive: isEmissive ? color : 'black',
        refractionRatio: 1.0,
        envMap: assets.get(envMapKey),
        metalness: metallic ? 1 : 0,
        roughness: metallic ? 0 : 1,
        opacity: 1,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        shading: THREE.FlatShading,
      }) : new THREE.MeshBasicMaterial({
        color: color,
        opacity: 1,
        // envMap: this.cubeTexture,
        reflectivity: 1.0,
        combine: THREE.MultiplyOperation,
        refractionRatio: 1.0,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const geometryType = weighted(this.geometries, this.geometryWeights);
      let geometry = geometryType.geometry ? geometryType.geometry : geometryType;
      if (typeof geometry === 'function') geometry = geometry();
      const mesh = new THREE.Mesh(geometry, material);
      const scale = RAND.randomFloat(1, 2);
      const min = 1e-5;

      if (geometryType.scaleAxis) {
        mesh.scale[geometryType.scaleAxis] = RAND.randomFloat(min, scale);
      }
      else if (geometryType.scalar) {
        mesh.scale.multiplyScalar(
          RAND.randomFloat(min, scale)
        );
      } else {
        mesh.scale.set(
          RAND.randomFloat(min, scale),
          RAND.randomFloat(min, scale),
          RAND.randomFloat(min, scale)
        );
      }

      mesh.quaternion.fromArray(RAND.randomQuaternion([]));
      return mesh;
    }

    const ease = this.bezierEase;
    const totalMeshes = Math.floor(RAND.randomFloat(200, 350));

    let delay = 0.35;
    this.meshes = newArray(totalMeshes).map((_, i, list) => {
      const t = i / Math.max(1, list.length - 1);

      const freq = new THREE.Vector3(1, 1, 1).multiplyScalar(1);
      const amp = t;
      const curl = new THREE.Vector3();
      const offset = 0;

      const [ px, py ] = RAND.randomCircle([], 1);
      const circFreq = 0.1;
      curlNoise(px * circFreq, t * 4, py * circFreq, curl);

      const position = new THREE.Vector3(0.3 * t, (t * 2 - 1) * 3, 0.3 * t);
      position.add(curl.multiplyScalar(amp));

      const len2D = new THREE.Vector2(position.x, position.z).length();
      const mesh = createMesh();
      mesh.renderDepth = i;

      position.y *= 0.85;
      position.y -= 0.65;
      mesh.position.copy(position);
      mesh.scale.multiplyScalar(Math.max(1e-5, t * 0.45));

      const radius = RAND.randomFloat(0.0, 0.1);
      tmpVec.fromArray(RAND.randomSphere([], radius));
      mesh.position.add(tmpVec);

      const tween = { scale: 0, rotation: 0, position: 0 };
      const randQuat = new THREE.Quaternion().fromArray(RAND.randomQuaternion([], 1));
      mesh.targetScale = mesh.scale.clone();
      mesh.targetPosition = mesh.position.clone();
      mesh.targetQuaternion = mesh.quaternion.clone();
      mesh.initialQuaternion = mesh.quaternion.clone().slerp(randQuat, 0.35);
      mesh.scale.multiplyScalar(1e-5);
      mesh.position.x -= (RAND.randomFloat(1) > 0.5 ? 1 : -1) * RAND.randomFloat(0, 0.3);
      mesh.initialPosition = mesh.position.clone();
      tweenr.to(tween, {
        scale: 1,
        duration: RAND.randomFloat(0.75, 1),
        ease,
        delay: delay + RAND.randomFloat(0, 0.5)
      }).on('update', () => {
        mesh.scale.copy(mesh.targetScale).multiplyScalar(tween.scale);
      });
      tweenr.to(tween, {
        position: 1,
        duration: RAND.randomFloat(0.5, 2),
        ease: 'expoInOut',
        delay: delay
      }).on('update', () => {
        mesh.position.copy(mesh.initialPosition).lerp(mesh.targetPosition, tween.position);
      });
      tweenr.to(tween, {
        rotation: 1,
        duration: RAND.randomFloat(1, 2),
        ease,
        delay: delay
      }).on('update', () => {
        mesh.quaternion.copy(mesh.initialQuaternion).slerp(mesh.targetQuaternion, tween.rotation);
      });

      this.add(mesh);
      delay += 0.0015;
      return mesh;
    });

    const startPos = this.meshes[0].targetPosition.clone();
    this.chimney.position.copy(startPos);
    this.chimney.position.y = startPos.y - 2;
    tweenr.to(this.chimney.position, {
      y: startPos.y,
      ease,
      duration: 1
    });
  }

  onReady () {
    if (!this.cubeCamera) {
      if (this.reflectionBackground) this.reflectionBackground.visible = false;
      return;
    }
    this.app.scene.traverse((mesh) => {
      const wasVisible = mesh.visible;
      mesh.visible = mesh === this.app.scene || mesh === this || mesh === this.reflectionBackground;
      mesh._wasVisible = wasVisible;
    });
    this.cubeCamera.updateCubeMap(this.app.renderer, this.app.scene);
    this.app.scene.traverse((mesh) => {
      mesh.visible = mesh._wasVisible;
    });
    this.reflectionBackground.visible = false;
  }

  setupCubeCamera () {
    this.cubeCamera = new THREE.CubeCamera(1, 1000, 1024);
    this.cubeTexture = this.cubeCamera.renderTarget.texture;
    this.cubeTexture.mapping = THREE.CubeRefractionMapping;
    // this.pbrCubeTexture = filterCubeMap(this.app.renderer, this.cubeTexture, {
    //   pbr: true,
    //   // level: 1,
    //   mapping: THREE.CubeRefractionMapping
    // });
  }

  _createBox3DVolume (size = 1, subdivs = 1) {
    if (typeof size === 'number') size = new THREE.Vector3(size, size, size);
    if (typeof subdivs === 'number') subdivs = new THREE.Vector3(subdivs, subdivs, subdivs);
    const geom = new THREE.BoxGeometry(size.x, size.y, size.z, subdivs.x, subdivs.y, subdivs.z);
    const points = geom.vertices.slice();
    geom.dispose();
    return points;
  }


}

function curlNoise (x, y, z, out = new THREE.Vector3()) {
  const eps = 1.0;
  let n1, n2, a, b;

  n1 = RAND.simplex.noise3D(x, y + eps, z);
  n2 = RAND.simplex.noise3D(x, y - eps, z);

  a = (n1 - n2) / (2 * eps);

  n1 = RAND.simplex.noise3D(x, y, z + eps);
  n2 = RAND.simplex.noise3D(x, y, z - eps);

  b = (n1 - n2) / (2 * eps);

  out.x = a - b;

  n1 = RAND.simplex.noise3D(x, y, z + eps);
  n2 = RAND.simplex.noise3D(x, y, z - eps);

  a = (n1 - n2)/(2 * eps);

  n1 = RAND.simplex.noise3D(x + eps, y, z);
  n2 = RAND.simplex.noise3D(x + eps, y, z);

  b = (n1 - n2)/(2 * eps);

  out.y = a - b;

  n1 = RAND.simplex.noise3D(x + eps, y, z);
  n2 = RAND.simplex.noise3D(x - eps, y, z);

  a = (n1 - n2)/(2 * eps);

  n1 = RAND.simplex.noise3D(x, y + eps, z);
  n2 = RAND.simplex.noise3D(x, y - eps, z);

  b = (n1 - n2)/(2 * eps);

  out.z = a - b;

  return out;
};