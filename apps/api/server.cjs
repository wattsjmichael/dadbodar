const http=require('node:http'),fs=require('node:fs'),path=require('node:path')
const {createRepository}=require('./repository.cjs')
const {createStorage}=require('./storage.cjs')
const {createService}=require('./service.cjs')
const {seed}=require('./seed.cjs')
const {implementations}=require('../../packages/shared/contracts.cjs')
const projectRoot=path.resolve(__dirname,'../..')
function createApp(options={}) {
 const repo=createRepository(options.database || process.env.DADBOD_DATABASE || path.join(projectRoot,'data/dadbod.sqlite'))
 const storage=createStorage(options.uploads || process.env.DADBOD_UPLOADS || path.join(projectRoot,'uploads'))
 const service=createService(repo,storage)
 if(options.seed!==false) seed(repo,service,storage,projectRoot)
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
 const localHost=host=>['localhost','127.0.0.1','[::1]'].includes(host)
 function authorize(req) {
  const host=new URL('http://'+req.headers.host)
  if(!localHost(host.hostname) || !['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) throw Object.assign(new Error('Admin is local development only'),{status:403})
  if(req.headers.origin && req.headers.origin!==host.origin) throw Object.assign(new Error('Cross-origin admin access denied'),{status:403})
  if(!['GET','HEAD'].includes(req.method) && req.headers['x-dadbod-admin']!=='1') throw Object.assign(new Error('Admin request header required'),{status:403})
 }
 async function body(req) {
  const chunks=[];let size=0
  for await(const chunk of req){size+=chunk.length;if(size>32*1024*1024) throw Object.assign(new Error('Upload exceeds 32 MB'),{status:413});chunks.push(chunk)}
  return Buffer.concat(chunks)
 }
 function sendFile(res,file) {
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}[path.extname(file)]
  if(!mime || !fs.existsSync(file) || !fs.statSync(file).isFile()) return json(res,404,{error:'File not found'})
  res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res)
 }
 const server=http.createServer(async(req,res)=>{
  try {
   const url=new URL(req.url,'http://localhost'),p=decodeURIComponent(url.pathname),parts=p.split('/').filter(Boolean)
   res.setHeader('X-Content-Type-Options','nosniff')
   if(p==='/admin' || p.startsWith('/admin/') || p.startsWith('/api/admin/')) authorize(req)
   if(p==='/admin' || p==='/admin/') return sendFile(res,path.join(projectRoot,'apps/admin/index.html'))
   if(['/admin/app.js','/admin/styles.css'].includes(p)) return sendFile(res,path.join(projectRoot,'apps/admin',path.basename(p)))
   if(p.startsWith('/uploads/') && req.method==='GET') return sendFile(res,storage.local(p))
   if(p.startsWith('/api/admin/')) {
    const kind=parts[2],id=parts[3]
    if(kind==='dashboard' && req.method==='GET') return json(res,200,service.dashboard())
    if(kind==='implementations' && req.method==='GET') return json(res,200,implementations)
    if(kind==='uploads' && req.method==='POST') {
     const buffer=await body(req)
     const form=await new Response(buffer,{headers:{'Content-Type':req.headers['content-type']}}).formData()
     const files=[]
     for(const f of form.getAll('files')) {if(typeof f==='string') throw new Error('Expected file');files.push({name:f.name,buffer:Buffer.from(await f.arrayBuffer())})}
     if(!files.length || files.length>30) throw new Error('Select 1–30 files')
     if(id==='targets') return json(res,201,storage.target(files))
     if(files.length!==1) throw new Error('Select one image')
     return json(res,201,{url:storage.image(files[0].buffer,id)})
    }
    if(!['labels','experiences','assignments'].includes(kind)) return json(res,404,{error:'Unknown route'})
    if(req.method==='GET') return json(res,200,id?service.get(kind,id):service.enriched(kind))
    if(req.method==='POST' && !id || req.method==='PATCH' && id) {
     if(!(req.headers['content-type']||'').startsWith('application/json')) throw new Error('Expected JSON')
     const input=JSON.parse((await body(req)).toString())
     if(!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Expected object')
     return json(res,req.method==='POST'?201:200,service.save(kind,input,id))
    }
    if(req.method==='DELETE' && id){service.get(kind,id);repo.remove(kind,id);return json(res,200,{deleted:true})}
    return json(res,405,{error:'Method not allowed'})
   }
   // Public runtime routes are read-only and omit drafts/disabled/unassigned records.
   if(p.startsWith('/api/')) {
    if(req.method!=='GET') return json(res,405,{error:'Public API is read-only'})
    if(p==='/api/runtime/manifest') return json(res,200,{targets:service.manifest()})
    if(p.startsWith('/api/runtime/target/')) return json(res,200,service.byTarget(parts[3]))
    if(p==='/api/labels') return json(res,200,service.manifest().map(r=>r.label))
    if(p.startsWith('/api/labels/by-target/')) return json(res,200,service.byTarget(parts[3]).label)
    if(parts[1]==='labels' && parts[2]) {
     const r=service.runtime(repo.get('labels',parts[2]));if(!r) return json(res,404,{error:'Label not active'})
     return json(res,200,parts[3]==='experiences'?r.experiences:r.label)
    }
    if(p==='/api/experiences') return json(res,200,repo.all('experiences').filter(e=>e.status==='active').map(({id,name,implementationKey,config})=>({id,name,implementationKey,config})))
   }
   json(res,404,{error:'Not found'})
  } catch(e) {json(res,e.status || 400,{error:e.message})}
 })
 return {server,repo,service,storage}
}
if(require.main===module){
 if(process.env.NODE_ENV==='production') throw new Error('Local admin has no authentication. Add authenticated deployment before production use.')
 const app=createApp(),port=Number(process.env.DADBOD_API_PORT || 3001)
 app.server.listen(port,'127.0.0.1',()=>console.log(`Dadbod internal admin: http://localhost:${port}/admin/`))
 for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>app.server.close(()=>{app.repo.close();process.exit(0)}))
}
module.exports={createApp}
