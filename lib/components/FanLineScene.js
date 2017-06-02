const HDRMaterial = require('../shaders/HDRMaterial');
const HDRBasicMaterial = require('../shaders/HDRBasicMaterial');
const createFogMaterial = require('../shaders/createFogMaterial');
const { randomFloat, randomSphere, randomQuaternion, nextSeed } = require('../util/random');
const unindex = require('unindex-mesh');
const palettes = require('nice-color-palettes');
const convexHull = require('convex-hull');
const smoothMesh = require('taubin-smooth');
const isosurface = require('isosurface');
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

    const ambient = new THREE.AmbientLight('hsl(0, 0%, 20%)', 1);
    this.add(ambient);

    const light = new THREE.RectAreaLight('white', 10, 2, 4);
    light.position.z = 5;
    light.lookAt(new THREE.Vector3());
    const helper = new THREE.RectAreaLightHelper(light);
    light.add(helper);
    this.add(light);

    // const colors = palettes[1].slice(0, 3);
    const colors = [ '#000' ];
    // const colors = [ '#000', 'hsl(0, 0%, 50%)', 'hsl(0, 0%, 80%)' ];
    this.meshes = newArray(10).map((_, i) => {
      // return this._createSurface('#fff');
      return this._createSurface(colors[i % colors.length]);
    })
    // this._createCluster('blue', new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
    
    // MESH!
    // Create a base mesh
    // Cast a ray to a random point on that mesh
    // Where the ray hits, create a new mesh on its "surface"
    // 
    
    // ROAD!
    // spawn elements along a road
    // step 2 - make the road a moebius strip or other curve
  }

  _createSurface (color = 'black') {
    const resolution = Math.floor(randomFloat(20, 40));
    const p = new THREE.Vector3();
    const p2 = new THREE.Vector2();
    const mat = new THREE.Matrix4();

    const min = new THREE.Vector3(0, 0, 0);
    const max = new THREE.Vector3(1, 1, 1);
    max.multiplyScalar(randomFloat(0.15, 0.5))
    // min.multiplyScalar(0.5);
    // max.multiplyScalar(0.5);
    // const stretch = 0.8;
    const theta = randomFloat(0.4, 0.5);
    const phi = randomFloat(0.15, 0.25);
    const chaos = randomFloat(5, 20);
    
    const mesh = isosurface.marchingTetrahedra([ resolution, resolution, resolution ],
      (x,y,z) => {
        p.set(x, y, z);

        let len2 = p2.set(x, z).length();
        mat.makeRotationX(Math.abs(Math.sin(len2 * chaos) * chaos));
        p.applyMatrix4(mat);

        len2 = p2.set(p.x, p.z).length();
        const dx = len2 - theta;
        const dy = p.y;
        let ret = p2.set(dx, dy).length() - phi;
        return ret;
      }, [ min.toArray(), max.toArray() ]);

    // mesh.positions = smoothMesh(mesh.cells, mesh.positions, {
    //   iters: 10,
    //   passBand: 0.0001
    // });

    const triangles = unindex(mesh.positions, mesh.cells);
    const barycentrics = [];
    const triCount = triangles.length / 9;
    for (let i = 0; i < triCount; i++) {
      barycentrics.push(1, 0, 0, 0, 1, 0, 0, 0, 1);
    }

    const geometry = new THREE.BufferGeometry();
    buffer.attr(geometry, 'position', triangles, 3);
    buffer.attr(geometry, 'barycentric', barycentrics, 3);
    
    // buffer.index(geometry, mesh.cells);

    const material = new THREE.RawShaderMaterial({
      shading: THREE.FlatShading,
      vertexShader: glslify(path.resolve(__dirname, '../shaders/wireframe.vert')),
      fragmentShader: glslify(path.resolve(__dirname, '../shaders/wireframe.frag')),
      uniforms: {
        color: { type: 'c', value: new THREE.Color(color) },
        opacity: { type: 'f', value: randomFloat(0.05, 0.5) },
        time: { type: 'f', value: 0 },
        emissiveFactor: { type: 'f', value: 1 },
        isWireframe: { type: 'i', value: 1 },
        thickness: { type: 'f', value: randomFloat(0.025, 0.25) }
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const obj = new THREE.Mesh(geometry, material);
    this.add(obj);
    // obj.position.z = randomFloat(0, 1.5);
    obj.scale.y = randomFloat(1, 1);
    // obj.scale.multiplyScalar(randomFloat(0.25, 1))
    obj.rotation.x = -Math.PI / 2;
    obj.rotation.y = randomFloat(-1, 1) * Math.PI * 2;
    obj.frustumCulled = false;
    return obj;
  }

  _iterate (steps = 100) {
    const raycaster = new THREE.Raycaster();
    const radiusBounds = 20;

    const colors = palettes[0];
    let colorIndex = 0;
    const nextColor = () => colors[colorIndex++ % colors.length];
    
    let clusters = [ this._createCluster(nextColor()) ];
    for (let i = 0; i < steps; i++) {
      // cast a ray from a random spherical point to center
      // raycaster.ray.origin.set(randomFloat(-1, 1), 0, randomFloat(-1, 1))
      raycaster.ray.origin.fromArray(randomSphere([], radiusBounds))
      raycaster.ray.direction.copy(raycaster.ray.origin).normalize().negate();

      const hits = raycaster.intersectObjects(clusters);
      if (hits.length > 0) {
        const point = hits[0].point;
        const normal = hits[0].face.normal;
        const cluster = this._createCluster(nextColor(), point, normal);
        clusters.push(cluster);
      }
    }
  }

  _createCluster (color = 'black', position = new THREE.Vector3(), normal = new THREE.Vector3()) {
    const r = 0.1;
    const h = 1;
    const geometry = new THREE.CylinderGeometry(r, r, h, 8, 1);
    geometry.translate(0, h / 2, 0);

    // const radius = randomFloat(0.1, 2);
    // const pointCount = Math.floor(randomFloat(5, 20));
    // // const spacing = 0.5;
    // const points = newArray(pointCount).map(() => {
    //   const r = randomFloat(0, 1);
    //   const position = new THREE.Vector3();
    //   const tmpVec = new THREE.Vector3().fromArray(randomSphere([], r));
    //   // const tmpVec2 = normal.clone();
    //   // tmpVec2.lerp(new THREE.Vector3(1, 1, 1), 0.75);
    //   // tmpVec.multiply(tmpVec2);
    //   position.add(tmpVec);
    //   return {
    //     position: position
    //   };
    // });
    // // points.forEach(p => p.position.multiplyScalar(radius));

    // // const geometry = new THREE.IcosahedronGeometry(1, 0);

    // const positionArray = points.map(p => p.position.toArray());
    // const cells = convexHull(positionArray);
    // const geometry = new THREE.BufferGeometry();
    // buffer.attr(geometry, 'position', positionArray, 3);
    // buffer.index(geometry, cells);

    // const cells = alphaComplex(radius * 0.5, positionArray);
    // // const cells = triangulate(positionArray);
    // const skeleton = sc.skeleton(cells, 2);

    // const result = smoothMesh(skeleton, positionArray, {
    //   iters: 10,
    //   passBand: 0.1
    // });
    // const triangles = unindex(result, skeleton);
    // const geometry = new THREE.BufferGeometry();
    // buffer.attr(geometry, 'position', triangles, 3);

    const material = new THREE.MeshBasicMaterial({
      color,
      metalness: 0,
      roughness: 1,
      transparent: true,
      opacity: 0.001,
      depthTest: true,
      depthWrite: true,
      shading: THREE.FlatShading,
      side: THREE.DoubleSide,
      // wireframe: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.add(mesh);
    const fromVec = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(fromVec, normal);
    mesh.quaternion.copy(quat);
    mesh.position.copy(position);
    // mesh.position.copy(normal).multiplyScalar(radius * spacing).add(position);
    return mesh;
  }

  _createHairball () {
    const subdivs = 4;
    const size = 1;
    const boxGeometry = new THREE.BoxGeometry(size, size, size, subdivs, subdivs, subdivs);
    const particles = boxGeometry.vertices.map(p => {
      const offset = new THREE.Vector3().fromArray(randomSphere([], 0.0));
      // p.add(offset);
      return {
        position: p,
        attraction: randomFloat(0, 0.1),
        radius: randomFloat(0, 1),
        speed: 4,
        direction: new THREE.Vector3().fromArray(randomSphere([], 1)),
        line: [ ]
      };
    });
    boxGeometry.dispose();

    const tmpVec = new THREE.Vector3();
    const attract = (p1, p2, dist) => {
      tmpVec.subVectors(p1.position, p2.position).normalize();

      let roundAngle = 135 * Math.PI / 180;
      const angle = Math.atan2(tmpVec.y, tmpVec.x);
      if (angle % roundAngle !== 0) {
        const newAngle = Math.round(angle / roundAngle) * roundAngle;
        tmpVec.x = Math.cos(newAngle);
        tmpVec.y = Math.sin(newAngle);
      }

      tmpVec.multiplyScalar(dist * p1.speed);

      p1.position.add(tmpVec);
      p1.line.push(p1.position.clone());
    };

    const steps = 50;
    for (let i = 0; i < steps; i++) {
      for (let k = 0; k < particles.length; k++) {
        const particle = particles[k];
        // attract this particle to all others
        for (let j = 0; j < particles.length; j++) {
          const particle2 = particles[j];
          if (particle === particle2) continue;
          const distSq = particle.position.distanceToSquared(particle2.position);
          const radiusSq = particle2.radius * particle2.radius;
          if (distSq <= radiusSq) {
            attract(particle, particle2, Math.sqrt(distSq));
          }
        }
      }
    }

    particles.map(p => this._renderLine(p.line));
    this._renderPoints(particles.map(p => p.position));
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
        if (mesh.material && mesh.material.uniforms) mesh.material.uniforms.time.value += dt;
      });
    }
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
