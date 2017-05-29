import loadJSON from 'load-json-xhr';

const log = false; // debugging

function isMatch (name, pattern) {
  if (pattern instanceof RegExp && pattern.test(name)) {
    return true;
  } else if (pattern === name) {
    return true;
  }
  return false;
}

function findObject (parent, name) {
  const children = parent.children;
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (isMatch(child.name, name)) {
        return child;
      }
      const result = findObject(child, name);
      if (result) return result;
    }
  }
  return null;
}

function findObjects (parent, name, output) {
  if (!output) output = [];
  const children = parent.children;
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (isMatch(child.name, name)) {
        output.push(child);
      }
      findObject(child, name, output);
    }
  }
  return output;
}

module.exports = function (url, opt = {}, cb) {
  const uuidMap = {};
  const tmpMat = new THREE.Matrix4();
  const hidden = [].concat(opt.hidden).filter(Boolean);

  loadJSON(url, (err, data) => {
    if (err) return cb(err);
    const geometries = data.geometries.map(parseGeometry);
    const object = parseChildren(null, data.object);

    const result = {
      geometries,
      object,
      getNames: () => getNames(object),
      findObject: (search) => findObject(object, search),
      findObjects: (search) => findObjects(object, search)
    };
    cb(null, result);
  });

  function construct (obj) {
    const type = obj.type;
    if (/Camera$/i.test(type)) {
      if (type === 'PerspectiveCamera') {
        return new THREE.PerspectiveCamera(obj.fov, obj.aspect, obj.near, obj.far);
      } else if (obj.type === 'OrthographicCamera') {
        return new THREE.OrthographicCamera(obj.left, obj.right, obj.top, obj.bottom, obj.near, obj.far);
      } else {
        throw new Error(`Invalid camera type ${type}`);
      }
    } else if (type === 'Scene') {
      // we don't want to use a real THREE.Scene since it
      // cause some issues when we try to add its children
      // to a different scene
      return new THREE.Object3D();
    } else if (type === 'Mesh') {
      let geometry;
      if (typeof obj.geometry === 'string') {
        geometry = uuidMap[obj.geometry];
        if (!geometry || (!geometry.isBufferGeometry && !geometry.isGeometry)) {
          throw new Error(`Can't find the geometry UUID for ${obj.name}`);
        }
      }
      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = obj.castShadow;
      mesh.receiveShadow = obj.receiveShadow;
      return mesh;
    } else if (type === 'Object') {
      return new THREE.Object3D();
    } else if (/Light$/.test(type)) {
      var color = obj.color;
      var intensity = obj.intensity;
      var distance = obj.distance;
      var decay = obj.decayExponent;

      let light;
      switch (type) {
        case 'AmbientLight':
          return new THREE.AmbientLight(color);
        case 'PointLight':
          return new THREE.PointLight(color, intensity, distance, decay);
        case 'DirectionalLight':
          return new THREE.DirectionalLight(color, intensity);
        case 'SpotLight':
          light = new THREE.SpotLight(color, intensity, distance);
          light.angle = obj.angle;
          return light;
        case 'HemisphereLight':
          light = new THREE.DirectionalLight(color, intensity, distance);
          return light;
        default:
          throw new Error(`Invalid light type ${type}`);
      }
    } else if (type === 'Curve') {
      const curve = new THREE.Object3D();
      curve.isCurve = true;
      const knots = [];
      const degree = 3;
      const points = obj.points.map(a => new THREE.Vector4().fromArray(a));
      knots.push(0, 0, 0, 0);
      const k = points.length + degree;
      const midPoints = points.length - (degree + 1);
      for (let i = 0; i < midPoints; i++) {
        const n = (i + 4) / k;
        knots.push(n);
      }
      knots.push(1, 1, 1, 1);
      curve.nurbs = new THREE.NURBSCurve(degree, knots, points);
      return curve;
    } else {
      throw new Error(`Invalid type ${type}`);
    }
  }

  function parseGeometry (obj) {
    if (log) console.log('[WebGLParser] Creating Geometry %s %s', obj.type, obj.name);
    if (obj.type === 'BufferGeometry') {
      const geometry = new THREE.BufferGeometry();
      geometry.uuid = obj.uuid;
      geometry.name = obj.name;

      let geometryData = obj.data;
      if (opt.modifiers) {
        const modifiers = opt.modifiers.filter(mod => {
          if (typeof mod.pattern === 'undefined') return true;
          if (isMatch(obj.name, mod.pattern)) {
            return true;
          }
          return false;
        });
        modifiers.forEach(mod => {
          geometryData = mod.map(obj.name, geometryData);
        });
      }

      if (geometryData.index) {
        geometry.setIndex(createAttrib(geometryData.index));
      }
      const attribs = geometryData.attributes;
      if (attribs) {
        Object.keys(attribs).map(k => {
          const attrib = createAttrib(attribs[k]);
          geometry.addAttribute(k, attrib);
        });
      }
      uuidMap[geometry.uuid] = geometry;
      return geometry;
    } else {
      throw new Error(`Unsupported Type ${obj.type}`);
    }
  }

  function createAttrib (obj) {
    const ArrayType = dtype(obj.type);
    return new THREE.BufferAttribute(new ArrayType(obj.array), obj.itemSize);
  }

  function dtype (str) {
    switch (str) {
      case 'Int8Array':
        return Int8Array;
      case 'Int16Array':
        return Int16Array;
      case 'Int32Array':
        return Int32Array;
      case 'Uint8Array':
        return Uint8Array;
      case 'Uint16Array':
        return Uint16Array;
      case 'Uint32Array':
        return Uint32Array;
      case 'Float32Array':
        return Float32Array;
      case 'Float64Array':
        return Float64Array;
      case 'Array':
        return Array;
      case 'Uint8ClampedArray':
        return Uint8ClampedArray;
      default:
        throw new Error(`Invalid array type ${str}`);
    }
  }

  function parseChildren (parent, data) {
    const id = data.uuid;
    if (id in uuidMap) {
      const cached = uuidMap[id];
      if (!cached.isObject3D) {
        throw new Error(`Cached object ${cached.name} has a duplicate UUID!`);
      }
      return cached;
    }

    if (!parent && data.type !== 'Scene') {
      throw new Error(`Expected Scene as root element, got '${data.name}' of type ${data.type} instead`);
    }

    const name = data.name || (data.type === 'Scene' ? 'root' : undefined);
    if (log) console.log('[WebGLParser] Constructing %s %s', data.type, name);
    const object = construct(data);
    object.visible = data.visible !== false;
    const isHidden = hidden.some(test => {
      return isMatch(name, test);
    });
    if (isHidden) object.visible = false;
    object.name = name;
    object.uuid = data.uuid;
    if (Array.isArray(data.matrix)) {
      tmpMat.fromArray(data.matrix);
      object.applyMatrix(tmpMat);
      object.updateMatrixWorld(true);
    }
    if (parent) {
      parent.add(object);
    }
    uuidMap[id] = object;
    if (data.children) {
      data.children.forEach(child => {
        parseChildren(object, child);
      });
    }
    return object;
  }

  function getNames (parent) {
    const names = [];
    parent.traverse(t => names.push(t.name));
    return names;
  }
}
