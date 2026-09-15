const fs = require('node:fs')
const path = require('node:path')
function seed(repo,service,storage,projectRoot) {
 if(repo.db.prepare("SELECT value FROM app_meta WHERE key='seeded'").get()) return
 const targetDir=path.join(projectRoot,'image-targets')
 const targetFile=path.join(targetDir,'dadbod-test-can.json')
 const target=JSON.parse(fs.readFileSync(targetFile,'utf8'))
 const names=new Set([path.basename(target.imagePath),...Object.values(target.resources || {}).map(p=>path.basename(p))])
 const bundle=[{name:'dadbod-test-can.json',buffer:fs.readFileSync(targetFile)},...Array.from(names,n=>({name:n,buffer:fs.readFileSync(path.join(targetDir,n))}))]
 const imported=storage.target(bundle)
 const sourceImage=storage.image(fs.readFileSync(path.join(targetDir,target.resources.croppedImage)),'labels')
 repo.db.exec('BEGIN')
 try {
  const first=service.save('labels',{internalName:'elysian-demo',displayName:'Elysian bottle — working target',...imported,sourceImage,physicalWidth:88,circumference:191,status:'active'})
  const second=service.save('labels',{internalName:'brewer-sample',displayName:'Brewer Tour sample — add your label',targetName:'brewer-sample',targetType:'cylindrical',status:'draft'})
  const game=service.save('experiences',{name:'Pumpkin Invasion',slug:'pumpkin-invasion',experienceType:'GAME',implementationKey:'pumpkin-game',status:'active',description:'Existing owl and pumpkin AR game.'})
  const brewer=service.save('experiences',{name:'Brewer Tour',slug:'brewer-tour',experienceType:'BREWER_TOUR',implementationKey:'brewer-tour',status:'active',description:'Meet the Brewer: five-step miniature brewery walkthrough.',config:{breweryName:'Dadbod Brewing',beerName:'Example IPA'}})
  service.save('assignments',{labelId:first.id,experienceId:game.id})
  service.save('assignments',{labelId:second.id,experienceId:brewer.id,overrides:{beerName:'Your next beer'}})
  repo.db.prepare("INSERT INTO app_meta VALUES ('seeded','1')").run();repo.db.exec('COMMIT')
 } catch(e) { repo.db.exec('ROLLBACK');throw e }
}
module.exports={seed}
