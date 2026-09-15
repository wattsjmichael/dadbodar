const {implementations,merge,config} = require('../../packages/shared/contracts.cjs')
const {fields} = require('./repository.cjs')
const fail = (message,status=400) => { throw Object.assign(new Error(message),{status}) }
function createService(repo,storage) {
 const get = (kind,id) => repo.get(kind,id) || fail('Record not found',404)
 function save(kind, input, id) {
  const defaults = {
   labels:{internalName:'',displayName:'',sourceImage:'',targetFile:'',targetName:'',targetType:'flat',status:'draft'},
   experiences:{name:'',slug:'',description:'',thumbnail:'',experienceType:'CUSTOM',implementationKey:'',status:'draft',config:{}},
   assignments:{labelId:'',experienceId:'',enabled:true,priority:0,overrides:{}},
  }
  if (!fields[kind]) fail('Unknown entity',404)
  const d = {...defaults[kind],...(id ? get(kind,id):{}),...input}
  for (const k of fields[kind]) {
   if (['physicalWidth','physicalHeight','circumference','radius','radiusTop','radiusBottom'].includes(k)) {
    if (d[k] === '' || d[k] == null) d[k]=null
    else if (typeof d[k]!=='number' || !Number.isFinite(d[k]) || d[k]<=0) fail(`${k} must be a positive number`)
   }
  }
  const text = (k,required=false) => { if (typeof d[k]!=='string' || d[k].length>2000 || (required && !d[k].trim())) fail(`Invalid ${k}`); d[k]=d[k].trim() }
  if (kind!=='assignments' && !['draft','active','disabled'].includes(d.status)) fail('Invalid status')
  if (kind==='labels') {
   for (const k of ['internalName','displayName','targetName']) text(k,true)
   if (!/^[a-zA-Z0-9_-]{1,120}$/.test(d.targetName)) fail('Target key must use letters, numbers, underscores or hyphens')
   if (!['flat','cylindrical','conical'].includes(d.targetType)) fail('Invalid target type')
   for (const k of ['sourceImage','targetFile']) { text(k); if (d[k] && !storage.exists(d[k])) fail(`Missing ${k}`) }
   if (d.targetFile) {
    const t=storage.readTarget(d.targetFile)
    if (t.name!==d.targetName || ({PLANAR:'flat',CYLINDER:'cylindrical',CONICAL:'conical'})[t.type]!==d.targetType) fail('Target key/type must match the uploaded target JSON')
    if (!storage.exists(t.imagePath)) fail('Target tracking image is missing')
   }
   if (d.status==='active' && !d.targetFile) fail('Upload complete target data before activating this label')
  } else if (kind==='experiences') {
   for (const k of ['name','slug','implementationKey']) text(k,true)
   for (const k of ['description','thumbnail']) text(k)
   if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug)) fail('Slug must use lowercase words separated by hyphens')
   if (!['GAME','BREWER_TOUR','STORY','CUSTOM'].includes(d.experienceType)) fail('Invalid experience type')
   if (!implementations.includes(d.implementationKey)) fail('Unknown implementation key')
   if (d.thumbnail && !storage.exists(d.thumbnail)) fail('Missing thumbnail')
   d.config=config(d.config)
  } else {
   get('labels',d.labelId); get('experiences',d.experienceId)
   if (typeof d.enabled!=='boolean') fail('Enabled must be boolean')
   if (!Number.isSafeInteger(d.priority)) fail('Priority must be an integer')
   d.overrides=config(d.overrides)
  }
  try { return repo.save(kind,d,id) } catch(e) {
   if (/UNIQUE constraint/.test(e.message)) fail('That name, key, slug or label/experience assignment already exists',409)
   throw e
  }
 }
 function runtime(label) {
  if (!label || label.status!=='active' || !label.targetFile) return null
  const experiences=repo.all('assignments').filter(a=>a.labelId===label.id && a.enabled).sort((a,b)=>a.priority-b.priority || a.id.localeCompare(b.id)).flatMap(a=>{
   const e=repo.get('experiences',a.experienceId)
   return e?.status==='active' ? [{id:e.id,assignmentId:a.id,name:e.name,implementationKey:e.implementationKey,config:merge(e.config,a.overrides),priority:a.priority}] : []
  })
  if (!experiences.length) return null
  return {label:{id:label.id,name:label.displayName,targetName:label.targetName,targetFile:label.targetFile},experiences}
 }
 function enriched(kind) {
  const assignments=repo.all('assignments')
  return repo.all(kind).map(r=>({...r,...(kind==='labels'?{assignmentCount:assignments.filter(a=>a.labelId===r.id).length}:kind==='experiences'?{assignmentCount:assignments.filter(a=>a.experienceId===r.id).length}:{labelName:repo.get('labels',r.labelId)?.displayName,experienceName:repo.get('experiences',r.experienceId)?.name})}))
 }
 return {get,save,runtime,enriched,
  manifest() { return repo.all('labels').map(runtime).filter(Boolean) },
  byTarget(name) { return runtime(repo.all('labels').find(l=>l.targetName===name)) || fail('No active experience for this target',404) },
  dashboard() {
   const labels=enriched('labels'),experiences=enriched('experiences'),assignments=enriched('assignments')
   return {totalLabels:labels.length,activeLabels:labels.filter(l=>l.status==='active').length,totalExperiences:experiences.length,activeAssignments:assignments.filter(a=>a.enabled && repo.get('labels',a.labelId).status==='active' && repo.get('experiences',a.experienceId).status==='active').length,recentLabels:labels.slice(0,5),recentAssignments:assignments.slice(0,5),warnings:{unassignedLabels:labels.filter(l=>!l.assignmentCount),unusedExperiences:experiences.filter(e=>!e.assignmentCount),missingTargets:labels.filter(l=>!l.targetFile)}}
  },
 }
}
module.exports = {createService}
