// Simulation is independent of DOM/XR so pause, replay and collisions are testable.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
class PumpkinGame {
  constructor() { this.tracked = false; this.reset() }
  reset() {
    this.state = this.tracked ? 'owlEntrance' : 'waiting'
    this.resumeState = 'owlEntrance'
    this.score = 0; this.lives = 3; this.wave = 1
    this.elapsed = 0; this.playTime = 0; this.fire = 0
    this.x = 0; this.aim = 0; this.shots = []; this.effects = []
    this.spawnWave()
  }
  spawnWave() {
    this.offset = 0; this.drop = 0; this.direction = 1
    this.pumpkins = Array.from({length: 15}, (_, i) => ({
      id: i, x: (i % 5 - 2) * 0.31, y: 0.65 + Math.floor(i / 5) * 0.30,
    }))
  }
  track(found) {
    this.tracked = found
    if (!found && ['playing', 'owlEntrance'].includes(this.state)) {
      this.resumeState = this.state; this.state = 'paused'
    } else if (found && this.state === 'paused') this.state = this.resumeState
    else if (found && this.state === 'waiting') this.state = 'owlEntrance'
  }
  step(dt) {
    if (!['owlEntrance', 'playing'].includes(this.state)) return
    dt = clamp(dt || 0, 0, 0.05) // No catch-up burst after a suspended frame.
    this.elapsed += dt
    if (this.state === 'owlEntrance') {
      if (this.elapsed >= 2.4) this.state = 'playing'
      return
    }
    this.playTime += dt
    this.x += (clamp(this.aim, -0.94, 0.94) - this.x) * (1 - Math.exp(-14 * dt))
    this.offset += this.direction * Math.min(0.8, 0.19 + this.wave * 0.035) * dt
    if (Math.abs(this.offset) >= 0.36) {
      this.offset = clamp(this.offset, -0.36, 0.36)
      this.direction *= -1; this.drop += 0.13
    }
    this.fire += dt
    if (this.fire >= 0.45) {
      this.fire %= 0.45
      if (this.shots.length < 12) this.shots.push({x: this.x, y: -0.53})
    }
    for (const shot of this.shots) {
      const oldY = shot.y
      shot.y += 2.4 * dt
      const hit = this.pumpkins.find(p => Math.abs(shot.x - p.x - this.offset) < 0.12 &&
        oldY <= p.y - this.drop + 0.13 && shot.y >= p.y - this.drop - 0.13)
      if (hit) {
        this.pumpkins = this.pumpkins.filter(p => p !== hit)
        this.score += 100; shot.y = 9
        if (this.effects.length < 15) this.effects.push({x: hit.x + this.offset, y: hit.y - this.drop, age: 0})
      }
    }
    this.shots = this.shots.filter(s => s.y < 1.65)
    this.effects.forEach(e => { e.age += dt })
    this.effects = this.effects.filter(e => e.age < 0.35)
    // One breach costs one life; reposition survivors to prevent a whole row
    // draining all lives during the same frame.
    if (this.pumpkins.some(p => p.y - this.drop <= -0.40)) {
      this.lives--; this.shots = []; this.effects = []; this.drop = 0
      if (!this.lives) this.state = 'gameOver'
    } else if (!this.pumpkins.length) {
      this.wave++; this.shots = []; this.spawnWave()
    }
  }
}

function registerPumpkinGame(AFRAME) {
  if (AFRAME.components['pumpkin-game']) return
  const T = AFRAME.THREE
  AFRAME.registerComponent('pumpkin-game', {
    schema: {tracked: {default: false}},
    init() {
      try { this.setup() } catch (error) { this.fail(error) }
    },
    fail(error) {
      this.broken = true
      this.el.emit('game-error', {message: error.message})
    },
    setup() {
      this.game = new PumpkinGame()
      this.game.track(this.data.tracked)
      this.owl = this.el.querySelector('#owl')
      this.root = new T.Group()
      this.el.setObject3D('pumpkin-arena', this.root)
      this.resources = []
      const keep = r => { this.resources.push(r); return r }
      const body = keep(new T.SphereGeometry(0.115, 10, 7))
      const stem = keep(new T.CylinderGeometry(0.018, 0.026, 0.065, 5))
      const eye = keep(new T.ConeGeometry(0.027, 0.045, 3))
      const orange = keep(new T.MeshStandardMaterial({color: '#ff771a', roughness: 0.8}))
      const green = keep(new T.MeshStandardMaterial({color: '#568729'}))
      const dark = keep(new T.MeshBasicMaterial({color: '#241126'}))
      const gold = keep(new T.MeshBasicMaterial({color: '#fff19b'}))
      const sparks = keep(new T.MeshBasicMaterial({color: '#ffb342', wireframe: true}))
      this.enemies = Array.from({length: 15}, () => {
        const group = new T.Group()
        const mesh = new T.Mesh(body, orange); mesh.scale.set(1, 0.86, 0.85); group.add(mesh)
        const stalk = new T.Mesh(stem, green); stalk.position.y = 0.12; stalk.rotation.z = -0.2; group.add(stalk)
        for (const x of [-0.043, 0.043]) {
          const face = new T.Mesh(eye, dark); face.position.set(x, 0.018, 0.093); group.add(face)
        }
        const mouth = new T.Mesh(eye, dark); mouth.position.set(0, -0.045, 0.099); mouth.rotation.z = Math.PI; group.add(mouth)
        this.root.add(group); return group
      })
      const feather = keep(new T.SphereGeometry(1, 6, 4))
      this.bullets = Array.from({length: 12}, () => {
        const m = new T.Mesh(feather, gold); m.scale.set(0.021, 0.070, 0.016); this.root.add(m); return m
      })
      this.pops = Array.from({length: 15}, () => {
        const m = new T.Mesh(body, sparks); this.root.add(m); return m
      })
      this.onModel = ({detail}) => {
        try {
          if (this.mixer) { this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.model) }
          this.model = detail.model
          const clip = this.model.animations.find(c => c.name === 'Fly')
          if (!clip) throw new Error('owl.glb is missing its Fly animation.')
          this.mixer = new T.AnimationMixer(this.model)
          this.mixer.clipAction(clip).setLoop(T.LoopRepeat, Infinity).play()
        } catch (error) { this.fail(error) }
      }
      this.owl.addEventListener('model-loaded', this.onModel)
      const loaded = this.owl.getObject3D('mesh')
      if (loaded) this.onModel({detail: {model: loaded}})
      this.replay = () => {
        this.game.reset(); this.pointer = null
        if (this.mixer) this.mixer.setTime(0)
        this.render()
      }
      this.replayButton = document.querySelector('#play-again')
      this.replayButton.addEventListener('click', this.replay)
      // Relative screen drag maps to local arena X, independent of world pose.
      // It works anywhere on the view and never teleports on initial touch.
      this.down = e => {
        if (e.target.closest?.('button, a') || this.game.state !== 'playing' || this.pointer != null) return
        this.pointer = e.pointerId; this.lastX = e.clientX
        e.preventDefault()
      }
      this.move = e => {
        if (e.pointerId !== this.pointer || this.game.state !== 'playing') return
        this.game.aim = clamp(this.game.aim + (e.clientX - this.lastX) / Math.max(1, window.innerWidth) * 2.4, -0.94, 0.94)
        this.lastX = e.clientX; e.preventDefault()
      }
      this.up = e => { if (e.pointerId === this.pointer) this.pointer = null }
      window.addEventListener('pointerdown', this.down, {passive: false})
      window.addEventListener('pointermove', this.move, {passive: false})
      window.addEventListener('pointerup', this.up)
      window.addEventListener('pointercancel', this.up)
      this.scoreEl = document.querySelector('#score')
      this.livesEl = document.querySelector('#lives')
      this.waveEl = document.querySelector('#wave')
      this.notice = document.querySelector('#game-notice')
      this.over = document.querySelector('#game-over')
      this.finalScore = document.querySelector('#final-score')
      this.render()
    },
    update() {
      if (!this.game) return
      this.game.track(this.data.tracked)
      if (!this.data.tracked) this.pointer = null
      this.render()
    },
    tick(time, delta) {
      if (this.broken || !this.mixer || !this.game) return
      try {
        const active = ['owlEntrance', 'playing'].includes(this.game.state)
        if (active) {
          this.game.step(delta / 1000)
          this.mixer.update(clamp(delta / 1000, 0, 0.05))
          this.render()
        }
      } catch (error) { this.fail(error) }
    },
    render() {
      if (!this.scoreEl) return
      const g = this.game
      const p = clamp(g.elapsed / 2.4, 0, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      this.owl.object3D.position.set(g.x, -0.65 * ease, 0.16 * ease)
      this.owl.object3D.scale.setScalar(0.13 * (0.15 + 0.85 * ease))
      // Model faces +Z by default. Tilt its forward axis toward the invaders.
      this.owl.object3D.rotation.x = -0.75 * ease
      this.owl.object3D.visible = g.state !== 'waiting'
      const showEnemies = g.elapsed >= 2.4
      this.enemies.forEach((mesh, i) => {
        const enemy = g.pumpkins.find(e => e.id === i)
        mesh.visible = showEnemies && Boolean(enemy)
        if (enemy) {
          mesh.position.set(enemy.x + g.offset, enemy.y - g.drop, 0.16)
          mesh.rotation.z = Math.sin(g.playTime * 2 + i) * 0.10
        }
      })
      this.bullets.forEach((mesh, i) => {
        mesh.visible = Boolean(g.shots[i])
        if (g.shots[i]) mesh.position.set(g.shots[i].x, g.shots[i].y, 0.16)
      })
      this.pops.forEach((mesh, i) => {
        const e = g.effects[i]; mesh.visible = Boolean(e)
        if (e) { mesh.position.set(e.x, e.y, 0.16); mesh.scale.setScalar(1 + e.age * 4); mesh.rotation.z = e.age * 9 }
      })
      this.scoreEl.textContent = String(g.score)
      this.livesEl.textContent = String(g.lives)
      this.waveEl.textContent = String(g.wave)
      this.notice.textContent = !this.data.tracked ? 'Point at the label to play' : !this.mixer ? 'Loading owl…' :
        g.state === 'owlEntrance' ? 'PUMPKIN INVASION' : g.state === 'playing' && g.playTime < 5 ? 'DRAG TO MOVE · OWL FIRES AUTOMATICALLY' : ''
      this.notice.hidden = !this.notice.textContent
      this.over.hidden = g.state !== 'gameOver'
      this.finalScore.textContent = String(g.score)
    },
    pause() { if (this.game) { this.game.track(false); this.pointer = null } },
    remove() {
      this.owl?.removeEventListener('model-loaded', this.onModel)
      this.replayButton?.removeEventListener('click', this.replay)
      window.removeEventListener('pointerdown', this.down)
      window.removeEventListener('pointermove', this.move)
      window.removeEventListener('pointerup', this.up)
      window.removeEventListener('pointercancel', this.up)
      if (this.mixer) { this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.model) }
      this.el.removeObject3D('pumpkin-arena')
      this.resources?.forEach(r => r.dispose())
    },
  })
}
module.exports = {PumpkinGame, registerPumpkinGame}
