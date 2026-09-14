class BrewerCharacter {
  constructor(kit, parent, config) {
    this.root = kit.group(parent)
    const m = (shape, color, p, s) => kit.mesh(this.root, shape, color, p, s)
    const c = config.colors
    // Broad silhouette, long hair, full beard and baseball cap from the reference.
    m('box', c.shirt, [0, .39, 0], [.24, .30, .15])
    m('box', 0x243643, [-.066, .13, 0], [.10, .26, .12])
    m('box', 0x243643, [.066, .13, 0], [.10, .26, .12])
    m('box', 0x30291f, [-.066, .025, .025], [.12, .05, .18])
    m('box', 0x30291f, [.066, .025, .025], [.12, .05, .18])
    m('ball', c.hair, [0, .61, -.025], [.32, .35, .24])
    m('box', c.hair, [-.12, .50, -.025], [.075, .27, .14])
    m('box', c.hair, [.12, .50, -.025], [.075, .27, .14])
    m('ball', c.skin, [0, .635, .035], [.26, .27, .23])
    m('ball', c.beard, [0, .55, .10], [.27, .24, .17])
    m('ball', c.skin, [0, .635, .16], [.06, .06, .06])
    m('box', 0x211913, [-.05, .675, .142], [.025, .022, .016])
    m('box', 0x211913, [.05, .675, .142], [.025, .022, .016])
    m('ball', c.cap, [0, .765, .02], [.33, .16, .28])
    m('box', c.cap, [0, .733, .13], [.30, .025, .14])
    this.arms = [-1, 1].map(sign => {
      const arm = kit.group(this.root); arm.position.set(sign * .16, .49, 0)
      kit.mesh(arm, 'box', c.shirt, [0, -.07, 0], [.085, .15, .11])
      kit.mesh(arm, 'box', c.skin, [0, -.18, 0], [.07, .13, .085]); return arm
    })
    this.sack = kit.mesh(this.arms[1], 'ball', 0xd4b279, [0, -.29, .03], [.20, .26, .18])
    this.hop = kit.mesh(this.arms[1], 'cone', 0x9fbe43, [0, -.27, .03], [.10, .14, .10])
  }
  animate(mode, t) {
    this.sack.visible = mode === 'pour'
    this.hop.visible = mode === 'pick' || mode === 'throw'
    this.root.position.y = .015 * Math.sin(t * 3)
    this.arms.forEach(a => { a.rotation.set(0, 0, 0) })
    const wave = Math.sin(t * 2.5)
    if (mode === 'walk') this.arms.forEach((a, i) => { a.rotation.x = Math.sin(t * 6 + i * Math.PI) * .7 })
    if (mode === 'pick' || mode === 'inspect') this.arms[1].rotation.x = -1.3 + wave * .35
    if (mode === 'pour') this.arms.forEach(a => { a.rotation.x = -1.8 + wave * .12 })
    if (mode === 'throw') this.arms[1].rotation.x = -1.3 - Math.sin(t * 3) * 1.1
    if (mode === 'celebrate') this.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * (2.3 + wave * .15) })
  }
}
module.exports = {BrewerCharacter}
