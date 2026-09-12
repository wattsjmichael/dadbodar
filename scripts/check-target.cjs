const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const dataFile = path.join(root, 'image-targets/dadbod-test-can.json')
try {
  const target = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
  if (!target.name || typeof target.name !== 'string') throw new Error('Missing target name')
  if (!['PLANAR', 'CYLINDER', 'CONICAL'].includes(target.type)) throw new Error('Unsupported target geometry')
  if (!target.properties || target.properties.width <= 0 || target.properties.height <= 0) throw new Error('Missing crop geometry')
  if (!target.imagePath?.startsWith('image-targets/') || target.imagePath.includes('..')) throw new Error('imagePath must reference a local image-targets/ asset')
  const image = path.resolve(root, target.imagePath)
  if (!fs.existsSync(image) || fs.statSync(image).size < 100) throw new Error(`Missing/empty tracked image: ${target.imagePath}`)
  for (const file of Object.values(target.resources || {})) {
    if (!fs.existsSync(path.resolve(root, 'image-targets', file))) throw new Error(`Missing generated resource: ${file}`)
  }
  console.log(`Target OK: ${target.name} (${target.type}) → ${target.imagePath}`)
} catch (error) {
  console.error(`Target check failed: ${error.message}`)
  process.exitCode = 1
}
