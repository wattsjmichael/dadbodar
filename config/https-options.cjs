const fs = require('node:fs')
const path = require('node:path')
module.exports = () => {
  const key = path.resolve('certs/dev-key.pem')
  const cert = path.resolve('certs/dev.pem')
  if (fs.existsSync(key) && fs.existsSync(cert)) {
    return {key: fs.readFileSync(key), cert: fs.readFileSync(cert)}
  }
  // Webpack generates a development certificate when these are absent.
  return {}
}
