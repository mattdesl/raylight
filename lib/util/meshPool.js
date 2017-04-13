const newArray = require('new-array');
const { randomFloat } = require('../util/random');
const defined = require('defined');

module.exports = function (opt = {}) {
  let geometries = defined(opt.geometries, []);
  const count = defined(opt.count, 10);
  const baseMaterial = defined(opt.baseMaterial, new THREE.MeshBasicMaterial({ color: 'white' }));
  geometries = Array.isArray(geometries) ? geometries : [ geometries ];

  const meshes = newArray(count).map(() => {
    const geometry = geometries[Math.floor(randomFloat(0, geometries.length))];
    const material = Array.isArray(baseMaterial)
      ? baseMaterial.map(m => m.clone())
      : baseMaterial.clone();
    
    const mesh = opt.createMesh ? opt.createMesh(geometry, material) : new THREE.Mesh(geometry, material);
    mesh.visible = false;
    mesh.active = false;
    return mesh;
  });

  return {
    meshes,
    next () {
      const mesh = meshes.find(m => !m.active);
      if (mesh) {
        mesh.visible = true;
        mesh.active = true;
      }
      return mesh;
    },
    free (mesh) {
      if (!mesh) return;
      mesh.active = false;
      mesh.visible = false;
    }
  };
};
