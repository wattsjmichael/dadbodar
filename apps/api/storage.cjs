const fs = require('node:fs')
const path = require('node:path')
const {randomUUID} = require('node:crypto')
const typeMap = {PLANAR:'flat',CYLINDER:'cylindrical',CONICAL:'conical'}
function imageExtension(b) {
 if (b.length < 20) throw new Error('Empty or invalid image')
 if (b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return '.png'
 if (b[0]===255 && b[1]===216 && b[2]===255) return '.jpg'
 if (b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP') return '.webp'
 throw new Error('Use PNG, JPEG or WebP images')
}
function createStorage(root) {
 fs.mkdirSync(root,{recursive:true})
 function local(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) throw new Error('Invalid stored file path')
  const p = path.resolve(root,url.slice(9))
  if (!p.startsWith(path.resolve(root)+path.sep)) throw new Error('Invalid stored file path')
  return p
 }
 return {
  local,
  image(buffer, category) {
   if (!['labels','thumbnails'].includes(category)) throw new Error('Invalid upload category')
   const url = `/uploads/${category}/${randomUUID()}${imageExtension(buffer)}`
   fs.mkdirSync(path.dirname(local(url)),{recursive:true}); fs.writeFileSync(local(url),buffer); return url
  },
  target(files) {
   const jsonFiles = files.filter(f=>f.name.endsWith('.json'))
   if (jsonFiles.length!==1) throw new Error('Select one target JSON and all its generated images')
   const target = JSON.parse(jsonFiles[0].buffer.toString('utf8'))
   if (!/^[a-zA-Z0-9_-]{1,120}$/.test(target.name) || !typeMap[target.type] || !target.properties || typeof target.properties!=='object') throw new Error('Invalid 8th Wall target name, type or geometry')
   const byName = new Map()
   for (const f of files) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(f.name) || f.name==='.' || f.name==='..' || byName.has(f.name)) throw new Error('Invalid or duplicate upload filename')
    byName.set(f.name,f)
   }
   const references = [target.imagePath,...Object.values(target.resources || {})]
   if (!target.imagePath || references.some(v=>typeof v!=='string')) throw new Error('Target image references are invalid')
   const folder = `/uploads/targets/${randomUUID()}/`
   const rewritten = new Map()
   for (const ref of references) {
    const file = byName.get(path.posix.basename(ref.replaceAll('\\','/')))
    if (!file) throw new Error(`Missing generated image: ${ref}`)
    imageExtension(file.buffer)
    rewritten.set(ref,folder+file.name)
   }
   target.imagePath = rewritten.get(target.imagePath)
   target.resources = Object.fromEntries(Object.entries(target.resources || {}).map(([k,v])=>[k,rewritten.get(v)]))
   fs.mkdirSync(local(folder),{recursive:true})
   for (const ref of new Set(rewritten.values())) fs.writeFileSync(local(ref),byName.get(path.posix.basename(ref)).buffer)
   const targetFile=folder+'target.json'; fs.writeFileSync(local(targetFile),JSON.stringify(target,null,2))
   return {targetFile,targetName:target.name,targetType:typeMap[target.type]}
  },
  readTarget(url) { return JSON.parse(fs.readFileSync(local(url),'utf8')) },
  exists(url) { try { return fs.statSync(local(url)).size > 0 } catch { return false } },
 }
}
module.exports = {createStorage}
