const HDRMaterial = require('../shaders/HDRMaterial');
const HDRBasicMaterial = require('../shaders/HDRBasicMaterial');
const createFogMaterial = require('../shaders/createFogMaterial');
const getImagePixels = require('get-image-pixels');
const { randomFloat, shuffle, randomSphere, randomQuaternion, nextSeed } = require('../util/random');
const unindex = require('unindex-mesh');
const palettes = require('nice-color-palettes/500');
const weighted = require('weighted').select;
const convexHull = require('convex-hull');
const smoothMesh = require('taubin-smooth');
const isosurface = require('isosurface');
const { assets } = require('../context');
const BezierEasing = require('bezier-easing');
const newArray = require('new-array');
const colorLuminance = require('color-luminance');
const sampleData = require('sampling');
const vec2 = require('gl-vec2');
const lerp = require('lerp');
const smoothstep = require('smoothstep');
const clamp = require('clamp');
const unlerp = require('unlerp');
const buffer = require('three-buffer-vertex-data');
const triangulate = require('delaunay-triangulate');
const sc = require('simplicial-complex');
const alphaComplex = require('alpha-complex');
const tweenr = require('tweenr')();

const clustering = require('density-clustering');

const glslify = require('glslify');
const path = require('path');

const imageKey = assets.queue({
  texture: false,
  url: 'assets/textures/sym6.jpg'
});

const envMapKey = assets.queue({
  envMap: true,
  level: 1,
  mapping: THREE.CubeReflectionMapping,
  // pbr: true,
  url: 'assets/textures/studio015.png',
  equirectangular: true
});

module.exports = class MainScene extends THREE.Object3D {
  constructor (app) {
    super();
    this.meshes = [];
    const ambient = new THREE.AmbientLight('hsl(0, 0%, 50%)', 1);
    this.add(ambient);

    const light = new THREE.RectAreaLight('white', 4, 2, 2);
    light.position.z = 4;
    light.lookAt(new THREE.Vector3());
    const helper = new THREE.RectAreaLightHelper(light);
    // light.add(helper);
    this.add(light);

    let animating = false;
    this.createMeshes();
    const startAnimation = () => {
      animating = true;
      this.animate(true, () => {
        animating = false;
      });
    };
    startAnimation();
    window.addEventListener('click', () => {
      if (!animating) {
        animating = true;
        this.animate(false, () => {
          this.clearMeshes();
          setTimeout(() => {
            animating = false;
            this.createMeshes();
            startAnimation();
          }, 50);
        });
      }
    });
  }

  clearMeshes () {
    const len = this.meshes.length;
    for (let i = len - 1; i >= 0; i--) {
      this.remove(this.meshes[i]);
      this.meshes[i].geometry.dispose();
    }
    this.meshes.length = 0;
  }

  createMeshes () {
    this.clearMeshes();

    const colors = shuffle(palettes[Math.floor(randomFloat(1) * palettes.length)]).slice(0, 3);
    console.log(colors)
    const weights = getUniformWeights(colors.length, [ 0.1 ])
    // const weights = getUniformWeights(colors.length, [ 0.1, 0.75 ])

    // const image = assets.get(imageKey);
    // const pixels = getImagePixels(image);
    // const imageWidth = image.width;
    // const imageHeight = image.height;

    const tmpVec = new THREE.Vector3();

    const roundVector = vec => {
      vec.x = vec.x > 0 ? 1 : -1;
      vec.y = vec.y > 0 ? 1 : -1;
      vec.z = vec.z > 0 ? 1 : -1;
      return vec;
    };

    const getRandomDirection = (out = new THREE.Vector3()) => {
      out.fromArray(randomSphere([], 1)).normalize().negate();
      return roundVector(out);
      // return new THREE.Vector3(
      //   randomFloat(1) > 0.5 ? -1 : 1,
      //   randomFloat(1) > 0.5 ? -1 : 1,
      //   randomFloat(1) > 0.5 ? -1 : 1
      // );
    }

    const createVolumeLine = (spline, steps = 10, w = randomFloat(0.1, 0.85), h = randomFloat(0.015, 0.05), color) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, h);
      shape.lineTo(0, h);
      shape.lineTo(0, 0);

      const geometry = new THREE.ExtrudeGeometry(shape, {
        extrudePath: spline,
        steps
      });

      const material = new THREE.MeshBasicMaterial({
        color: color || weighted.select(colors, weights),
        // roughness: 1,
        // metalness: 1,
        envMap: assets.get(envMapKey),
        reflectivity: 0.15,
        combine: THREE.MultiplyOperation,
        refractionRatio: 0.95,
        opacity: 0.85,
        transparent: true,
        // depthTest: false,
        side: THREE.DoubleSide,
        shading: THREE.FlatShading,
        wireframe: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotationSpeed = 0;
      this.add(mesh);
      this.meshes.push(mesh);
      return mesh;
    }

    const nurbsDegree = 3;
    const toNurbs = (points) => {
      const nurbsKnots = [];
      for (let i = 0; i <= nurbsDegree; i ++) {
        nurbsKnots.push(0);
      }
      let nurbsControlPoints = points.map((p, i, list) => {
        const o = p.clone().multiplyScalar(2);
        const ret = new THREE.Vector4(o.x, o.y, o.z, 1);
        const knot = (i + 1) / (list.length - nurbsDegree);
        nurbsKnots.push(clamp(knot, 0, 1));
        return ret;
      });
      return new THREE.NURBSCurve(nurbsDegree, nurbsKnots, nurbsControlPoints);
    };

    const paths = [];
    const tubes = [];
    const geometries = [
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.TetrahedronGeometry(1, 0)
    ];
    const geometryWeights = getUniformWeights(geometries.length, [ ])
    const layers = Math.floor(randomFloat(50, 90));
    for (let i = 0; i < layers; i++) {
      const thickness = 0.01;
      const steps = Math.floor(randomFloat(10, 200));
      const speed = 0.01;
      const r = randomFloat(0, 4);
      const position = new THREE.Vector3().fromArray(randomSphere([], r));
      const squeeze = randomFloat(0.05, 0.5)
      position.x *= squeeze;
      position.z *= squeeze;
      const direction = roundVector(position.clone().normalize());
      if (randomFloat(1) > 0.5) direction.negate();
      const turnDistance = thickness;
      const turnDistanceSq = turnDistance * turnDistance;
      const tube = [];
      let hasHitOther = false;
      let ticks = 0;
      let interval = 20;

      for (let n = 0; n < steps; n++) {
        // move along direction
        tmpVec.copy(direction).multiplyScalar(speed);
        position.add(tmpVec);
        let newPoint = position.clone();
        tube.push(newPoint);

        if (hasHitOther) {
          ticks++;
          if (ticks >= interval) {
            ticks = 0;
            hasHitOther = false;
          }
        }

        // if (!hasHitOther) {
        //   for (let j = 0; j < paths.length; j++) {
        //     const other = paths[j];
        //     const distSq = other.distanceToSquared(newPoint);
        //     if (distSq <= turnDistanceSq) {
        //       const margin = 0.005;
        //       tmpVec.copy(other).sub(newPoint).normalize().multiplyScalar(margin);
        //       newPoint.add(tmpVec)
        //       direction.set(0, 1, 0)
        //       // getRandomDirection(direction);
        //       hasHitOther = true;
        //       break;
        //     }
        //   }
        // }
        paths.push(newPoint);
      }

      // const spline = toNurbs(tube);
      const spline = new THREE.CatmullRomCurve3(tube);
      spline.tension = 1;
      spline.type = 'catmullrom';
      const mesh = createVolumeLine(spline, 10);
      mesh.geometry.translate(0, randomFloat(-1, 1), 0);
      // mesh.position.y = randomFloat(-1, 1);
    }

    const lineCount = 2;
    for (let k = 0; k < lineCount; k++) {
      const lineSamples = Math.floor(randomFloat(4, 7));
      const points = newArray(lineSamples).map((_, i) => {
        const s = randomFloat(0.25, 1.0);
        const r = randomFloat(1, 2)
        return new THREE.Vector3().fromArray(randomSphere([], r))
          .multiply(new THREE.Vector3(s, 1, s));
      }).sort((a, b) => {
        return b.y - a.y;
      });
      const nurbsCurve = toNurbs(points);
      createVolumeLine(nurbsCurve, 1000, 0.05, 0.05);
    }
  }

  animate (isIn, cb = (() => {})) {
    const ease = isIn
      ? new BezierEasing(0.970, 0.005, 0.150, 1.005)
      : new BezierEasing(0.655, -0.035, 0.020, 1.215);
    const timeScale = isIn ? 1 : 0.75;
    let delay = isIn ? 0.25 : 0;
    this.meshes.forEach((mesh, i) => {
      const zOff = randomFloat(1, 6) * (randomFloat(1) > 0.5 ? 1 : -1);
      const yOff = randomFloat(1, 6) * (randomFloat(1) > 0.5 ? 1 : -1);
      
      if (isIn) {
        mesh.position.z = zOff;
        mesh.position.y = yOff;
        mesh.material.opacity = 0;
      }
      const duration = randomFloat(0.5, 1.5) * timeScale;
      const duration2 = randomFloat(0.5, 3) * timeScale;

      const a = tweenr.to(mesh.position, {
        duration,
        delay,
        y: isIn ? 0 : yOff,
        ease
      });
      const b = tweenr.to(mesh.position, {
        duration: duration2,
        delay,
        z: isIn ? 0 : zOff,
        ease
      });
      tweenr.to(mesh.material, {
        duration: duration * (isIn ? 1 : 0.75),
        delay,
        opacity: isIn ? 1 : 0
      });
      if (i === this.meshes.length - 1) {
        const tween = duration2 > duration ? b : a;
        tween.on('complete', cb);
      }
      
      delay += 0.01 * timeScale;
    });
  }

  _createBox3DVolume (size = 1, subdivs = 1) {
    if (typeof size === 'number') size = new THREE.Vector3(size, size, size);
    if (typeof subdivs === 'number') subdivs = new THREE.Vector3(subdivs, subdivs, subdivs);
    const geom = new THREE.BoxGeometry(size.x, size.y, size.z, subdivs.x, subdivs.y, subdivs.z);
    const points = geom.vertices.slice();
    geom.dispose();
    return points;
  }

  _renderLine (vertices) {
    const geometry = new THREE.Geometry();
    geometry.vertices = vertices;
    const material = new THREE.LineBasicMaterial({
      color: 'black',
      // sizeAttenuation: false
    });
    const line = new THREE.Line(geometry, material);
    this.add(line);
    return line;
  }

  _renderPoints (vertices) {
    const geometry = new THREE.Geometry();
    geometry.vertices = vertices;
    const material = new THREE.PointsMaterial({
      color: 'black',
      size: 4,
      sizeAttenuation: false
    });
    const points = new THREE.Points(geometry, material);
    this.add(points);
    return points;
  }

  update (dt) {
    if (this.meshes) {
      this.meshes.forEach(mesh => {
        mesh.rotation.y += dt * mesh.rotationSpeed;
        if (mesh.material && mesh.material.uniforms) mesh.material.uniforms.time.value += dt;
      });
    }
  }
}

function getUniformWeights (count, args = []) {
  const computeSum = (a, b) => {
    return (a || 0) + (b || 0);
  };
  const sum = args.reduce(computeSum, 0);
  const remainingAmount = Math.max(0, 1 - sum);
  // const nonFinites = args.reduce((a, b) => {
  //   return a + (typeof b === 'number' ? 0 : 1)
  // }, 0);
  const remainingValues = count - args.length;
  // const remainingValues = Math.max(0, Math.min(count - 1, nonFinites + count - args.length));
  const step = remainingAmount / remainingValues;
  const ret = args.slice();
  for (let i = 0; i < remainingValues; i++) {
    ret.push(step);
  }
  const newSum = ret.reduce(computeSum, 0);
  if (newSum > 1) console.warn('Sum is greater than one on:', args);
  if (newSum < 1) console.warn('Sum is less than one on:', args);
  return ret;
}
