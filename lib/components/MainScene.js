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

    const ambient = new THREE.AmbientLight('hsl(0, 0%, 10%)', 1);
    this.add(ambient);

    const light = new THREE.RectAreaLight('white', 10, 2, 4);
    light.position.z = 7;
    light.lookAt(new THREE.Vector3());
    // const helper = new THREE.RectAreaLightHelper(light);
    // light.add(helper);
    this.add(light);

    const subdivs = 30;
    const sphereRadius = 4;
    const width = subdivs;
    const height = subdivs;
    const depth = subdivs;
    const points = [];
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        for (let z = 0; z < depth; z++) {
          const px = x / (width - 1);
          const py = y / (height - 1);
          const pz = z / (depth - 1);
          const spacing = randomFloat(0.05, 0.5);
          const position = new THREE.Vector3().fromArray(randomSphere([], randomFloat(0, sphereRadius)));
          position.multiplyScalar(spacing);
          // const position = new THREE.Vector3(px, py, pz);
          // position.multiplyScalar(2).subScalar(1).multiplyScalar(spacing);
          points.push({
            index: new THREE.Vector3(x, y, z),
            position,
            speed: randomFloat(0.05, 0.15),
            direction: new THREE.Vector3().fromArray(randomSphere([], 1))
          });
        }
      }
    }

    const knotCount = 300;
    const knots = newArray(knotCount).map(() => {
      const position = new THREE.Vector3().fromArray(randomSphere([], randomFloat(0, sphereRadius)));
      return {
        radius: randomFloat(0.01, 0.75),
        position,
        shearAmount: randomFloat(0.15, 1),
        shear: new THREE.Vector3(
          randomFloat(0, 1),
          randomFloat(0, 1),
          randomFloat(0, 1)
        ),
        angle: randomFloat(-1, 1) * Math.PI * 2,
        attraction: randomFloat(-1, 1),
      };
    });

    const tmpVec = new THREE.Vector3();
    const tmpMat1 = new THREE.Matrix4();
    const tmpMat2 = new THREE.Matrix4();

    const attractPoint = (p, knot, dist) => {
      const strength = clamp(1 - dist / knot.radius, 0, 1) * knot.attraction;
      const s = knot.shearAmount;
      tmpMat1.makeShear(knot.shear.x * s * strength, knot.shear.y * s * strength, knot.shear.z * s * strength);
      p.position.applyMatrix4(tmpMat1);
      tmpVec.subVectors(p.position, knot.position).normalize();
      tmpVec.multiplyScalar(p.speed);
      p.position.add(tmpVec);
    };

    const updatePoint = (p) => {
      for (let k = 0; k < knots.length; k++) {
        const knot = knots[k];
        const distSq = knot.position.distanceToSquared(p.position);
        const radiusSq = knot.radius * knot.radius;
        if (distSq <= radiusSq) {
          attractPoint(p, knot, Math.sqrt(distSq));
        }
      }
    };

    const tick = () => {
      points.forEach(p => {
        updatePoint(p);
      });
    }

    const steps = 20;
    for (let i = 0; i < steps; i++) {
      tick();
    }

    const positionArrays = points.map(p => p.position.toArray());
    const clusterCount = 10;
    // const dbscan = new clustering.DBSCAN();
    // const clusters = dbscan.run(positionArrays, 0.5, 10);
    // console.log('clusters', clusters.length)
    const kmeans = new clustering.KMEANS();
    const clusters = kmeans.run(positionArrays, clusterCount);
    // const colors = [ '#000' ]
    const colors = palettes[3].slice(0, 3);

    // this.meshes = clusters.map((cluster, i) => {
    //   if (cluster.length <= 0) return;
      
      // const points = cluster.map(index => positionArrays[index]);
      // // const cells = alphaComplex(sphereRadius * 0.5, points);
      // const cells = triangulate(points);
      // const skeleton = sc.skeleton(cells, 2);
      // if (skeleton.length <= 0) return;

    //   const barycentrics = [];

    //   const triangles = unindex(points, skeleton);
    //   const triCount = triangles.length / 9;
    //   for (let i = 0; i < triCount; i++) {
    //     barycentrics.push(1, 0, 0, 0, 1, 0, 0, 0, 1);
    //   }

    //   const geometry = new THREE.BufferGeometry();
    //   buffer.attr(geometry, 'position', triangles, 3);
    //   buffer.attr(geometry, 'barycentric', barycentrics, 3);
    //   // geometry.computeFaceNormals();

    //   const color = colors[i % colors.length];
    //   const material = new THREE.RawShaderMaterial({
    //     depthTest: true,
    //     shading: THREE.FlatShading,
    //     depthWrite: true,
    //     transparent: true,
    //     // roughness: 1,
    //     // metalness: 0,
    //     side: THREE.DoubleSide,
    //     // wireframe: true,
    //     // color
    //     vertexShader: glslify(path.resolve(__dirname, '../shaders/wireframe.vert')),
    //     fragmentShader: glslify(path.resolve(__dirname, '../shaders/wireframe.frag')),
    //     uniforms: {
    //       color: { type: 'c', value: new THREE.Color(color) },
    //       opacity: { type: 'f', value: 1 },
    //       time: { type: 'f', value: 0 }
    //     }
    //   });
    //   const mesh = new THREE.Mesh(geometry, material);
    //   this.add(mesh);
    //   return mesh;
    // });

    this.meshes = clusters.map((cluster, i) => {
      const color = colors[i % colors.length];
      const clusterPoints = cluster.map(index => points[index].position);
      const centroid = new THREE.Vector3().fromArray(kmeans.centroids[i]);
      clusterPoints.sort((a, b) => {
        return b.distanceToSquared(centroid) - a.distanceToSquared(centroid);
      });

      const spline = new THREE.CatmullRomCurve3(clusterPoints);
      spline.tension = 1;
      spline.type = 'catmullrom';
      const geometry = new THREE.Geometry();
      geometry.vertices = spline.getSpacedPoints(clusterPoints.length * 2);
      const material = new THREE.LineBasicMaterial({
        color,
        opacity: 0.5,
        transparent: true
      });
      const line = new THREE.Line(geometry, material);
      this.add(line);

      const pointGoemetry = new THREE.Geometry();
      pointGoemetry.vertices = clusterPoints;
      const pointMaterial = new THREE.PointsMaterial({
        color,
        opacity: 0.5,
        transparent: true,
        size: 2,
        sizeAttenuation: false
      });
      const mesh = new THREE.Points(pointGoemetry, pointMaterial);
      this.add(mesh);

      return line;
      // return mesh;
    })
  }

  update (dt) {
    // this.meshes.forEach(mesh => {
    //   if (mesh.material && mesh.material.uniforms) mesh.material.uniforms.time.value += dt;
    // });
  }
}

function createSlice (line, t) {
  const shape = new THREE.Shape();
  const w = 0.05;
  const h = 0.05;
  shape.moveTo(0, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w, h);
  shape.lineTo(0, h);
  shape.lineTo(0, 0);

  const points = line.map(a => new THREE.Vector3().set(a[0], a[1], 0));
  const path = new THREE.CatmullRomCurve3(points);
  path.type = 'catmullrom';
  const geometry = new THREE.ExtrudeGeometry(shape, {
    steps: 500,
    amount: randomFloat(1, 100),
    bevelEnabled: false,
    extrudePath: path,
    bevelThickness: 0,
    bevelSize: 1,
    bevelSize: 2
  });

  const material = new HDRMaterial({
    color: '#fff',
    shading: THREE.FlatShading,
    metalness: 0,
    roughness: 1,
    emissiveFactor: 1
  });
  const mesh = new THREE.Mesh(geometry, material);
  // mesh.position.z = randomFloat(-2, 2);
  return mesh;
}

function createLines () {
  const lineWidth = 10;
  const knotCount = 100;
  const lineCount = 100;
  const lineSteps = 800;
  const margin = [ 0, 0, 0 ];
  const knotMargin = [ 0, 0, 0 ];
  const width = 4;
  const height = 4;
  const depth = 4;
  const spacing = (width - lineWidth - margin[0] * 2) / (lineCount - 1);

  const knots = newArray(knotCount).map((i) => {
    const position = [
      randomFloat(knotMargin[0], width - knotMargin[0]) - width / 2,
      randomFloat(-height / 2 + knotMargin[1], height / 2 - knotMargin[0])
    ];
    return {
      direction: randomFloat(1) > 0.5 ? 1 : -1,
      radius: randomFloat(1, 4),//; * Math.PI * 2 * 5;
      attraction: randomFloat(0.1, 1.0),
      position
    };
  });

  const swirl = (point, knot, dist) => {
    const strength = smoothstep(0, 1, clamp(1 - dist / knot.radius, 0, 1)) * knot.attraction;
    let cx = unlerp(margin[0], width - margin[0], knot.position[0]);
    let cy = unlerp(margin[1], height - margin[1], knot.position[1]);

    let u = unlerp(margin[0], width - margin[0], point[0]);
    let v = unlerp(margin[1], height - margin[1], point[1]);

    u -= cx;
    v -= cy;

    let aspect = (width - margin[0] * 2) / (height - margin[1] * 2);
    u *= aspect;

    let radius = vec2.length([ u, v ]);
    let angle = Math.atan2(v, u);
    angle += strength * knot.direction;

    const nx = radius * Math.cos(angle) / aspect + cx;
    const ny = radius * Math.sin(angle) + cy;

    point[0] = lerp(margin[0], width - margin[0], nx);
    point[1] = lerp(margin[1], height - margin[1], ny);
  };

  const attract = (point) => {
    knots.forEach(knot => {
      const radiusSq = knot.radius * knot.radius;
      const distSq = vec2.squaredDistance(knot.position, point);
      if (distSq <= radiusSq) {
        swirl(point, knot, Math.sqrt(distSq));
      }
    });
  }

  let lines = newArray(lineCount).map((_, i) => {
    return newArray(lineSteps).map((_, j) => {
      const yi = (j / (lineSteps - 1));
      let x = i * spacing + lineWidth / 2 + margin[0];
      let y = yi * (height - margin[1] * 2) + margin[1];
      x -= width / 2;
      y -= height / 2;

      const point = [ x, y ];
      attract(point);
      return point;
    });
  });

  return lines;
}