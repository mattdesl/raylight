require('babel-polyfill');
require('fastclick')(document.body);

const MainScene = require('./lib/components/MainScene');

const { assets, renderer } = require('./lib/context');
const query = require('./lib/util/query');
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

  // const background = '#f2f2f2';
  const background = '#fff';
  document.body.style.background = background;
  app.renderer.setClearColor(background, 1);
  app.renderer.gammaOutput = false;

  const components = [];
  addComponent(new MainScene(app));
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
