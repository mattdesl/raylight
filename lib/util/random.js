const defaultSeed = '40025'; //String(Math.floor(Math.random() * 100000));
let currentSeed = String(require('./query').seed || defaultSeed);
const seedRandom = require('seed-random');
const SimplexNoise = require('simplex-noise');

console.log("SEED", currentSeed);

module.exports.nextSeed = () => {
  let num = parseInt(currentSeed, 10) || 0;
  num++;
  currentSeed = String(num);
  module.exports.random = seedRandom(currentSeed);
  module.exports.simplex = new SimplexNoise(module.exports.random);
};

module.exports.random = seedRandom(currentSeed);

module.exports.randomSign = () => module.exports.random() > 0.5 ? 1 : -1;

module.exports.simplex = new SimplexNoise(module.exports.random);

module.exports.randomFloat = function (min, max) {
  if (max === undefined) {
    max = min;
    min = 0;
  }

  if (typeof min !== 'number' || typeof max !== 'number') {
    throw new TypeError('Expected all arguments to be numbers');
  }

  return module.exports.random() * (max - min) + min;
};

module.exports.randomCircle = function (out, scale) {
  scale = scale || 1.0;
  var r = module.exports.random() * 2.0 * Math.PI;
  out[0] = Math.cos(r) * scale;
  out[1] = Math.sin(r) * scale;
  return out;
};

module.exports.randomSphere = function (out, scale) {
  scale = scale || 1.0;
  var r = module.exports.random() * 2.0 * Math.PI;
  var z = (module.exports.random() * 2.0) - 1.0;
  var zScale = Math.sqrt(1.0 - z * z) * scale;
  out[0] = Math.cos(r) * zScale;
  out[1] = Math.sin(r) * zScale;
  out[2] = z * scale;
  return out;
};

module.exports.shuffle = function (arr) {
  if (!Array.isArray(arr)) {
    throw new TypeError('Expected Array, got ' + typeof arr);
  }

  var rand;
  var tmp;
  var len = arr.length;
  var ret = arr.slice();

  while (len) {
    rand = Math.floor(module.exports.random() * len--);
    tmp = ret[len];
    ret[len] = ret[rand];
    ret[rand] = tmp;
  }

  return ret;
};

module.exports.randomQuaternion = function (out) {
  const u1 = module.exports.random();
  const u2 = module.exports.random();
  const u3 = module.exports.random();

  const sq1 = Math.sqrt(1 - u1);
  const sq2 = Math.sqrt(u1);

  const theta1 = Math.PI * 2 * u2;
  const theta2 = Math.PI * 2 * u3;

  const x = Math.sin(theta1) * sq1;
  const y = Math.cos(theta1) * sq1;
  const z = Math.sin(theta2) * sq2;
  const w = Math.cos(theta2) * sq2;
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}