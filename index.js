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
const clamp = require('clamp');

const tweenr = require('tweenr');
const tunnelTimeline = tweenr();
const audioTimeline = tweenr();
const uiTimeline = tweenr();
const fadeTimeline = tweenr();

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

  let mouseTimer = null;
  let isTouchDown = false;
  document.body.classList.remove('hide-cursor');
  const hideCursor = () => {
    if (isTouchDown) return;
    document.body.classList.remove('grab');
    document.body.classList.add('hide-cursor');
  };
  const resetHideCursorTimer = () => {
    if (mouseTimer) clearTimeout(mouseTimer);
    mouseTimer = setTimeout(hideCursor, 1000);
  };
  const resetCursor = () => {
    document.body.classList.remove('hide-cursor');
    document.body.classList.add('grab');
  };
  window.addEventListener('mousemove', () => {
    resetHideCursorTimer();
    resetCursor();
  });
  hideCursor();

  canvas.style.visibility = '';
  content.style.visibility = '';
  animateInContent();

  const touchDown = (ev) => {
    if (typeof ev.button === 'number' && ev.button !== 0) {
      return;
    }
    isTouchDown = true;
    ev.preventDefault();
    resetCursor();
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
        highpass: 1,
        duration: 1,
        ease: 'quadOut'
      });
    }
  };

  const touchUp = (ev) => {
    if (typeof ev.button === 'number' && ev.button !== 0) {
      return;
    }
    isTouchDown = false;
    resetHideCursorTimer();
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
        highpass: 0,
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
  let midiEmission = 1;
  let time = 0;
  let hasHitFirstNote = false;
  let lowEnd = 0.25;
  let highEnd = 0.5;
  let slowFadeIn = { value: 0 };
  fadeTimeline.to(slowFadeIn, { duration: 10, value: 1 })
    .on('update', () => {
      audio.highpass = 1 - slowFadeIn.value;
      // audio.lowpass = 1 - slowFadeIn.value;
      // app.camera.fov = lerp(120, 65, slowFadeIn.value);
    });

  // no context menu on mobile...
  if (isMobile) canvas.oncontextmenu = () => false;

  if (query.renderOnce) tick(0);
  else createLoop(tick).start();

  // request MIDI access
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({
      sysex: false // this defaults to 'false' and we won't be covering sysex in this article. 
    }).then(midi => {
      const inputs = midi.inputs.values();
      console.log('MIDI Inputs:', midi.inputs.size);
      // loop over all available inputs and listen for any MIDI input
      for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        // each time there is a midi message call the onMIDIMessage function
        input.value.onmidimessage = (message) => {
          const data = message.data;
          if (!data || data.length !== 3) return;
          const id = data[1];
          const value = clamp(data[2] / 127, 0, 1);
          onMIDI(id, value);
        };
      }
    }, err => {
      console.warn(err);
    });
  } else {
    console.log('No MIDI supported.');
  }

  function onMIDI (id, value) {
    // console.log(`Hit MIDI ${id}`);
    if (id >= 48) {
      // tunnel.toggleIdle(id - 48);
      return;
    }
    switch (id) {
      case 1:
        if (audio) audio.highpass = value;
        break;
      case 2:
        if (audio) audio.highpassCutoff = lerp(10, 7000, value);
        break;
      case 3:
        if (audio) audio.lowpass = value;
        break;
      case 4:
        if (audio) audio.lowpassCutoff = lerp(500, 20000, value);
        break;
      case 5:
        tunnel.moveSpeed = lerp(0, 4, value);
        break;
      case 6:
        midiEmission = lerp(0, 4, value);
        break;
      case 7:
        app.getBloom().animation = value;
        break;
      case 8:
        app.camera.fov = lerp(40, 120, value);
        break;
    }
  }

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
    time += dt;
    tunnel.emission = 1;
    if (audio && !isIOS) {
      audio.update();
      tunnel.audio = audio.signal();
      tunnel.emission = lerp(lowEnd, highEnd, audio.amplitude());
      const audioTime = audio.time();
      if (audioTime >= 22.422 && !hasHitFirstNote) {
        hasHitFirstNote = true;
        lowEnd = 0.5;
        highEnd = 1;
      }
    }
    tunnel.emission *= midiEmission * slowFadeIn.value;
    components.forEach(c => {
      if (c.update) c.update(dt);
    });
    app.tick(dt);
    app.render();
  }

  // ugly code...
  function animateInContent () {
    const header = document.querySelector('.header');
    const subheader = document.querySelector('.subheader');
    const update = () => {
      css(header, { opacity: headerTween.opacity });
      css(subheader, { opacity: subheaderTween.opacity });
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
    const header = document.querySelector('.header');
    const subheader = document.querySelector('.subheader');
    const update = () => {
      css(header, { opacity: headerTween.opacity });
      css(subheader, { opacity: subheaderTween.opacity });
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

  // midi functions
  function onMIDISuccess(midiAccess) {
    // when we get a succesful response, run this code
    console.log('MIDI Access Object', midiAccess);
  }

  function onMIDIFailure(e) {
    // when we get a failed response, run this code
    console.log("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim " + e);
  }
}
