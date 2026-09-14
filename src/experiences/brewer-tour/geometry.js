// Shared low-poly geometry/materials keep the scene small and easy to dispose.
function createKit(T) {
  const geometries = new Map(), materials = new Map()
  function mesh(parent, shape, color, pos = [0, 0, 0], size = [1, 1, 1]) {
    if (!geometries.has(shape)) geometries.set(shape, shape === 'box' ? new T.BoxGeometry(1, 1, 1) :
      shape === 'cone' ? new T.ConeGeometry(.5, 1, 7) : shape === 'ball' ? new T.IcosahedronGeometry(.5, 0) : new T.CylinderGeometry(.5, .5, 1, 10))
    if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({color, roughness: .85, flatShading: true}))
    const m = new T.Mesh(geometries.get(shape), materials.get(color))
    m.position.set(...pos); m.scale.set(...size); parent.add(m); return m
  }
  return {mesh, group(parent) { const g = new T.Group(); parent.add(g); return g },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()) }}
}
module.exports = {createKit}
