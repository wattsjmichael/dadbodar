const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const {createApp}=require('../apps/api/server.cjs')
test('admin: persistent CRUD, real target bundle, assignments and public/admin boundaries',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dadbod-admin-'))
 const options={database:path.join(dir,'db.sqlite'),uploads:path.join(dir,'uploads')}
 let app=createApp(options)
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r))
 const base='http://127.0.0.1:'+app.server.address().port
 async function req(url,method='GET',value,headers={}){
  const r=await fetch(base+url,{method,headers:{'X-Dadbod-Admin':'1',...(value && !(value instanceof FormData)?{'Content-Type':'application/json'}:{}),...headers},body:value instanceof FormData?value:value?JSON.stringify(value):undefined})
  return {status:r.status,data:await r.json()}
 }
 const admin=(kind,method,body)=>req('/api/admin/'+kind,method,body)
 try{
  let dashboard=(await admin('dashboard')).data
  assert.equal(dashboard.totalLabels,2);assert.equal(dashboard.totalExperiences,2);assert.equal(dashboard.activeAssignments,1)
  const experiences=(await admin('experiences')).data,brewer=experiences.find(e=>e.implementationKey==='brewer-tour'),game=experiences.find(e=>e.implementationKey==='pumpkin-game')
  let label=(await admin('labels','POST',{internalName:'new-label',displayName:'New IPA',targetName:'test-new',targetType:'cylindrical'})).data
  assert.ok(label.id)
  assert.equal((await admin('labels/'+label.id,'PATCH',{status:'active'})).status,400)
  assert.equal((await admin('labels','POST',{internalName:'new-label',displayName:'Duplicate',targetName:'other'})).status,409)
  assert.equal((await admin('experiences/'+brewer.id,'PATCH',{config:[]})).status,400)
  assert.equal((await admin('assignments','POST',{labelId:label.id,experienceId:'missing'})).status,404)
  const target=JSON.parse(fs.readFileSync('image-targets/dadbod-test-can.json'));target.name='test-new'
  const imageNames=new Set([path.basename(target.imagePath),...Object.values(target.resources)])
  function bundle(includeImages){const f=new FormData();f.append('files',new Blob([JSON.stringify(target)]),'new.json');if(includeImages)for(const n of imageNames)f.append('files',new Blob([fs.readFileSync(path.join('image-targets',n))]),n);return f}
  assert.equal((await admin('uploads/targets','POST',bundle(false))).status,400)
  const uploaded=await admin('uploads/targets','POST',bundle(true));assert.equal(uploaded.status,201)
  const image=new FormData();image.append('files',new Blob([fs.readFileSync('image-targets/elysian_1_cropped.png')]),'art.png')
  const artwork=(await admin('uploads/labels','POST',image)).data
  label=(await admin('labels/'+label.id,'PATCH',{...uploaded.data,sourceImage:artwork.url,status:'active'})).data
  assert.equal(label.status,'active')
  assert.equal((await req('/api/runtime/target/test-new')).status,404)
  await admin('experiences/'+brewer.id,'PATCH',{config:{beerName:'Default',colors:{shirt:11,cap:22}}})
  const assignment=(await admin('assignments','POST',{labelId:label.id,experienceId:brewer.id,overrides:{beerName:'New IPA',colors:{shirt:33}}})).data
  assert.ok(assignment.id)
  const second=(await admin('assignments','POST',{labelId:label.id,experienceId:game.id,priority:10})).data
  let runtime=(await req('/api/runtime/target/test-new')).data
  assert.equal(runtime.experiences[0].implementationKey,'brewer-tour')
  assert.deepEqual(runtime.experiences[0].config.colors,{shirt:33,cap:22})
  assert.equal(runtime.experiences[0].config.beerName,'New IPA')
  const stored=(await req(label.targetFile)).data
  assert.deepEqual(stored.properties,target.properties)
  assert.equal((await fetch(base+stored.imagePath)).status,200)
  assert.equal((await admin('labels/'+label.id,'PATCH',{targetName:'mismatch'})).status,400)
  assert.equal((await req('/api/labels/'+label.id+'/experiences')).data.length,2)
  assert.equal((await req('/api/labels/by-target/test-new')).data.id,label.id)
  await admin('assignments/'+assignment.id,'PATCH',{enabled:false})
  assert.equal((await req('/api/runtime/target/test-new')).data.experiences[0].implementationKey,'pumpkin-game')
  await admin('experiences/'+game.id,'PATCH',{status:'disabled'})
  assert.equal((await req('/api/runtime/target/test-new')).status,404)
  await admin('assignments/'+assignment.id,'PATCH',{enabled:true})
  await admin('labels/'+label.id,'PATCH',{status:'disabled'})
  assert.equal((await req('/api/labels/'+label.id)).status,404)
  assert.equal((await req('/api/runtime/manifest','POST',{})).status,405)
  assert.equal((await fetch(base+'/api/admin/labels',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403)
  assert.equal((await req('/api/admin/labels','GET',undefined,{Origin:'https://evil.example'})).status,403)
  const hostStatus=await new Promise((resolve,reject)=>{require('node:http').get(base+'/api/admin/labels',{headers:{Host:'evil.example'}},r=>{r.resume();resolve(r.statusCode)}).on('error',reject)})
  assert.equal(hostStatus,403)
  assert.equal((await admin('experiences/'+brewer.id,'PATCH',JSON.parse('{"config":{"__proto__":{"polluted":true}}}'))).status,400)
  assert.equal({}.polluted,undefined)
  await admin('assignments/'+second.id,'DELETE')
  assert.equal((await admin('assignments')).data.some(a=>a.id===second.id),false)
  await new Promise(r=>app.server.close(r));app.repo.close()
  app=createApp(options)
  assert.equal(app.repo.get('labels',label.id).displayName,'New IPA')
  assert.equal(app.repo.all('labels').length,3)
  app.repo.remove('labels',label.id)
  assert.equal(app.repo.all('assignments').some(a=>a.labelId===label.id),false)
  app.repo.remove('experiences',brewer.id)
  assert.equal(app.repo.all('assignments').some(a=>a.experienceId===brewer.id),false)
 }finally{if(app.server.listening)await new Promise(r=>app.server.close(r));app.repo.close();fs.rmSync(dir,{recursive:true,force:true})}
})
