const {createKit} = require('./geometry')
const {BrewerCharacter} = require('./BrewerCharacter')
const {buildScene} = require('./scenes')
const {TourState} = require('./TourState')
const defaults = require('./config')

function registerBrewerTour(AFRAME) {
  if (AFRAME.components['brewer-tour']) return
  AFRAME.registerComponent('brewer-tour', {
    schema: {tracked: {default: false}},
    init() {
      const T = AFRAME.THREE
      this.config = {...defaults, ...(this.el.brewerConfig || {})}
      this.game = new TourState(); this.kit = createKit(T)
      this.root = new T.Group(); this.el.setObject3D('brewer-tour', this.root)
      // Tilt the tabletop toward the viewer so the brewer's face stays readable.
      this.root.rotation.x = .5; this.root.scale.setScalar(.80)
      this.kit.mesh(this.root, 'cylinder', 0x58783f, [0, -.055, 0], [1.95, .11, 1.55])
      if (this.config.labelTexture) {
        this.texture = new T.TextureLoader().load(this.config.labelTexture)
        this.texture.colorSpace = T.SRGBColorSpace
        this.canMaterial = new T.MeshStandardMaterial({map: this.texture, roughness: .7})
        this.config.canMaterial = this.canMaterial
      }
      this.scenes = Array.from({length: 5}, (_, i) => buildScene(i, this.kit, this.root, this.config))
      this.character = new BrewerCharacter(this.kit, this.root, this.config)
      this.character.root.position.set(-.43, 0, .33)
      this.panel = document.querySelector('#brewer-panel')
      this.button = this.panel.querySelector('button')
      this.onNext = () => {
        const old = this.game.step
        if (this.game.state === 'COMPLETE' ? this.game.replay() : this.game.next()) this.previous = old
        this.render()
      }
      this.button.addEventListener('click', this.onNext)
      this.render()
    },
    update() { if (this.game) { this.game.tracked = this.data.tracked; this.render() } },
    render() {
      const s = this.game
      this.root.visible = s.tracked
      this.panel.hidden = !s.tracked
      this.panel.querySelector('.tour-step').textContent = s.state === 'COMPLETE' ? 'CHEERS!' : `STEP ${s.step + 1} / 5`
      this.panel.querySelector('h2').textContent = s.state === 'COMPLETE' ? this.config.beerName : this.config.steps[s.step][0]
      this.panel.querySelector('.tour-copy').textContent = this.config.steps[s.step][1]
      this.button.textContent = s.state === 'COMPLETE' ? 'REPLAY' : s.step === 4 ? 'CANNING…' : s.time < 8 ? `WATCH · ${Math.ceil(8 - s.time)}s` : 'NEXT'
      this.button.disabled = !s.tracked || s.transition > 0 || (s.state !== 'COMPLETE' && (s.time < 8 || s.step === 4))
      const progress = 1 - s.transition
      this.scenes.forEach((scene, i) => {
        const incoming = i === s.step, outgoing = s.transition > 0 && i === this.previous
        scene.root.visible = incoming || outgoing
        scene.root.scale.y = incoming ? Math.max(.001, s.transition ? progress : 1) : Math.max(.001, 1 - progress)
        scene.root.position.y = incoming ? -s.transition * .22 : -progress * .22
      })
    },
    tick(time, delta) {
      if (!this.game.tracked) return
      this.game.tick(Math.min(delta / 1000, .1))
      this.scenes[this.game.step].update(this.game.time)
      const mode = this.game.state === 'COMPLETE' ? 'celebrate' : this.game.transition ? 'walk' : ['pick', 'pour', 'throw', 'inspect', 'idle'][this.game.step]
      this.character.animate(mode, this.game.time)
      this.render()
    },
    remove() { this.button?.removeEventListener('click', this.onNext); this.panel.hidden = true; this.el.removeObject3D('brewer-tour'); this.kit.dispose(); this.texture?.dispose(); this.canMaterial?.dispose() },
  })
}
module.exports = {registerBrewerTour}
