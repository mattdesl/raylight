const HDRMaterial = require('../shaders/HDRMaterial');
const HDRBasicMaterial = require('../shaders/HDRBasicMaterial');
const newArray = require('new-array');
const { randomFloat, randomSphere } = require('../util/random');
const clamp = require('clamp');
const shuffle = require('array-shuffle');
const randomSamplesInMesh = require('../util/randomSamplesInMesh');

const palettes = shuffle(require('nice-color-palettes'));
const palette = [ '#fff' ]
// const palette = shuffle(palettes[0]).slice(0, 3);
const tweenr = require('tweenr')();
const tmpVec = new THREE.Vector3();

module.exports = function (app, opt = {}) {
  const container = new THREE.Object3D();


  const light = new THREE.PointLight('#fff', 1, 7);
  light.position.set(1, 3, 1);
  container.add(light);

  // const light = new THREE.RectAreaLight('#fff', 5, 1, 0.5);
  // light.position.set(1, 4, 1.5);
  // light.lookAt(new THREE.Vector3());
  // container.add(light);

  // const helper = new THREE.RectAreaLightHelper(light);
  // helper.update();
  // helper.children.forEach(child => {
  //   child.material = new HDRBasicMaterial({
  //     lights: false,
  //     color: child.material.color,
  //     wireframe: child.material.wireframe,
  //     side: child.material.side,
  //     fog: child.material.fog
  //   });
  // });
  // light.add(helper);

  const ambient = new THREE.AmbientLight('hsl(0, 0%, 10%)');
  container.add(ambient);

  const icosphere = new THREE.IcosahedronGeometry(1, 0);

  const particleSize = 0.05;
  const particleGeometry = new THREE.CircleGeometry(particleSize, 4);
  const particleMaterial = new HDRBasicMaterial({
    // wireframe: true,
    color: new THREE.Color('white').multiplyScalar(10),
  });
  let count = 1000;
  let samples = newArray(count);
  let highSamples = [];
  if (opt.textGeometry) {
    const textMesh = new THREE.Mesh(opt.textGeometry, new HDRMaterial({
      // wireframe: true,
      color: new THREE.Color('white').multiplyScalar(0.65)
    }))
    samples = randomSamplesInMesh(textMesh, count);
    highSamples = randomSamplesInMesh(textMesh, 1000);
    container.add(textMesh);
    if (opt.wireGeometry) textMesh.geometry = opt.wireGeometry;
  }

  const particles = samples.map((sample, i) => {
    const t = i / (count - 1);
    const velocity = new THREE.Vector3();
    // const emitVelocity = randomFloat(1, 5);
    // velocity.set(0, i%2 === 0 ? 1 : -1, 0)
    velocity.fromArray(randomSphere([], 1));
    // velocity.multiplyScalar(10);

    const position = new THREE.Vector3();
    const angle = t * 2 * Math.PI;
    // tmpVec.x = Math.sin(angle) * r;
    
    tmpVec.fromArray(randomSphere([], randomFloat(0, 4)));
    tmpVec.x = (t * 2 - 1) * 2;
    tmpVec.z *= 1.5;

    if (sample) {
      const norm = sample.normal.clone().multiplyScalar(randomFloat(0.5, 2));
      tmpVec.copy(sample.position).add(norm);

      // velocity.copy(tmpVec).sub(sample.position).normalize().negate();
      // velocity.copy(sample.normal).negate();
    }
    // const oval = 1.5;
    // tmpVec.x *= oval;
    // tmpVec.y *= oval;
    // tmpVec.z *= 2;
    position.add(tmpVec);
    
    // position.y += 1;
    // position.copy(icosphere.vertices[Math.floor(randomFloat(0, icosphere.vertices.length))]);

    const friction = 0.98;
    const speed = randomFloat(0.01, 0.25);
    velocity.multiplyScalar(speed);

    const mesh = new THREE.Mesh(particleGeometry, particleMaterial);
    // container.add(mesh);

    const maxVelocity = 0.015;
    const particleAngle = null;// randomFloat(1) > 0.5 ? 135 : 135;
    return {
      textThreshold: 0.01,
      attractionThreshold: randomFloat(1, 5),
      // attractionIncrease: 0.000001,
      attraction: -3.5, //randomFloat(-0.01, -0.01),
      target: new THREE.Vector3().fromArray(randomSphere([], randomFloat(0, 4))),
      mesh,
      thickness: randomFloat(0.01, 0.05),
      angle: particleAngle,
      maxVelocity,
      speed,
      points: [],
      position,
      friction,
      velocity
    };
  });

  // new THREE.JSONLoader().load('assets/ground.json', geometry => {
  //   const material = new HDRMaterial({
  //     shading: THREE.SmoothShading,
  //     // emissive: new THREE.Color('white').multiplyScalar(1),
  //     roughness: 1,
  //     metalness: 0.9
  //   })
  //   const ground = new THREE.Mesh(geometry, material);
  //   ground.rotation.y = -Math.PI / 4;
  //   container.add(ground);
  // })

  // create();

  const stemCount = 50;
  for (let i = 0; i < stemCount; i++) {
    tick();
  }

  const reflectionProbe = new THREE.CubeCamera(0.01, 100, 1024);
  reflectionProbe.position.set(0, 0, 0);
  reflectionProbe.renderTarget.texture.mapping = THREE.CubeRefractionMapping;
  container.add(reflectionProbe);

  const baseMaterial = new HDRMaterial({
    shading: THREE.FlatShading,
    side: THREE.DoubleSide,
    metalness: 0.75,
    roughness: 1,
    // color: isEmissive ? new THREE.Color('red').multiplyScalar(10) : 'white'
  });
  const reflMaterial = baseMaterial.clone();
  reflMaterial.roughness = 0;
  reflMaterial.metalness = 1;
  reflMaterial.envMap = reflectionProbe.renderTarget.texture;

  let updateCubeMap = true;
  const paths = particles.map((p, i) => {
    const spline = new THREE.CatmullRomCurve3(p.points);
    const pointCount = Math.floor(p.points.length / 2);
    const baseGeometry = new THREE.TubeGeometry(spline, pointCount, p.thickness, 3, spline.closed);
    const geometry = new THREE.BufferGeometry().fromGeometry(baseGeometry);
    baseGeometry.dispose();

    const isEmissive = randomFloat(1) > 0.75;
    const material = baseMaterial.clone();
    const color = palette[Math.floor(randomFloat(0, palette.length))];
    // material.wireframe = randomFloat(1) > 0.95;
    material.emissive = isEmissive ? new THREE.Color(color).multiplyScalar(1) : undefined;
    
    const drawRangeMax = geometry.getAttribute('position').count;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.drawRangeMax = drawRangeMax;
    mesh.tween = { value: 0 };
    return mesh;
  });
  paths.forEach(p => container.add(p));

  paths.forEach((p, i) => {
    p.geometry.drawRange = { start: 0, count: 0 };
    tweenr.to(p.tween, {
      duration: randomFloat(1, 4),
      delay: 0.5 + randomFloat(0, 4),
      // delay: 0.5 + i * 0.01,
      ease: 'expoOut',
      value: 1
    });
  });

  return {
    update (dt = 0) {
      // if (updateCubeMap) {
      //   updateCubeMap = false;
      //   paths.forEach(p => {
      //     p.geometry.drawRange.count = p.drawRangeMax;
      //   });
      //   reflectionProbe.updateCubeMap(app.renderer, app.scene);
      //   paths.forEach(p => {
      //     const emissive = p.material.emissive;
      //     p.material = reflMaterial.clone();
      //     // p.material.emissive = emissive;
      //   });
      //   return;
      // }
      paths.forEach(p => {
        p.geometry.drawRange.count = Math.round(p.drawRangeMax * p.tween.value);
      });
    },
    object3d: container
  };

  function create () {
    const emitter = new THREE.Mesh(icosphere, new HDRMaterial({
      emissive: new THREE.Color('white').multiplyScalar(10),
      // color: new THREE.Color('white').multiplyScalar(2),
      shading: THREE.FlatShading,
      roughness: 1,
      metalness: 0
    }));
    container.add(emitter);
  }

  function tick () {
    particles.forEach(p => {
      let thresholdSq = p.attractionThreshold * p.attractionThreshold;
      let textThresholdSq = p.textThreshold * p.textThreshold;

      if (opt.textGeometry) {
        let highSample;
        for (let i = 0; i < highSamples.length; i++) {
          const o = highSamples[i];
          if (o.position.distanceToSquared(p.position) <= textThresholdSq) {
            highSample = o;
            break;
          }
        }
        if (highSample) {
          // p.velocity.fromArray()
          p.velocity.copy(highSample.normal);
          tmpVec.copy(highSample.normal).multiplyScalar(p.textThreshold * 1.25);
          p.position.copy(highSample.position).add(tmpVec);
          // p.velocity.set(0, 0, 0)
        }
      }
      // attract
      particles.forEach(other => {
        if (p === other) return;
        
        // const hit = other.points.some(o => o.distanceToSquared(p.position) <= thresholdSq);
        // if (hit) {
        //   p.velocity.set(0, randomFloat(-1, 1), 0).multiplyScalar(p.speed)
        //   p.velocity.fromArray(randomSphere([], p.speed))
        //   p.angle = 54;
        //   p.velocity.multiplyScalar(0);
        //   const distScale = 1 - clamp(distSq / thresholdSq, 0, 1);
        // }
        const distSq = p.position.distanceToSquared(other.position);
        if (distSq <= thresholdSq) {
          const distScale = 1 - clamp(distSq / thresholdSq, 0, 1);
          attractTo(p, other.position, distScale);
        }
      });
    });

    particles.forEach(p => {
      if (p.angle !== null) {
        tmpVec.copy(p.velocity).normalize();
        let vecLen = p.velocity.length();
        let roundAngle = p.angle * Math.PI / 180;
        const angle = Math.atan2(tmpVec.y, tmpVec.x);
        if (angle % roundAngle !== 0) {
          const newAngle = Math.round(angle / roundAngle) * roundAngle;
          tmpVec.x = Math.cos(newAngle);
          tmpVec.y = Math.sin(newAngle);
        }
        tmpVec.multiplyScalar(vecLen);
        p.velocity.copy(tmpVec);
      }

      p.velocity.clampScalar(-p.maxVelocity, p.maxVelocity);
      p.position.add(p.velocity);
      p.velocity.multiplyScalar(p.friction);
      p.mesh.position.copy(p.position);
      p.points.push(p.position.clone());
    });
  }

  function attractTo (p, otherPosition, distScale = 1, direction = 1) {
    const curSpeed = p.velocity.length();

    tmpVec.copy(otherPosition).sub(p.position).normalize();
    tmpVec.multiplyScalar(p.attraction * p.speed * distScale * direction * curSpeed);
    p.velocity.add(tmpVec);
  }
};
