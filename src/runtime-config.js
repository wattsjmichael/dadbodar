const {implementations}=require('../packages/shared/contracts.cjs')
function createRuntimeConfig({base='',href,fetcher}) {
 const origin=new URL(base || '.',href)
 const absolute=p=>new URL(p,origin).href
 async function read(path) {
  const response=await fetcher(absolute(path),{cache:'no-store',signal:AbortSignal.timeout(15000)})
  if(!response.ok)throw new Error(`Runtime configuration unavailable (${response.status}). Check the admin API and active assignments.`)
  return response.json()
 }
 async function campaigns() {
  const manifest=await read('api/runtime/manifest')
  if(!Array.isArray(manifest.targets) || !manifest.targets.length)throw new Error('No active labels with enabled experiences. Configure them in the admin first.')
  const result=[]
  for(const entry of manifest.targets) {
   const chosen=entry.experiences[0]
   if(!chosen || !implementations.includes(chosen.implementationKey))throw new Error('Unknown experience implementation')
   const target=await read(entry.label.targetFile)
   if(target.name!==entry.label.targetName)throw new Error('Target name does not match runtime configuration')
   target.imagePath=absolute(target.imagePath)
   target.resources=Object.fromEntries(Object.entries(target.resources || {}).map(([k,v])=>[k,absolute(v)]))
   const config={...chosen.config}
   if(config.labelTexture)config.labelTexture=absolute(config.labelTexture)
   result.push({target,component:chosen.implementationKey,config,labelId:entry.label.id})
  }
  if(new Set(result.map(c=>c.target.name)).size!==result.length)throw new Error('Duplicate tracking target names')
  return result
 }
 return {campaigns,getExperienceForTarget:name=>read('api/runtime/target/'+encodeURIComponent(name))}
}
async function loadCampaigns(fallback,win=window,fetcher=fetch) {
 const enabled=new URLSearchParams(win.location.search).get('config')==='api' || !!win.DADBOD_API_BASE
 if(!enabled)return fallback()
 return createRuntimeConfig({base:win.DADBOD_API_BASE || '/',href:win.location.href,fetcher}).campaigns()
}
module.exports={createRuntimeConfig,loadCampaigns}
