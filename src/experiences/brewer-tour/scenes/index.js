// All dimensions use the same miniature tabletop coordinate system (Y is up).
function buildScene(index, kit, parent, config) {
  const root = kit.group(parent), animated = []
  const m = (shape, color, p, s) => kit.mesh(root, shape, color, p, s)
  const green = 0x6f9a37, metal = 0xb3c3c4, copper = 0xc88145
  function tank(x, color, h = .65) {
    m('cylinder', color, [x, h / 2 + .12, -.15], [.48, h, .48])
    m('cone', color, [x, h + .19, -.15], [.51, .16, .51])
    for (const dx of [-.15, .15]) m('box', 0x44575c, [x + dx, .08, -.15], [.06, .16, .08])
    m('box', 0x344e58, [x, h * .65, .102], [.16, .12, .025])
  }
  function particles(color, count, fn) {
    for (let i = 0; i < count; i++) { const p = m('ball', color, [0, 0, 0], [.055, .055, .055]); animated.push(t => fn(p, (t * .38 + i / count) % 1, i)) }
  }
  if (index === 0) {
    for (const z of [-.40, -.05]) {
      for (const x of [-.60, -.28, .04, .36, .68]) {
        m('cylinder', 0x93603a, [x, .42, z], [.025, .84, .025])
        for (let j = 0; j < 3; j++) {
          m('ball', green, [x, .24 + j * .20, z], [.20, .22, .12])
          m('cone', 0xbed756, [x + .075, .22 + j * .20, z + .07], [.075, .12, .075])
        }
      }
      m('box', 0xbda375, [0, .86, z], [1.42, .025, .025])
    }
    m('cylinder', 0xab743c, [.30, .11, .40], [.30, .22, .30])
    m('ball', green, [.30, .23, .40], [.23, .10, .23])
  } else if (index === 1 || index === 2) {
    tank(.27, index === 1 ? metal : copper)
    if (index === 1) for (let i = 0; i < 3; i++) m('ball', 0xccad70, [-.65 + i * .20, .13, -.35], [.20, .26, .20])
    particles(index === 1 ? 0xe7c467 : 0x87b83e, 8, (p, u, i) => {
      p.position.set(-.18 + u * .48, 1.04 + Math.sin(u * Math.PI) * .20 - u * .30, -.03 + (i % 3) * .035)
    })
    particles(0xdce4db, 6, (p, u, i) => {
      p.position.set(.27 + Math.sin(i * 2 + u * 3) * .12, .91 + u * .42, -.15)
      p.scale.setScalar(.045 + u * .08)
    })
  } else if (index === 3) {
    tank(.22, metal, .88)
    m('cone', metal, [.22, .17, -.15], [.46, .25, .46]).rotation.z = Math.PI
    m('box', 0x487b76, [.52, .08, .05], [.08, .08, .48])
    m('box', 0x487b76, [.36, .08, .27], [.40, .08, .08])
    particles(0xa2dfb0, 5, (p, u, i) => { p.position.set(.22 + Math.sin(i) * .06, .40 + u * .53, .105); p.scale.setScalar(.04 + Math.sin(u * Math.PI) * .025) })
  } else {
    m('box', 0x364b50, [0, .24, .16], [1.65, .12, .35])
    for (const x of [-.65, .65]) m('box', metal, [x, .12, .16], [.09, .24, .26])
    m('box', metal, [0, .64, -.10], [.10, 1.0, .10])
    m('box', copper, [0, 1.07, .06], [.40, .12, .43])
    m('cylinder', metal, [0, .88, .16], [.055, .27, .055])
    for (let i = 0; i < 5; i++) {
      const can = kit.group(root)
      kit.mesh(can, 'cylinder', metal, [0, 0, 0], [.13, .25, .13])
      const label = kit.mesh(can, 'cylinder', config.colors.label, [0, 0, 0], [.134, .17, .134])
      // An optional authorized label texture is shared by all cans.
      if (config.canMaterial) label.material = config.canMaterial
      animated.push(t => { const u = (t * .12 + i / 5) % 1; can.position.set(-.78 + u * 1.56, .43, .16) })
    }
    const hero = kit.group(root)
    kit.mesh(hero, 'cylinder', metal, [0, 0, 0], [.23, .44, .23])
    const label = kit.mesh(hero, 'cylinder', config.colors.label, [0, 0, 0], [.234, .32, .234])
    if (config.canMaterial) label.material = config.canMaterial
    animated.push(t => { hero.visible = t >= 7; hero.position.set(.56, .80 + Math.sin(t * 2) * .045, .28); hero.rotation.y = t; hero.scale.setScalar(Math.min(1, Math.max(0, (t - 7) * 2))) })
  }
  return {root, update(t) { animated.forEach(fn => fn(t)) }}
}
module.exports = {buildScene}
