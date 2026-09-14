class TourState {
  constructor() { this.step = 0; this.time = 0; this.transition = 0; this.tracked = false; this.state = 'HOPS' }
  tick(dt) {
    if (!this.tracked) return
    if (this.transition > 0) { this.transition = Math.max(0, this.transition - dt); return }
    this.time += dt
    if (this.step === 4 && this.time >= 10) this.state = 'COMPLETE'
  }
  next() {
    if (!this.tracked || this.transition || this.time < 8 || this.step === 4) return false
    this.step++; this.time = 0; this.transition = 1
    this.state = ['HOPS', 'MASH', 'BOIL', 'FERMENT', 'CANNING'][this.step]; return true
  }
  replay() { if (!this.tracked || this.state !== 'COMPLETE') return false; this.step = 0; this.time = 0; this.transition = 1; this.state = 'HOPS'; return true }
}
module.exports = {TourState}
