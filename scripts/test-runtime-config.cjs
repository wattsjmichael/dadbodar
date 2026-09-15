const {test}=require('node:test'),assert=require('node:assert/strict')
const {createRuntimeConfig,loadCampaigns}=require('../src/runtime-config')
const {ExperienceRegistry}=require('../src/experiences/ExperienceRegistry')
test('runtime preserves static default, resolves API targets and refuses failures',async()=>{
 const fallback=()=>['static']
 assert.deepEqual(await loadCampaigns(fallback,{location:{search:''}},()=>{throw Error('must not fetch')}),['static'])
 const requests=[]
 const fetcher=async url=>{requests.push(url);return {ok:true,json:async()=>url.endsWith('manifest')?{targets:[{label:{id:'l',targetName:'test',targetFile:'/uploads/targets/test.json'},experiences:[{implementationKey:'brewer-tour',config:{beerName:'Test IPA',labelTexture:'/uploads/labels/label.png'}}]}]}:{name:'test',type:'CYLINDER',imagePath:'/uploads/targets/image.png',properties:{width:720},resources:{originalImage:'/uploads/targets/original.png'}}}}
 const client=createRuntimeConfig({base:'https://api.example/',href:'https://runtime.example/',fetcher})
 const c=(await client.campaigns())[0]
 assert.equal(c.target.imagePath,'https://api.example/uploads/targets/image.png')
 assert.equal(c.config.labelTexture,'https://api.example/uploads/labels/label.png')
 assert.equal(c.component,'brewer-tour');assert.deepEqual(c.target.properties,{width:720})
 await client.getExperienceForTarget('test');assert.equal(requests.at(-1),'https://api.example/api/runtime/target/test')
 await assert.rejects(()=>loadCampaigns(fallback,{location:{search:'?config=api',href:'https://runtime.example/'}},async()=>({ok:false,status:503})),/503/)
 await assert.rejects(()=>createRuntimeConfig({href:'https://runtime.example/',fetcher:async()=>({ok:true,json:async()=>({targets:[]})})}).campaigns(),/No active labels/)
})
test('one mounted experience: same label resumes; another disposes shared controls',()=>{
 let prepares=0,removes=0,tracked=[]
 const modules={test:{prepare(){prepares++},cleanup(){removes++}}}
 const instance=()=>({component:'test',root:{setAttribute(...args){tracked.push(args)},removeAttribute(){}}})
 const a=instance(),b=instance(),registry=new ExperienceRegistry(()=>{},modules)
 registry.launch(a);registry.pause();registry.launch(a)
 assert.equal(prepares,1);assert.equal(removes,0)
 registry.launch(b);assert.equal(prepares,2);assert.equal(removes,1)
 const before=tracked.length;registry.pause(a);assert.equal(tracked.length,before)
 registry.dispose();assert.equal(removes,2);assert.equal(registry.current,null)
})
