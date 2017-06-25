require('babel-polyfill');
require('fastclick')(document.body);

const wcagContrast = require('wcag-contrast')
const MainScene = require('./lib/components/MainScene');
const LinearGradientBackground = require('./lib/components/LinearGradientBackground');

const { assets, renderer } = require('./lib/context');
const query = require('./lib/util/query');
const RAND = require('./lib/util/random');
const palettes = require('nice-color-palettes/500');

const isMobile = require('./lib/util/isMobile');
const createApp = require('./lib/createApp');
const createLoop = require('raf-loop');

console.log('Loading...');

const canvas = document.querySelector('#canvas');
canvas.style.visibility = 'hidden';
document.body.classList.add('hide-cursor');

renderer.domElement.style.display = 'none';
assets.loadQueued(err => {
  if (err) console.error(err);
  console.log('Finished!');
  start();
});

function start () {
  renderer.domElement.style.display = '';
  const app = createApp({
    alpha: true
  });

  // app.renderer.gammaOutput = false;

  const newColors = () => {
    const numColors = 2
    // const numColors = Math.floor(RAND.randomFloat(2, 4));
    // const colors = [ 'white', 'white', 'black' ]
    // const colors = [ 'white', 'black' ]
    const colors = RAND.shuffle(palettes[Math.floor(RAND.randomFloat(palettes.length))]).slice(0, numColors);
    colors.unshift('hsl(0, 0%, 0%)');

    const background = getBestContrast('#000', colors);
    const idx = colors.indexOf(background);
    if (idx >= 0) { // place bg at start
      colors.splice(idx, 1);
      colors.unshift(background);
    }

    // const background = colors[0];
    // const background = colors.shift();
    // const background = '#f9f9f9';

    document.body.style.background = background;
    app.renderer.setClearColor(background, 1);
    app.scene.traverse(mesh => {
      if (typeof mesh.setColors === 'function') {
        mesh.setColors(colors);
      }
    });
    app.scene.fog = new THREE.FogExp2(colors[0], 0.15);
    return colors;
  };

  let currentColors = newColors();
  const next = () => {
    RAND.nextSeed();
    currentColors = newColors();
  };
  window.addEventListener('click', next);
  window.addEventListener('keydown', ev => {
    if (ev.keyCode === 32) {
      ev.preventDefault();
      next();
    }
  });

  const components = [];
  // const grad = background;
  // const grad2 = new THREE.Color(grad).offsetHSL(0.0, 0.0, 0.2);
  // const grad2 = new THREE.Color(grad).offsetHSL(0.1, 0.75, -0.05);
  // grad2.r = Math.max(0, Math.min(1, grad2.r));
  // grad2.g = Math.max(0, Math.min(1, grad2.g));
  // grad2.b = Math.max(0, Math.min(1, grad2.b));

  // addComponent(new LinearGradientBackground({
  //   zoom: 1,
  //   smoothing: new THREE.Vector2(0, 1.5),
  //   colors: [ grad, grad ]
  //   // colors: [ colors[0], colors[1] ]
  //   // colors: colors.slice(0, 2).reverse()
  // }));
  addComponent(new MainScene(app, currentColors));
  // document.body.classList.remove('hide-cursor');
  // document.body.classList.add('grab');
  canvas.style.visibility = '';

  app.scene.traverse(mesh => {
    if (typeof mesh.onReady === 'function') {
      mesh.onReady();
    }
  });

  const skipFrames = query.skipFrames;
  let intervalTime = 0;

  // no context menu on mobile...
  if (isMobile) canvas.oncontextmenu = () => false;

  if (query.renderOnce) tick(0);
  else createLoop(tick).start();

  function addComponent (c) {
    components.push(c);
    app.scene.add(c);
    return c;
  }

  function tick (dt = 0) {
    intervalTime += dt;
    if (intervalTime > 1000 / 20) {
      intervalTime = 0;
    } else if (skipFrames) {
      return;
    }

    dt = Math.min(30, dt);
    dt /= 1000;
    components.forEach(c => {
      if (c.update) c.update(dt);
    });
    app.tick(dt);
    app.render();
  }
}

function getBestContrast (background, colors) {
  var bestContrastIdx = 0;
  var bestContrast = 0;
  colors.forEach((p, i) => {
    var ratio = wcagContrast.hex(background, p);
    if (ratio > bestContrast) {
      bestContrast = ratio;
      bestContrastIdx = i;
    }
  });
  return colors[bestContrastIdx];
}
