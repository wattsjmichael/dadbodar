import './styles.css'
const {registerPumpkinGame} = require('./pumpkin-game.js')
const {createCapture} = require('./capture.js')
const {registerBrewerTour} = require('./experiences/brewer-tour/BrewerTour')
const {getCampaigns} = require('./experiences/registry')

// This is the only target configuration used by both XR8 and the anchor.
// Keep the generated type/properties intact: PLANAR, CYLINDER or CONICAL.
const campaigns = getCampaigns()
const instances = []
let active
const welcome = document.querySelector('#welcome')
const start = document.querySelector('#start')
const message = document.querySelector('#message')
const help = document.querySelector('#help')
const hud = document.querySelector('#hud')
const status = document.querySelector('#tracking-status')
let scene
let anchor
let owl
let gameRoot
let capture
let failed = false
let running = false
let startupTimer

function showError(text, hint = 'Reload to try again.') {
  failed = true
  running = false
  clearTimeout(startupTimer)
  capture?.dispose()
  if (anchor) anchor.object3D.visible = false
  instances.forEach(i => i.root.setAttribute(i.component, 'tracked', false))
  window.XR8?.stop()
  hud.hidden = true
  welcome.hidden = false
  message.textContent = text
  help.textContent = hint
  start.disabled = false
  start.textContent = 'RELOAD'
  start.onclick = () => window.location.reload()
}

function loadScript(src, attributes = {}) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    Object.entries(attributes).forEach(([key, value]) => script.setAttribute(key, value))
    const timeout = setTimeout(() => reject(new Error(`Timed out loading ${src}`)), 45000)
    script.onload = () => { clearTimeout(timeout); resolve() }
    script.onerror = () => { clearTimeout(timeout); reject(new Error(`Could not load ${src}`)) }
    document.head.appendChild(script)
  })
}

async function loadEngine() {
  await loadScript('./external/scripts/8frame-1.5.0.min.js')
  await loadScript('./external/xrextras/xrextras.js')
  // xrloaded signals that the engine and the A-Frame integration are ready.
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error('XR engine timed out')) }, 45000)
    const ready = () => { cleanup(); resolve() }
    const cleanup = () => { clearTimeout(timer); window.removeEventListener('xrloaded', ready) }
    window.addEventListener('xrloaded', ready, {once: true})
    loadScript('./external/xr/xr.js', {'data-preload-chunks': 'slam'})
      .catch(error => { cleanup(); reject(error) })
  })
}

function tracking(found, instance = active) {
  if (failed || document.hidden) return
  if (found && instance) {
    active = instance
    instances.forEach(i => {
      if (i !== active) i.root.setAttribute(i.component, 'tracked', false)
      i.root.object3D.visible = i === active
    })
    active.root.setAttribute(active.component, 'tracked', true)
  } else if (instance) {
    instance.root.setAttribute(instance.component, 'tracked', false)
    instance.root.object3D.visible = false
    if (instance !== active) return
  }
  hud.dataset.found = String(found)
  status.textContent = found ? 'FOUND IT' : 'LOOK FOR THE LABEL'
  const isGame = active?.component === 'pumpkin-game'
  document.querySelector('.game-stats').hidden = !isGame
  document.querySelector('#game-notice').hidden = !isGame
  if (!isGame) document.querySelector('#game-over').hidden = true
  capture?.update()
}

function createScene() {
  const {AFRAME, XR8} = window
  if (!AFRAME.components.xrweb || !AFRAME.components['xrextras-named-image-target']) {
    throw new Error('The official A-Frame tracking components did not load')
  }
  registerPumpkinGame(AFRAME)
  registerBrewerTour(AFRAME)
  XR8.XrController.configure({imageTargetData: campaigns.map(c => c.target)})
  scene = document.createElement('a-scene')
  scene.setAttribute('renderer', 'colorManagement: true')
  scene.setAttribute('vr-mode-ui', 'enabled: false')
  scene.setAttribute('xrweb', 'disableWorldTracking: true; cameraDirection: back; allowedDevices: mobile')
  scene.innerHTML = `
    <a-camera position="0 0 0" look-controls="enabled: false" wasd-controls="enabled: false"></a-camera>
    <a-light type="ambient" intensity="0.9"></a-light>
    <a-light type="directional" intensity="1.2" position="1 2 3"></a-light>`
  campaigns.forEach(campaign => {
    const targetAnchor = document.createElement('xrextras-named-image-target')
    targetAnchor.setAttribute('visible', false)
    targetAnchor.setAttribute('name', campaign.target.name)
    const root = document.createElement('a-entity')
    root.setAttribute('position', '0 0 0.20')
    root.brewerConfig = campaign.config
    if (campaign.component === 'pumpkin-game') {
      root.id = 'game-root'
      root.innerHTML = '<a-entity id="owl" gltf-model="url(./models/owl.glb)"></a-entity>'
      root.addEventListener('game-error', ({detail}) => showError('The game could not start.', detail.message))
      root.querySelector('#owl').addEventListener('model-error', () => showError('The owl model could not load.'))
      gameRoot = root
    }
    root.setAttribute(campaign.component, '')
    targetAnchor.appendChild(root)
    scene.appendChild(targetAnchor)
    instances.push({...campaign, anchor: targetAnchor, root})
  // Curved target poses are centered on the cylinder axis. Move the content
  // outside its front surface using geometry emitted by the official component.
  targetAnchor.addEventListener('xrextrasimagegeometry', ({detail}) => {
    const radius = detail.type === 'PLANAR' ? 0 : ((detail.radiusTop || 0) + (detail.radiusBottom || 0)) / 2
    root.setAttribute('position', {x: 0, y: 0, z: radius + 0.20})
  })
  })
  anchor = instances[0].anchor
  // The OFFICIAL component owns position, quaternion, scale and visibility.
  // Our handlers only control UI and animation; no custom tracking algorithm.
  scene.addEventListener('xrimagefound', event => {
    const instance = instances.find(i => i.target.name === event.detail.name)
    if (instance) tracking(true, instance)
  })
  scene.addEventListener('xrimageupdated', event => {
    const instance = instances.find(i => i.target.name === event.detail.name)
    if (instance && (!active || instance === active || hud.dataset.found !== 'true')) tracking(true, instance)
  })
  scene.addEventListener('xrimagelost', event => {
    const instance = instances.find(i => i.target.name === event.detail.name)
    if (instance) tracking(false, instance)
  })
  scene.addEventListener('realityready', () => {
    if (failed) return
    running = true
    clearTimeout(startupTimer)
    welcome.hidden = true
    hud.hidden = false
    tracking(false)
    if (!capture) capture = createCapture({scene, getGame: () => active?.root.components[active.component]?.game, isRunning: () => running && !failed})
  })
  scene.addEventListener('camerastatuschange', ({detail}) => {
    if (detail.status === 'requesting') {
      message.textContent = 'Allow camera access to start AR.'
    } else if (detail.status === 'hasVideo') {
      message.textContent = 'Camera ready. Loading label tracking…'
    } else if (detail.status === 'failed') {
      showError('Camera access failed.', 'Allow camera access in Safari or Chrome site settings, close other camera apps, then reload.')
    }
  })
  scene.addEventListener('realityerror', ({detail}) => {
    console.error('Dadbod AR engine error', detail)
    showError(detail.isDeviceBrowserSupported === false
      ? 'This device or browser cannot run AR.'
      : 'AR could not start.', 'Open this link directly in iPhone Safari or Android Chrome. Check camera permission, then reload.')
  })
  // Appending starts XR8; nothing requests a camera before START AR.
  document.body.appendChild(scene)
  startupTimer = setTimeout(() => {
    if (!running && !failed) showError('AR is taking too long to start.', 'Check camera permission and the connection, then reload.')
  }, 90000)
}

start.onclick = async () => {
  if (!window.isSecureContext) {
    showError('A secure connection is required.', 'Use an HTTPS address with a trusted certificate. A phone cannot use the computer’s HTTP localhost address.')
    return
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.WebAssembly) {
    showError('This browser cannot run AR.', 'Open this link directly in modern iPhone Safari or Android Chrome.')
    return
  }
  start.disabled = true
  start.textContent = 'LOADING…'
  message.textContent = 'Loading AR…'
  help.textContent = 'Keep this page open. Camera permission comes next.'
  try {
    await Promise.all(campaigns.map(({target}) => {
    const image = new Image()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Target image loading timed out.')), 30000)
      image.onload = () => { clearTimeout(timer); resolve() }
      image.onerror = () => {
        clearTimeout(timer)
        reject(new Error('Target image is missing. Check the JSON imagePath and generated assets.'))
      }
      image.src = target.imagePath
    })
    }))
    await loadEngine()
    if (!window.XR8.XrDevice.isDeviceBrowserCompatible({allowedDevices: window.XR8.XrConfig.device().MOBILE})) {
      showError('Open Dadbod AR on your phone.', 'Use iPhone Safari or Android Chrome. For development, open this computer’s trusted HTTPS network address on your phone.')
      return
    }
    createScene()
  } catch (error) {
    console.error(error)
    showError('Could not load AR.', error.message)
  }
}

document.querySelector('#stop').onclick = () => {
  capture?.dispose()
  window.XR8?.stop()
  window.location.reload()
}
document.addEventListener('visibilitychange', () => {
  if (!running || failed) return
  if (document.hidden) {
    instances.forEach(i => { i.anchor.object3D.visible = false; i.root.setAttribute(i.component, 'tracked', false) })
    hud.dataset.found = 'false'
    status.textContent = 'LOOK FOR THE LABEL'
    window.XR8.pause()
  } else {
    window.XR8.resume()
    tracking(false)
  }
})
window.addEventListener('pagehide', () => { capture?.dispose(); window.XR8?.stop() })

// An early development hint without loading the large engine or opening a camera.
if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
  help.textContent = 'For AR, open this site on your phone in Safari or Chrome. See README for the HTTPS network setup.'
}
