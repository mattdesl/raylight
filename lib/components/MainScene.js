const HDRMaterial = require('../shaders/HDRMaterial');
const HDRBasicMaterial = require('../shaders/HDRBasicMaterial');
const createFogMaterial = require('../shaders/createFogMaterial');
const { randomFloat, randomSphere, randomQuaternion, nextSeed } = require('../util/random');
const unindex = require('unindex-mesh');
const palettes = require('nice-color-palettes');
const { assets } = require('../context');
const newArray = require('new-array');
const vec2 = require('gl-vec2');
const lerp = require('lerp');
const smoothstep = require('smoothstep');
const clamp = require('clamp');
const unlerp = require('unlerp');
const buffer = require('three-buffer-vertex-data');
const triangulate = require('delaunay-triangulate');
const sc = require('simplicial-complex');
const alphaComplex = require('alpha-complex');

const clustering = require('density-clustering');

const glslify = require('glslify');
const path = require('path');

const envMapKey = assets.queue({
  envMap: true,
  url: 'assets/textures/studio008.png',
  // pbr: true,
  equirectangular: true
})

module.exports = class MainScene extends THREE.Object3D {
  constructor (app) {
    super();

    const ambient = new THREE.AmbientLight('hsl(0, 0%, 40%)', 1);
    this.add(ambient);

    const light = new THREE.RectAreaLight('white', 10, 2, 4);
    light.position.z = 7;
    light.lookAt(new THREE.Vector3());
    const helper = new THREE.RectAreaLightHelper(light);
    light.add(helper);
    // this.add(light);

    const sphereRadius = 4;
    // const subdivs = 30;
    // const width = subdivs;
    // const height = subdivs;
    // const depth = subdivs;

    const sliceCount = 70;
    const segments = 6;
    const slices = [];
    for (let y = 0; y < sliceCount; y++) {
      const twist = randomFloat(1, 1);
      const slice = [];
      const height = randomFloat(8, 10);
      const radius = randomFloat(1, 4);
      const dir = randomFloat(1) > 0.5 ? 1 : -1;
      const angleSpacing = randomFloat(0.1, 1);
      const offset = new THREE.Vector3().fromArray(randomSphere([], 0.3));
      for (let i = 0; i < segments; i++) {
        const t = (i / (segments - 1));
        const k = (y / (sliceCount - 1));
        const angle = ((t * Math.PI * 2) + k * Math.PI * angleSpacing) * twist;
        const py = (t * 2 - 1) * height;
        const px = Math.cos(angle) * radius;
        const pz = Math.sin(angle) * radius;
        const position = new THREE.Vector3(px, py, pz);
        position.add(offset).multiplyScalar(dir * t);
        slice.push({
          angle,
          speed: randomFloat(0.1, 0.1),
          originalPosition: position.clone(),
          position
        });
      }
      slices.push(slice);
    }

    const tmpMat = new THREE.Matrix4();
    const tmpVec = new THREE.Vector3();
    const knotCount = 100;
    const knots = newArray(knotCount).map(() => {
      return {
        position: new THREE.Vector3().fromArray(randomSphere([], randomFloat(0, 2))),
        radius: randomFloat(0.01, 1),
        spin: randomFloat(0.01, 0.01),
        speed: randomFloat(0.01, 0.5)
      }
    });

    const attract = (point, knot, dist) => {
      const strength = clamp(1 - dist / knot.radius, 0, 1);

      tmpMat.makeRotationX(Math.PI * 2 * strength * knot.spin);
      point.position.applyMatrix4(tmpMat);

      // tmpVec.copy(point.position).normalize();
      tmpVec.subVectors(point.position, knot.position).normalize();
      tmpVec.multiplyScalar(point.speed * knot.speed);
      point.position.add(tmpVec);

      // point.angle += strength;
      // point.position.x = Math.cos(point.angle) * point.zScale;
      // point.position.z = Math.sin(point.angle) * point.zScale;
    }

    const warp = slice => {
      slice.forEach(point => {
        knots.forEach(knot => {
          const distSq = point.position.distanceToSquared(knot.position);
          const radiusSq = knot.radius * knot.radius;
          if (distSq <= radiusSq) {
            attract(point, knot, Math.sqrt(distSq));
          }
        })
      });
    }

    const steps = 20;
    for (let i = 0; i < steps; i++) {
      slices.forEach(warp);
    }

    // const colors = [ '#000' ]
    const colors = palettes[5].slice(0, 3);

    this.meshes = slices.map((data, i) => {
      const color = colors[i % colors.length];
      const points = data.map(p => p.position);
      const t = (i / (sliceCount - 1)) * 2 - 1;

      const centroid = new THREE.Vector3(0, t, 0);
      const positions = points.map(p => p.toArray());
      positions.unshift(centroid.toArray());

      const indices = [];
      for (let i = 0; i < points.length - 1; i++) {
        indices.push(0, i + 1, i + 2);
      }

      const geometry = new THREE.BufferGeometry();
      buffer.attr(geometry, 'position', positions, 3);
      buffer.index(geometry, indices);

      const geometry2 = createRibbonGeometry(points, randomFloat(0.05, 0.1), randomFloat(0.1, 1), false);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: randomFloat(0.75, 0.75),
        // roughness: 1,
        // metalness: 0,
        // wireframe: true,
        side: THREE.DoubleSide,
        shading: THREE.FlatShading
      });
      const mesh = new THREE.Mesh(geometry2, material);
      this.add(mesh);
      
      // const pointsGeometry = new THREE.Geometry();
      // const pointsMaterial = new THREE.PointsMaterial({
      //   size: 1,
      //   color,
      //   side: THREE.DoubleSide,
      //   sizeAttenuation: false
      // })
      
      return mesh;
    });
  }

  update (dt) {
    // this.meshes.forEach(mesh => {
    //   if (mesh.material && mesh.material.uniforms) mesh.material.uniforms.time.value += dt;
    // });
  }
}

function createRibbonGeometry (points, w, h, closed = false) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w, h);
  shape.lineTo(0, h);
  shape.lineTo(0, 0);

  const spline = new THREE.CatmullRomCurve3(points);
  spline.tension = 1;
  spline.closed = closed;
  spline.type = 'catmullrom';

  const geometry = new THREE.ExtrudeGeometry(shape, {
    steps: 200,
    // amount: 1,
    bevelEnabled: false,
    extrudePath: spline,
    bevelThickness: 0,
    bevelSize: 1,
    bevelSize: 2
  });
  return geometry;
}
