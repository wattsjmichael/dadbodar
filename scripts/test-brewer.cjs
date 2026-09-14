const assert = require('node:assert/strict')
const {TourState} = require('../src/experiences/brewer-tour/TourState')
const state = new TourState()
state.tick(10); assert.equal(state.time, 0); assert.equal(state.next(), false)
state.tracked = true
for (let step = 0; step < 5; step++) {
  assert.equal(state.step, step)
  assert.equal(state.next(), false)
  state.tick(4)
  state.tracked = false
  const before = state.time
  state.tick(100); assert.equal(state.time, before); assert.equal(state.next(), false)
  state.tracked = true; state.tick(4)
  if (step < 4) {
    assert.equal(state.next(), true); assert.equal(state.next(), false)
    state.tracked = false; state.tick(3); assert.equal(state.transition, 1)
    state.tracked = true; state.tick(1); assert.equal(state.transition, 0)
  }
}
state.tick(2); assert.equal(state.state, 'COMPLETE')
assert.equal(state.replay(), true); assert.equal(state.step, 0); assert.equal(state.time, 0)
assert.equal(state.replay(), false)
console.log('PASS: five stages, minimum watch time, paused tracking/transition, completion and replay')
