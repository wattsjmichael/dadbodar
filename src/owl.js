// Embedded GLB animations are played by A-Frame's own THREE.AnimationMixer.
// No aframe-extras / animation-mixer download is required.
function flightPose(seconds, size = 0.25, duration = 2.4) {
  const t = Math.max(0, seconds)
  const p = Math.min(1, t / Math.max(0.1, duration))
  const ease = 1 - Math.pow(1 - p, 3)
  const hover = Math.max(0, t - duration)
  return {
    x: p === 1 ? Math.sin(hover * 1.8) * 0.035 : 0,
    y: 0.55 * ease + (p === 1 ? Math.sin(hover * 3) * 0.035 : 0),
    z: 0.72 * ease,
    scale: size * (0.15 + 0.85 * ease),
    yaw: p === 1 ? Math.sin(hover * 1.8) * 0.1 : 0,
  }
}

function registerOwlComponent(AFRAME) {
  if (AFRAME.components['dadbod-owl']) return
  AFRAME.registerComponent('dadbod-owl', {
    schema: {
      active: {default: false},
      size: {default: 0.25},
      duration: {default: 2.4},
    },
    init() {
      this.elapsed = 0
      this.mixer = null
      this.model = null
      this.el.object3D.visible = false
      this.onModelLoaded = ({detail}) => {
        this.releaseModel()
        this.model = detail.model
        const clip = this.model.animations.find(animation => animation.name === 'Fly')
        if (!clip) {
          this.el.emit('owl-error', {message: 'The owl.glb file has no Fly animation.'})
          return
        }
        this.mixer = new AFRAME.THREE.AnimationMixer(this.model)
        this.action = this.mixer.clipAction(clip)
        this.action.setLoop(AFRAME.THREE.LoopRepeat, Infinity)
        this.action.play()
        this.elapsed = 0
        this.applyPose()
        this.el.object3D.visible = this.data.active
      }
      this.el.addEventListener('model-loaded', this.onModelLoaded)
    },
    update(oldData) {
      if (oldData.active !== this.data.active) {
        this.elapsed = 0
        if (this.action) this.action.reset().play()
        if (this.mixer) this.mixer.setTime(0)
      }
      this.el.object3D.visible = this.data.active && Boolean(this.mixer)
      this.applyPose()
    },
    applyPose() {
      const pose = flightPose(this.elapsed, this.data.size, this.data.duration)
      this.el.object3D.position.set(pose.x, pose.y, pose.z)
      this.el.object3D.scale.setScalar(pose.scale)
      this.el.object3D.rotation.y = pose.yaw
    },
    tick(time, delta) {
      if (!this.data.active || !this.mixer) return
      const step = Math.min(Math.max(delta || 0, 0) / 1000, 0.1)
      this.elapsed += step
      this.mixer.update(step)
      this.applyPose()
    },
    releaseModel() {
      if (this.mixer) {
        this.mixer.stopAllAction()
        this.mixer.uncacheRoot(this.model)
      }
      this.mixer = null
      this.action = null
    },
    remove() {
      this.el.removeEventListener('model-loaded', this.onModelLoaded)
      this.releaseModel()
    },
  })
}

module.exports = {flightPose, registerOwlComponent}
