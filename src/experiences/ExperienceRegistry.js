const {merge}=require('../../packages/shared/contracts.cjs')
const brewerDefaults=require('./brewer-tour/config')
const implementations={
 'pumpkin-game': {
  prepare(root,config,onError){
   root.experienceConfig=config
   root.id='game-root'
   root.innerHTML='<a-entity id="owl" gltf-model="url(./models/owl.glb)"></a-entity>'
   root.addEventListener('game-error',onError)
   root.querySelector('#owl').addEventListener('model-error',onError)
  },
  cleanup(root,onError){root.removeEventListener('game-error',onError);root.querySelector('#owl')?.removeEventListener('model-error',onError);root.innerHTML='';root.removeAttribute('id')},
 },
 'brewer-tour': {prepare(root,config){root.brewerConfig=merge(brewerDefaults,config)},cleanup(){}},
}
// One mounted experience owns shared mobile controls. Reacquisition of the same
// target resumes; changing labels disposes the previous instance before mounting.
class ExperienceRegistry {
 constructor(onError=()=>{},modules=implementations){this.onError=onError;this.modules=modules;this.current=null}
 launch(instance){
  const module=this.modules[instance.component]
  if(!module)throw new Error('Unknown experience: '+instance.component)
  if(this.current!==instance){
   this.dispose()
   module.prepare(instance.root,instance.config || {},this.onError)
   instance.root.setAttribute(instance.component,'')
   this.current=instance
  }
  instance.root.setAttribute(instance.component,'tracked',true)
 }
 pause(instance=this.current){if(instance && this.current===instance)instance.root.setAttribute(instance.component,'tracked',false)}
 dispose(){
  if(!this.current)return
  const i=this.current
  this.pause();i.root.removeAttribute(i.component);this.modules[i.component].cleanup(i.root,this.onError)
  this.current=null
 }
}
module.exports={ExperienceRegistry,implementations}
