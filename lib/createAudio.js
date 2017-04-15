const createPlayer = require('web-audio-player');
const Reverb = require('soundbank-reverb');
const soundcloud = require('soundcloud-badge');
const isMobile = require('./util/isMobile');
const createContext = require('ios-safe-audio-context');
const average = require('analyser-frequency-average')
const smoothstep = require('smoothstep');

const urls = [
  'https://soundcloud.com/ukiyoau/kaleidoscope',
];

const AudioCtx = window.AudioContext || window.webkitAudioContext;
const isIOS = require('./util/isIOS');

module.exports = createAudio;
function createAudio (cb) {
  if (!AudioCtx || isIOS) {
    return process.nextTick(() => {
      cb(null);
    });
  }

  const audioContext = createContext();

  const analyserNode = audioContext.createAnalyser();
  const freqArray = new Uint8Array(analyserNode.frequencyBinCount);

  // If rate is not 44100, the reverb module bugs out
  const supportReverb = audioContext.sampleRate <= 96000; 
  const effectNode = createEffectNode(audioContext.destination);

  let effect = 0;

  soundcloud({
    el: document.querySelector('.soundcloud-badge'),
    client_id: 'b95f61a90da961736c03f659c03cb0cc',
    song: urls[0],
    dark: false,
    getFonts: false
  }, (err, src, meta, div) => {
    if (err) return cb(err);
    const audio = createPlayer(src, {
      loop: true,
      crossOrigin: 'Anonymous',
      context: audioContext
    });
    audio.node.connect(analyserNode);
    analyserNode.connect(effectNode);

    if (isMobile) {
      if (div.parentNode) div.parentNode.removeChild(div);
      // const parent = document.querySelector('#content');
      // parent.insertBefore(div, parent.firstChild);
      const el = document.querySelector('#content');
      const onPlay = () => {
        el.removeEventListener('touchend', onPlay);
        audio.play();
      };
      el.addEventListener('touchend', onPlay);
    } else {
      audio.play();
    }

    Object.defineProperty(audio, 'effect', {
      get: function () {
        return effect;
      },
      set: function (val) {
        effect = val;
        effectNode.wet.value = val;
        effectNode.dry.value = 1 - val;
      }
    });

    audio.frequencies = () => {
      analyserNode.getByteFrequencyData(freqArray);
      return freqArray;
    };

    audio.signal = () => {
      // find an average signal between two Hz ranges
      var minHz = 30
      var maxHz = 80
      const s = average(analyserNode, audio.frequencies(), minHz, maxHz);
      return smoothstep(0.8, 0.95, s);
    };

    cb(null, audio);
  });

  function createEffectNode (output) {
    if (supportReverb) {
      const reverb = Reverb(audioContext);
      reverb.time = 2.5; // seconds
      reverb.wet.value = 0;
      reverb.dry.value = 1;
      reverb.filterType = 'highpass';
      reverb.cutoff.value = 500; // Hz
      reverb.connect(output);
      return reverb;
    } else {
      const node = audioContext.createGain();
      const dry = audioContext.createGain();
      const wet = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();

      node.connect(dry);
      node.connect(wet);

      filter.type = 'lowpass';
      filter.frequency.value = 1000;

      dry.connect(output);
      wet.connect(filter);
      filter.connect(output);

      Object.defineProperties(node, {
        wet: { get: () => wet.gain },
        dry: { get: () => dry.gain }
      });
      node.wet.value = 0;
      node.dry.value = 1;
      return node;
    }
  }
}
