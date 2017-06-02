// This is a lot like our 'preloader' npm module
// but a bit more specific to WebGL & WebAudio.
// It does *not* import anything project-specific!

const noop = () => {};
const isImage = (ext) => /\.(jpe?g|png|gif|bmp|tga|tif)$/i.test(ext);
const isSVG = (ext) => /\.svg$/i.test(ext);

const path = require('path');
const mapLimit = require('map-limit');
const loadImage = require('load-img');
const loadTexture = require('./loadTexture');
const loadEnvMap = require('./loadEnvMap');
const loadScene = require('./loadScene');

module.exports = class AssetManager {

  constructor (opt = {}) {
    this._cache = {};
    this._queue = [];
    this._audioContext = opt.audioContext;
    this._renderer = opt.renderer;
    this._asyncLimit = 10;
    this._onProgressListeners = [];
  }

  addProgressListener (fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('onProgress must be a function');
    }
    this._onProgressListeners.push(fn);
  }

  // Add an asset to be queued, format: { url, ...options }
  queue (opt = {}) {
    if (!opt || typeof opt !== 'object') {
      throw new Error('First parameter must be an object!');
    }
    if (!opt.url) throw new TypeError('Must specify a URL or opt.url for AssetManager#queue()');
    opt = Object.assign({}, opt);
    opt.key = opt.key || opt.url;
    const queued = this._getQueued(opt.key);
    if (!queued) this._queue.push(opt);
    return opt.key;
  }

  // Fetch a loaded asset by key or URL
  get (key = '') {
    if (!key) throw new TypeError('Must specify a key or URL for AssetManager#get()');
    if (!(key in this._cache)) {
      throw new Error(`Could not find an asset by the key or URL ${key}`);
    }
    return this._cache[key];
  }

  // Loads all queued assets
  loadQueued (cb = noop) {
    const queue = this._queue.slice();
    this._queue.length = 0; // clear queue
    let count = 0;
    let total = queue.length;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[assets] Loading ${total} queued items`);
    }
    mapLimit(queue, this._asyncLimit, (item, next) => {
      this.load(item, (err, result) => {
        const percent = total <= 1 ? 1 : (count / (total - 1));
        this._onProgressListeners.forEach(fn => fn(percent));
        if (err) {
          console.error(`[assets] Skipping ${item.key} from asset loading:`);
          console.error(err);
        }
        count++;
        next(null, result);
      });
    }, cb);
  }

  // Loads a single asset on demand, returning from
  // cache if it exists otherwise adding it to the cache
  // after loading.
  load (item, cb = noop) {
    const url = item.url;
    const ext = path.extname(url);
    const key = item.key || url;
    const cache = this._cache;
    const renderer = this._renderer;

    if (key in cache) {
      const ret = cache[key];
      process.nextTick(() => cb(null, ret));
      return ret;
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[assets] Loading ${key}`);
      }
      const done = (err, data) => {
        if (err) {
          delete cache[key];
        } else {
          cache[key] = data;
        }
        if (cb) cb(err, data);
      };
      if (item.envMap) {
        const opts = Object.assign({ renderer }, item);
        return loadEnvMap(opts, done);
      } else if (isSVG(ext) || isImage(ext)) {
        let ret;
        if (item.texture !== false) {
          const opts = Object.assign({ renderer }, item);
          ret = loadTexture(url, opts, done);
        } else {
          ret = loadImage(url, item, done);
        }
        cache[key] = ret;
        return ret;
      } else if (item.scene) {
        loadScene(url, item, done);
        return;
      } else {
        throw new Error(`Could not load ${url}, unknown file extension!`);
      }
    }
  }

  _getQueued (key) {
    for (let i = 0; i < this._queue.length; i++) {
      const item = this._queue[i];
      if (item.key === key) return item;
    }
    return null;
  }
}
