// XR8's compositor captures the camera + WebGL frame. No screen permission,
// microphone request, second camera stream, or raw transparent-canvas capture.
class CaptureSession {
  constructor({recorder, eligible, changed, ready, recover, clock = globalThis}) {
    Object.assign(this, {recorder, eligible, changed, ready, recover, clock})
    this.state = 'idle'; this.generation = 0; this.timers = []; this.discard = false
  }
  set(state, text = '') { this.state = state; this.changed(state, text) }
  later(fn, ms) { this.timers.push(this.clock.setTimeout(fn, ms)) }
  clear() { this.timers.forEach(t => this.clock.clearTimeout(t)); this.timers = [] }
  start() {
    if (!['idle', 'error'].includes(this.state) || !this.eligible()) return
    this.clear(); this.discard = false; const id = ++this.generation
    this.set('countdown', '3')
    for (const [ms, number] of [[1000, '2'], [2000, '1']]) this.later(() => {
      if (id !== this.generation) return
      if (!this.eligible()) return this.cancel()
      this.set('countdown', number)
    }, ms)
    this.later(() => {
      if (id !== this.generation) return
      if (!this.eligible()) return this.cancel()
      this.clear(); this.set('recording', 'Starting recorder…')
      this.later(() => this.fail('Recording timed out. Please try again.'), 20000)
      try {
        this.recorder.recordVideo({
          onStart: () => {
            if (id !== this.generation) return
            if (this.discard) { this.recorder.stopRecording(); return }
            this.clear(); this.set('recording', '● REC · 5s')
            for (let n = 1; n < 5; n++) this.later(() => this.set('recording', `● REC · ${5 - n}s`), n * 1000)
            this.later(() => this.stop(), 5000)
          },
          onStop: () => { if (id === this.generation) this.processing() },
          onVideoReady: ({videoBlob}) => {
            if (id !== this.generation) return
            this.clear()
            if (this.discard) { this.set('idle', 'Recording canceled.'); return }
            if (!videoBlob?.size) return this.fail('The recording was empty. Please try again.')
            this.set('preview'); this.ready(videoBlob)
          },
          onError: error => { if (id === this.generation) this.fail(error?.message || String(error)) },
          onProcessFrame: ({ctx}) => {
            // Engine-supported compositing hook: burned into video, not HTML.
            ctx.save(); const size = Math.max(14, Math.round(ctx.canvas.width * 0.03))
            ctx.font = `bold ${size}px system-ui`; ctx.fillStyle = '#ffffff'
            ctx.shadowColor = '#000000'; ctx.shadowBlur = 4
            ctx.fillText('Dadbod AR', size, ctx.canvas.height - size); ctx.restore()
          },
        })
      } catch (error) { this.fail(error.message) }
    }, 3000)
  }
  processing() {
    this.clear(); this.set('processing', this.discard ? 'Canceling recording…' : 'Preparing your video…')
    this.later(() => this.fail('Video processing timed out. Please try again.'), 45000)
  }
  stop() {
    if (this.state !== 'recording') return
    this.processing()
    try { this.recorder.stopRecording() } catch (error) { this.fail(error.message) }
  }
  cancel() {
    if (this.state === 'countdown') {
      this.clear(); this.generation++; this.set('idle', 'Find the label to record.')
    } else if (['recording', 'processing'].includes(this.state)) {
      this.discard = true
      // Retain the lock through finalization; XR8 permits only one recording.
      if (this.state === 'recording') this.stop()
    }
  }
  fail(text) {
    this.clear(); this.generation++
    try { this.recorder.stopRecording(); this.recover?.() } catch (_) {}
    this.set('error', text)
  }
  close() { if (this.state === 'preview') this.set('idle') }
  dispose() { this.cancel(); this.clear(); this.generation++ }
}

function videoExtension(type) {
  if (type?.includes('mp4')) return 'mp4'
  if (type?.includes('webm')) return 'webm'
  if (type?.includes('quicktime')) return 'mov'
  throw new Error('The recorder returned an unknown video format.')
}

async function shareFile(file, nav, download) {
  if (nav.share && nav.canShare?.({files: [file]})) {
    try {
      await nav.share({files: [file], title: 'Dadbod AR: Pumpkin Invasion', text: 'I made an owl fight pumpkins on a beer bottle.'})
    } catch (error) {
      if (error.name !== 'AbortError') download()
    }
  } else download()
}

function createCapture({scene, getGame, isRunning}) {
  const button = document.querySelector('#record-video')
  const label = document.querySelector('#capture-status')
  const dialog = document.querySelector('#capture-preview')
  const video = document.querySelector('#capture-video')
  const share = document.querySelector('#share-video')
  const save = document.querySelector('#save-video')
  const close = document.querySelector('#close-capture')
  const retake = document.querySelector('#retake-video')
  let url = null, file = null, disposed = false, attached = false, supported = false, audioContext = null
  const XR8 = window.XR8
  const recorder = XR8?.MediaRecorder
  const eligible = () => supported && attached && isRunning() && !document.hidden &&
    document.querySelector('#hud').dataset.found === 'true' && getGame() && getGame().state !== 'gameOver'
  const update = () => {
    if (session.state === 'countdown' && !eligible()) session.cancel()
    button.disabled = !eligible() || !['idle', 'error'].includes(session.state)
  }
  const release = () => {
    video.pause(); video.removeAttribute('src'); video.load()
    if (url) URL.revokeObjectURL(url)
    url = null; file = null; dialog.hidden = true
  }
  const download = () => {
    if (!file || !url) return
    const a = document.createElement('a'); a.href = url; a.download = file.name
    document.body.appendChild(a); a.click(); a.remove()
    document.querySelector('#capture-help').textContent = 'Check Downloads. On iPhone, open the clip and use Share → Save Video. You can also use SHARE VIDEO here.'
  }
  const install = () => {
    if (!recorder?.pipelineModule || !recorder?.recordVideo) throw new Error('Video recording is not supported in this browser.')
    // Resume a silent context on the RECORD gesture, before the countdown.
    // No microphone or game-audio source is ever connected to it.
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!audioContext) audioContext = new AudioContext()
    recorder.configure({maxDurationMs: 5000, maxDimension: 720, enableEndCard: false, requestMic: 'manual', audioContext})
    const pipeline = recorder.pipelineModule()
    const onAttach = pipeline.onAttach
    pipeline.onAttach = (...args) => {
      try { onAttach?.(...args); attached = true; update() }
      catch (error) { supported = false; attached = false; label.textContent = `Video recording unavailable: ${error.message}`; update() }
    }
    XR8.addCameraPipelineModule(pipeline)
  }
  const session = new CaptureSession({
    recorder, eligible,
    recover: () => {
      attached = false; XR8.removeCameraPipelineModule('mediarecorder'); install()
    },
    changed: (state, text) => {
      label.textContent = text
      label.dataset.state = state
      button.textContent = state === 'recording' ? '● RECORDING' : 'RECORD 5 SEC'
      update()
    },
    ready: blob => {
      try {
        release(); file = new File([blob], `dadbod-ar-pumpkin-invasion.${videoExtension(blob.type)}`, {type: blob.type})
        url = URL.createObjectURL(file); video.src = url; video.load(); dialog.hidden = false
        document.querySelector('#capture-help').textContent = 'Preview your clip, then share or download it.'
        close.focus()
      } catch (error) { session.fail(error.message) }
    },
  })
  try { supported = true; install() }
  catch (error) { supported = false; label.textContent = error.message; update() }
  button.onclick = () => {
    audioContext?.resume().catch(error => { label.textContent = `Recorder could not initialize: ${error.message}` })
    session.start()
  }
  save.onclick = download
  share.onclick = async () => {
    if (!file) return
    share.disabled = true
    try { await shareFile(file, navigator, download) }
    finally { share.disabled = false }
  }
  const dismiss = () => { release(); session.close(); button.focus(); update() }
  close.onclick = dismiss; retake.onclick = dismiss
  const hidden = () => { if (document.hidden) session.cancel(); update() }
  document.addEventListener('visibilitychange', hidden)
  // HUD/game eligibility changes independently of tracking (game over/replay).
  const watcher = setInterval(update, 200)
  return {
    update,
    dispose() {
      if (disposed) return
      disposed = true; session.dispose(); clearInterval(watcher); release()
      document.removeEventListener('visibilitychange', hidden)
      button.onclick = save.onclick = share.onclick = close.onclick = retake.onclick = null
      if (attached) { try { XR8.removeCameraPipelineModule('mediarecorder') } catch (_) {} }
      audioContext?.close().catch(() => {})
    },
  }
}
module.exports = {CaptureSession, videoExtension, shareFile, createCapture}
