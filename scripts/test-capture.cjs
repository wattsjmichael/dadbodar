const assert = require('node:assert/strict')
const {CaptureSession, videoExtension, shareFile, createCapture} = require('../src/capture.js')
function clock() {
  let now = 0, id = 0; const jobs = new Map()
  return {setTimeout(fn, ms) { jobs.set(++id, {fn, at: now + ms}); return id },
    clearTimeout(id) { jobs.delete(id) },
    advance(ms) {
      const end = now + ms
      while (true) {
        const next = [...jobs].filter(([, v]) => v.at <= end).sort((a,b) => a[1].at - b[1].at)[0]
        if (!next) break
        jobs.delete(next[0]); now = next[1].at; next[1].fn()
      }
      now = end
    }, size: () => jobs.size}
}
async function run() {
  const timer = clock(); let allowed = true, callbacks, recordings = 0, stops = 0, ready = 0, recoveries = 0
  const recorder = {recordVideo(c) { recordings++; callbacks = c; c.onStart() }, stopRecording() { stops++; callbacks.onStop() }}
  const session = new CaptureSession({recorder, eligible: () => allowed, changed() {}, ready() { ready++ }, recover() { recoveries++ }, clock: timer})
  session.start(); session.start(); assert.equal(session.state, 'countdown')
  timer.advance(1000); allowed = false; timer.advance(1000)
  assert.equal(session.state, 'idle'); assert.equal(recordings, 0)
  allowed = true; session.start(); timer.advance(3000); assert.equal(recordings, 1)
  session.start(); assert.equal(recordings, 1)
  allowed = false // Tracking loss after start must not cancel recording.
  timer.advance(4999); assert.equal(stops, 0)
  timer.advance(1); assert.equal(stops, 1); assert.equal(session.state, 'processing')
  callbacks.onVideoReady({videoBlob: new Blob(['video'], {type: 'video/mp4'})})
  assert.equal(session.state, 'preview'); assert.equal(ready, 1)
  session.close(); allowed = true; session.start(); timer.advance(3000)
  session.cancel(); assert.equal(session.state, 'processing')
  callbacks.onVideoReady({videoBlob: new Blob(['discard'])})
  assert.equal(ready, 1); assert.equal(session.state, 'idle')
  session.start(); timer.advance(3000); timer.advance(5000); timer.advance(45000)
  assert.equal(session.state, 'error'); assert.equal(recoveries, 1)
  const stale = callbacks; session.start(); session.dispose(); stale.onStart()
  assert.equal(timer.size(), 0)
  assert.equal(videoExtension('video/mp4'), 'mp4'); assert.equal(videoExtension('video/webm;codecs=vp8'), 'webm')
  assert.throws(() => videoExtension('text/plain'))
  let downloads = 0
  await shareFile({}, {canShare: () => true, share: async () => { throw Object.assign(new Error(), {name: 'AbortError'}) }}, () => downloads++)
  assert.equal(downloads, 0)
  await shareFile({}, {}, () => downloads++); assert.equal(downloads, 1)
  // Test actual UI ownership: preview URLs are released by RETAKE and CLOSE.
  const fakeClock = clock(), originals = {}
  for (const key of ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'window', 'document']) originals[key] = globalThis[key]
  const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL
  let revoked = 0, adds = 0, removed = 0, uiCallbacks
  const nodes = new Map()
  const query = id => {
    if (!nodes.has(id)) nodes.set(id, {dataset: {found: 'true'}, hidden: false, textContent: '', pause() {}, load() {}, removeAttribute() {}, focus() {}})
    return nodes.get(id)
  }
  try {
    globalThis.setTimeout = fakeClock.setTimeout; globalThis.clearTimeout = fakeClock.clearTimeout
    globalThis.setInterval = () => 1; globalThis.clearInterval = () => {}
    URL.createObjectURL = () => 'blob:test'; URL.revokeObjectURL = () => revoked++
    globalThis.document = {hidden: false, querySelector: query, addEventListener() {}, removeEventListener() {}}
    globalThis.window = {AudioContext: class {resume() { return Promise.resolve() } close() { return Promise.resolve() }}, XR8: {
      MediaRecorder: {configure(c) { assert.equal(c.requestMic, 'manual'); assert.equal(c.maxDurationMs, 5000) },
        pipelineModule() { return {name: 'mediarecorder', onAttach() {}} },
        recordVideo(c) { uiCallbacks = c; c.onStart() }, stopRecording() { uiCallbacks?.onStop() }},
      addCameraPipelineModule(p) { adds++; p.onAttach({}) }, removeCameraPipelineModule() { removed++ },
    }}
    const ui = createCapture({getGame: () => ({state: 'playing'}), isRunning: () => true})
    for (const dismiss of ['#retake-video', '#close-capture']) {
      query('#record-video').onclick(); fakeClock.advance(8000)
      uiCallbacks.onVideoReady({videoBlob: new Blob(['video'], {type: 'video/mp4'})})
      assert.equal(query('#capture-preview').hidden, false)
      query(dismiss).onclick(); assert.equal(query('#capture-preview').hidden, true)
    }
    assert.equal(revoked, 2); assert.equal(adds, 1)
    ui.dispose(); ui.dispose(); assert.equal(removed, 1); assert.equal(fakeClock.size(), 0)
  } finally {
    for (const [key, value] of Object.entries(originals)) globalThis[key] = value
    URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke
  }
  console.log('PASS: preview, retake/close revoke URLs, one pipeline, idempotent cleanup')
  console.log('PASS: countdown cancellation, single recorder, five-second stop, lost tracking, hidden cancellation, timeout recovery, stale callbacks, formats, canceled share and download fallback')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
