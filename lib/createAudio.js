const createPlayer = require('web-audio-player');
const Reverb = require('soundbank-reverb');
const soundcloud = require('soundcloud-badge');
const isMobile = require('./util/isMobile');
const createContext = require('ios-safe-audio-context');
const average = require('analyser-frequency-average')
const smoothstep = require('smoothstep');
const CircularBuffer = require('circular-buffer');
// const { Omnitone } = require('omnitone')

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
  const tmpMat = new THREE.Matrix4();

  const analyserNode = audioContext.createAnalyser();
  const freqArray = new Uint8Array(analyserNode.frequencyBinCount);

  // If rate is not 44100, the reverb module bugs out
  const supportReverb = audioContext.sampleRate <= 96000; 
  let ampBuffer = new CircularBuffer(4); // N samples

  process.nextTick(() => {
    const src = 'assets/audio/Ukiyo-Kaleidoscope.mp3';
    create(src, cb);
  })
  // soundcloud({
  //   el: document.querySelector('.soundcloud-badge'),
  //   client_id: 'b95f61a90da961736c03f659c03cb0cc',
  //   song: urls[0],
  //   dark: false,
  //   getFonts: false
  // }, (err, src, meta, div) => {
  //   if (err) return cb(err);
  //   if (div.parentNode) div.parentNode.removeChild(div);
  //   create(src, cb);
  // });

  function create (src, cb) {
    const audio = createPlayer(src, {
      loop: true,
      volume: 0.5,
      crossOrigin: 'Anonymous',
      context: audioContext
    });
    if (isMobile) {
      const el = document.querySelector('#content');
      const onPlay = () => {
        el.removeEventListener('touchend', onPlay);
        audio.play();
      };
      el.addEventListener('touchend', onPlay);
    } else {
      audio.play();
    }

    audio.update = () => {
      analyserNode.getByteFrequencyData(freqArray);
      return freqArray;
    };

    audio.signal = () => {
      // find an average signal between two Hz ranges
      var minHz = 30;
      var maxHz = 80;
      const s = average(analyserNode, freqArray, minHz, maxHz);
      return smoothstep(0.8, 0.95, s);
    };

    audio.amplitude = () => {
      // find an average signal between two Hz ranges
      var minHz = 100;
      var maxHz = 8000;
      let s = average(analyserNode, freqArray, minHz, maxHz);
      s = smoothstep(0.2, 0.6, s);
      ampBuffer.enq(s);
      const len = ampBuffer.size();
      let avg = 0;
      for (let i = 0; i < len; i++) {
        avg += ampBuffer.get(i);
      }
      avg /= len;
      return avg;
    };

    let highpassCutoff = 500;
    let lowpassCutoff = 1000;
    const highpass = createEffectNode(analyserNode, 'highpass', highpassCutoff);
    const lowpass = createEffectNode(highpass, 'lowpass', lowpassCutoff);
    audio.node.connect(lowpass);
    analyserNode.connect(audioContext.destination);

    let highpassValue = 0;
    let lowpassValue = 0;
    Object.defineProperties(audio, {
      highpass: {
        get: function () {
          return highpassValue;
        },
        set: function (val) {
          highpassValue = val;
          highpass.wet.value = val;
          highpass.dry.value = 1 - val;
        }
      },
      highpassCutoff: {
        get: function () {
          return highpassCutoff;
        },
        set: function (val) {
          highpassCutoff = val;
          if (supportReverb) highpass.cutoff.value = val;
        }
      },
      lowpass: {
        get: function () {
          return lowpassValue;
        },
        set: function (val) {
          lowpassValue = val;
          lowpass.wet.value = val;
          lowpass.dry.value = 1 - val;
        }
      },
      lowpassCutoff: {
        get: function () {
          return lowpassCutoff;
        },
        set: function (val) {
          lowpassCutoff = val;
          if (supportReverb) lowpass.cutoff.value = val;
        }
      }
    });

    cb(null, audio);
  }

  function createEffectNode (output, type = 'highpass', cutoff = 500) {
    if (supportReverb) {
      const reverb = Reverb(audioContext);
      reverb.time = 2.5; // seconds
      reverb.wet.value = 0;
      reverb.dry.value = 1;
      reverb.filterType = type;
      reverb.cutoff.value = cutoff; // Hz
      reverb.connect(output);
      return reverb;
    } else {
      const node = audioContext.createGain();
      const dry = audioContext.createGain();
      const wet = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();

      node.connect(dry);
      node.connect(wet);

      filter.type = type;
      filter.frequency.value = cutoff;

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
