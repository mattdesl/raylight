require('babel-polyfill');
require('fastclick')(document.body);

const MainScene = require('./lib/components/MainScene');
const createBackground = require('three-vignette-background');

const { assets, renderer } = require('./lib/context');
const query = require('./lib/util/query');
const { randomFloat, shuffle } = require('./lib/util/random');
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

  const colors = [ 'white', 'black' ]
  // const colors = shuffle(palettes[Math.floor(randomFloat(palettes.length))]).slice(0, 2);
  // const background = colors[0];
  const background = colors.shift();
  // const background = '#f9f9f9';

  document.body.style.background = background;
  app.renderer.setClearColor(background, 1);
  app.renderer.gammaOutput = false;
  app.scene.fog = new THREE.FogExp2('white', 0.1);

  const components = [];
  addComponent(createBackground({
    noiseAlpha: 0.0,
    // grainScale: 1 / window.innerWidth,
    scale: new THREE.Vector2(1, 1).multiplyScalar(3),
    colors: [ background, new THREE.Color(background).offsetHSL(0, 0.25, -0.25).getStyle() ]
  }));
  addComponent(new MainScene(app, colors));
  document.body.classList.remove('hide-cursor');
  document.body.classList.add('grab');
  canvas.style.visibility = '';

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
