require('babel-polyfill');
require('fastclick')(document.body);

const FoggyScene = require('./lib/components/FoggyScene');

const { assets, renderer } = require('./lib/context');
const css = require('dom-css');
const query = require('./lib/util/query');
const isMobile = require('./lib/util/isMobile');
const createApp = require('./lib/createApp');
const createAudio = require('./lib/createAudio');
const createLoop = require('raf-loop');
const isIOS = require('./lib/util/isIOS');
const lerp = require('lerp');

const tweenr = require('tweenr');
const tunnelTimeline = tweenr();
const audioTimeline = tweenr();
const uiTimeline = tweenr();

console.log('Loading...');

const canvas = document.querySelector('#canvas');
const content = document.querySelector('#content');
content.style.visibility = 'hidden';
canvas.style.visibility = 'hidden';
document.body.classList.add('hide-cursor');

if (isIOS) {
  document.querySelector('.subheader').textContent = 'click and drag to enjoy the visuals';
}

renderer.domElement.style.display = 'none';
assets.loadQueued(err => {
  if (err) console.error(err);
  console.log('Finished!');
  createAudio((err, audio) => {
    if (err) {
      console.error(err);
    }
    start(audio);
  });
});

function start (audio) {
  renderer.domElement.style.display = '';
  document.querySelector('.info').style.display = '';
  const soundcloudDiv = document.querySelector('.soundcloud-badge')
  const app = createApp({
    alpha: true
  });

  // const background = '#f2f2f2';
  const background = 'black';
  document.body.style.background = background;
  app.renderer.setClearColor(background, 1);
  app.renderer.gammaOutput = false;

  const headerTween = { opacity: 0, y: 40 };
  const subheaderTween = { opacity: 0, y: 40 };
  const overlayTween = { opacity: 1 };
  const components = [];
  const tunnel = addComponent(new FoggyScene(app));
  document.body.classList.remove('hide-cursor');
  document.body.classList.add('grab');
  canvas.style.visibility = '';
  content.style.visibility = '';
  animateInContent();

  const touchDown = (ev) => {
    if (typeof ev.button === 'number' && ev.button !== 0) {
      return;
    }
    ev.preventDefault();
    document.body.classList.remove('grab');
    document.body.classList.add('grabbing');
    animateOutContent();
    tunnelTimeline.cancel();
    tunnelTimeline.to(app.getBloom(), {
      animation: 1,
      ease: 'quintOut',
      duration: 0.5
    });
    tunnelTimeline.to(tunnel, {
      ease: 'expoOut',
      animation: 1,
      moveSpeed: 0.5,
      duration: 0.5
    });
    if (audio) {
      audioTimeline.cancel().to(audio, {
        effect: 1,
        duration: 1,
        ease: 'quadOut'
      });
    }
  };
  const touchUp = (ev) => {
    if (typeof ev.button === 'number' && ev.button !== 0) {
      return;
    }
    animateInContent();
    ev.preventDefault();
    document.body.classList.remove('grabbing');
    document.body.classList.add('grab');
    tunnelTimeline.cancel();
    tunnelTimeline.to(app.getBloom(), {
      animation: 0,
      ease: 'quintOut',
      duration: 0.5
    });
    tunnelTimeline.to(tunnel, {
      ease: 'expoOut',
      animation: 0,
      moveSpeed: 1,
      duration: 0.5
    });
    if (audio) {
      audioTimeline.cancel().to(audio, {
        effect: 0,
        duration: 1,
        ease: 'quadOut'
      });
    }
  };
  window.addEventListener('mousedown', touchDown);
  window.addEventListener('mouseup', touchUp);
  window.addEventListener('touchstart', touchDown);
  window.addEventListener('touchend', touchUp);

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
    if (audio && !isIOS) {
      audio.update();
      tunnel.audio = audio.signal();
      tunnel.emission = lerp(0.25, 1.0, audio.amplitude());
    }
    components.forEach(c => {
      if (c.update) c.update(dt);
    });
    app.tick(dt);
    app.render();
  }

  // ugly code...
  function animateInContent () {
    // const overlay = document.querySelector('.overlay');
    const header = document.querySelector('.header');
    const subheader = document.querySelector('.subheader');
    const update = () => {
      css(header, { opacity: headerTween.opacity });
      css(subheader, { opacity: subheaderTween.opacity });
      // css(overlay, { opacity: overlayTween.opacity });
      if (soundcloudDiv) {
        css(soundcloudDiv, { opacity: subheaderTween.opacity * 1 });
      }
    };
    update();
    uiTimeline.cancel();
    uiTimeline.to(overlayTween, {
      duration: 1, opacity: 1,
      ease: 'sineOut'
    }).on('update', update);
    uiTimeline.to(headerTween, {
      duration: 6, opacity: 1,
      delay: 0.5,
      ease: 'sineOut'
    }).on('update', update);
    uiTimeline.to(subheaderTween, {
      duration: 4, opacity: 1,
      delay: 1,
      ease: 'sineOut'
    }).on('update', update);
  }

  function animateOutContent () {
    // const overlay = document.querySelector('.overlay');
    const header = document.querySelector('.header');
    const subheader = document.querySelector('.subheader');
    const update = () => {
      css(header, { opacity: headerTween.opacity });
      css(subheader, { opacity: subheaderTween.opacity });
      // css(overlay, { opacity: overlayTween.opacity });
      if (soundcloudDiv) {
        css(soundcloudDiv, { opacity: subheaderTween.opacity * 1 });
      }
    };
    update();
    uiTimeline.cancel();
    uiTimeline.to(overlayTween, {
      duration: 2, opacity: 0,
      delay: 0.25,
      ease: 'quadOut'
    }).on('update', update);
    uiTimeline.to(headerTween, {
      duration: 0.5, opacity: 0,
      ease: 'quadOut'
    }).on('update', update);
    uiTimeline.to(subheaderTween, {
      duration: 0.5, opacity: 0,
      ease: 'quadOut'
    }).on('update', update);
  }
}
console.log(window.innerWidth, window.innerHeight)