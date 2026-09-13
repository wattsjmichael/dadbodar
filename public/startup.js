// Runs independently of Webpack: bundle failures must be visible on phones.
(function () {
  function report(message) {
    var panel = document.getElementById('startup-error')
    if (!panel) {
      panel = document.createElement('pre')
      panel.id = 'startup-error'
      panel.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;z-index:99999;background:#241528;color:#fff;border:2px solid #ffac55;padding:16px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:45vh;overflow:auto;font:14px system-ui;user-select:text'
      document.body.appendChild(panel)
    }
    panel.textContent = 'Dadbod AR error\n' + message + '\n\nTake a screenshot of this message and send it to Michael. Reload to try again.'
  }
  window.addEventListener('error', function (event) {
    if (event.message) report(event.message)
    else if (event.target && event.target.tagName === 'SCRIPT') report('Could not load script: ' + event.target.src)
  }, true)
  window.addEventListener('unhandledrejection', function (event) {
    report(event.reason && event.reason.message || String(event.reason))
  })
  setTimeout(function () {
    var start = document.getElementById('start')
    if (start && typeof start.onclick !== 'function') report('Startup did not complete. The app script may be missing or cached. Reload this page.')
  }, 10000)
})()
