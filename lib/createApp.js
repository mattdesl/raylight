/*
  This is a generic "ThreeJS Application"
  helper which sets up a renderer and camera
  controls.
 */

const createControls = require('orbit-controls');
const assign = require('object-assign');
const lerp = require('lerp');
const defined = require('defined');
const mouseTimeline = require('tweenr')();
const angleOffsetTimeline = require('tweenr')();
const isMobile = require('./util/isMobile');
const touches = require('touches');
const createPostShader = require('./shaders/createPostShader');
const glslify = require('glslify');
const path = require('path');

const EffectComposer = require('./post/EffectComposer');
const BloomTexturePass = require('./post/BloomTexturePass');
const RenderPass = require('./post/RenderPass');
const SSAO = require('./shaders/SSAOShader');
const FXAA = require('./shaders/fxaa');
const query = require('./util/query');
const isIOS = require('./util/isIOS');
const isHighQuality = Boolean(query.highQuality);

const { renderer, floatBufferType } = require('./context');

module.exports = createApp;
function createApp (opt = {}) {
  // Scale for retina
  const defaultDPR = 2;
  const dpr = defined(query.dpr, Math.min(defaultDPR, window.devicePixelRatio));
  const needsDepth = isHighQuality;

  let time = 0;
  const cameraDistance = 8;

  const theta = 0 * Math.PI / 180;
  const angleOffsetMax = 15;
  const angleOffsetTween = { value: 0 };
  const mouseOffset = new THREE.Vector2();
  const tmpQuat1 = new THREE.Quaternion();
  const tmpQuat2 = new THREE.Quaternion();
  const AXIS_X = new THREE.Vector3(1, 0, 0);
  const AXIS_Y = new THREE.Vector3(0, 1, 0);

  renderer.setPixelRatio(dpr);
  renderer.gammaFactor = 2.2;
  renderer.gammaOutput = false;
  renderer.gammaInput = false;
  renderer.sortObjects = false;

  // Add the <canvas> to DOM body
  const canvas = renderer.domElement;

  // perspective camera
  const near = 0.01;
  const far = 50;
  const fieldOfView = 65;
  const orthoScale = cameraDistance;
  const isometric = true;
  const camera = isometric
    ? new THREE.OrthographicCamera()
    : new THREE.PerspectiveCamera(fieldOfView, 1);
  camera.near = near;
  camera.far = far;
  const target = new THREE.Vector3();

  // 3D scene
  const scene = new THREE.Scene();

  // post processing
  let bloom, fxaa;
  const postPasses = [];
  const hdrTarget = createTarget(floatBufferType);
  const ldrTarget = createTarget(false);
  const renderTargets = [ hdrTarget, ldrTarget ];

  // slick 3D orbit controller with damping
  const useOrbitControls = !isometric;//query.orbitControls;
  let controls;
  if (useOrbitControls) {
    controls = createControls(assign({
      canvas,
      theta,
      // phiBounds: [ 0, Math.PI / 2 ],
      // thetaBounds: [ -Math.PI / 2, Math.PI / 2 ],
      // target: [ 0, 1, 0 ],
      distanceBounds: [ 0.5, 40 ],
      distance: cameraDistance
    }, opt));
  }

  // Update renderer size
  window.addEventListener('resize', resize);

  const app = assign({}, {
    tick,
    camera,
    scene,
    renderer,
    canvas,
    render,
    getBloom: () => bloom
  });

  app.width = 0;
  app.height = 0;
  app.top = 0;
  app.left = 0;

  // Setup initial size & aspect ratio
  // setupPost();
  resize();
  tick();
  createMouseParallax();
  return app;

  function setupPost () {
    bloom = new BloomTexturePass(scene, camera, {
      gammaOutput: renderer.gammaFactor
    });
    postPasses.push(bloom);

    if (!isMobile && query.fxaa !== false) {
      fxaa = new EffectComposer.ShaderPass(FXAA());
      postPasses.push(fxaa);
    }
  }

  function tick (dt = 0) {
    const aspect = app.width / app.height;

    if (isometric) {
      camera.left = -orthoScale * aspect;
      camera.right = orthoScale * aspect;
      camera.top = orthoScale;
      camera.bottom = -orthoScale;
      camera.position.set(orthoScale, orthoScale, orthoScale);
      camera.lookAt(target);
    } else {
      if (useOrbitControls) {
        // update camera controls
        controls.update();
        camera.position.fromArray(controls.position);
        camera.up.fromArray(controls.up);
        camera.lookAt(target.fromArray(controls.target));
      } else {
        const phi = Math.PI / 2;
        camera.position.x = Math.sin(phi) * Math.sin(theta);
        camera.position.y = Math.cos(phi);
        camera.position.z = Math.sin(phi) * Math.cos(theta);

        const radius = cameraDistance;
        const radianOffset = angleOffsetTween.value * Math.PI / 180;
        const xOff = mouseOffset.y * radianOffset;
        const yOff = mouseOffset.x * radianOffset;
        tmpQuat1.setFromAxisAngle(AXIS_X, -xOff);
        tmpQuat2.setFromAxisAngle(AXIS_Y, -yOff);
        tmpQuat1.multiply(tmpQuat2);
        camera.position.applyQuaternion(tmpQuat1);
        camera.position.multiplyScalar(radius);

        target.set(0, 0, 0);
        camera.lookAt(target);
      }
    }
      

    // Update camera matrices
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    postPasses.forEach(pass => {
      if (typeof pass.tick === 'function') pass.tick(dt);
    });
  }

  function render () {
    if (postPasses.length > 0) {
      // render scene into HDR buffer
      renderer.render(scene, camera, hdrTarget, true);
      // if we have FXAA, render to it, otherwise to screen
      const nextBuffer = fxaa ? ldrTarget : undefined;
      // if there's no next buffer, render bloom to screen
      bloom.renderToScreen = !nextBuffer;
      // apply bloom
      bloom.render(renderer, nextBuffer, hdrTarget);
      // apply FXAA
      if (fxaa) {
        fxaa.renderToScreen = true;
        fxaa.render(renderer, undefined, ldrTarget);
      }
    } else {
      renderer.render(scene, camera);
    }
  }

  function resize () {
    let width = defined(query.width, window.innerWidth);
    let height = defined(query.height, window.innerHeight);
    if (isIOS) height += 1;

    app.width = width;
    app.height = height;
    renderer.setSize(width, height);
    if (query.rescale) {
      const aspect = width / height;
      canvas.style.width = `100%`;
      canvas.style.height = `auto`;
      document.body.style.background = '#1d1d1d'
    }

    const rtWidth = Math.floor(width * dpr);
    const rtHeight = Math.floor(height * dpr);
    postPasses.forEach(pass => {
      if (pass.uniforms && pass.uniforms.resolution) {
        pass.uniforms.resolution.value.set(rtWidth, rtHeight);
      }
    });

    renderTargets.forEach(t => {
      t.setSize(rtWidth, rtHeight);
    });

    tick(0);
    render();
  }

  function createMouseParallax () {
    let isDown = false;
    touches(window, { filtered: true })
    .on('start', (ev) => {
      if (typeof ev.button === 'number' && ev.button !== 0) return;
      ev.preventDefault();
      isDown = true;
      angleOffsetTimeline.cancel().to(angleOffsetTween, {
        value: angleOffsetMax,
        duration: 2,
        ease: 'quadOut'
      });
    })
    .on('end', (ev) => {
      if (typeof ev.button === 'number' && ev.button !== 0) return;
      ev.preventDefault();
      isDown = false;
      angleOffsetTimeline.cancel().to(angleOffsetTween, {
        value: 0,
        duration: 2,
        ease: 'quadOut'
      });
    })
    .on('move', (ev, tmp) => {
      if (typeof ev.button === 'number' && ev.button !== 0 || !isDown) return;
      mouseTimeline.cancel().to(mouseOffset, {
        x: (tmp[0] / app.width * 2 - 1),
        y: (tmp[1] / app.height * 2 - 1),
        ease: 'expoOut',
        duration: 2
      });
    });
  }

  function createTarget (hdrType) {
    const rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
    rt.texture.minFilter = THREE.NearestFilter;
    rt.texture.magFilter = THREE.NearestFilter;
    rt.texture.generateMipmaps = false;
    rt.texture.format = hdrType ? THREE.RGBFormat : THREE.RGBAFormat;
    rt.texture.type = hdrType ? THREE.HalfFloatType : THREE.UnsignedByteType;
    return rt;
  }
}
