const {spawn}=require('node:child_process')
const path=require('node:path')
const root=path.resolve(__dirname,'..')
const children=[]
let stopping=false
function stop(code=0){if(stopping)return;stopping=true;for(const c of children)c.kill('SIGTERM');setTimeout(()=>process.exit(code),500).unref()}
for(const args of [['apps/api/server.cjs'],['node_modules/webpack-dev-server/bin/webpack-dev-server.js','--mode=development','--config','config/webpack.config.js']]){
 const child=spawn(process.execPath,args,{cwd:root,stdio:'inherit',env:process.env});children.push(child)
 child.on('error',e=>{console.error(e);stop(1)})
 child.on('exit',code=>{if(!stopping)stop(code || 0)})
}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop())
