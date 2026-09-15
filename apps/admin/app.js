'use strict'
const $=s=>document.querySelector(s)
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
let data={},page=0,search='',editing
const titles={labels:'Labels',experiences:'Experiences',assignments:'Assignments'}
const route=()=>location.hash.slice(1).split('/')
async function api(path,method='GET',body){
 const response=await fetch('/api/admin/'+path,{method,headers:{'X-Dadbod-Admin':'1',...(body && !(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined})
 const result=await response.json();if(!response.ok) throw new Error(result.error || 'Request failed');return result
}
const status=r=>`<span class="tag ${esc(r.status)}">${esc(r.status)}</span>`
const link=(kind,r)=>`<a href="#${kind}/${r.id}">${esc(r.displayName || r.name)}</a>`
const image=url=>url?`<img alt="" src="${esc(url)}">`:'<span class="muted">No image</span>'
const button=(action,kind,id,text,style='secondary')=>`<button type="button" class="${style}" data-action="${action}" data-kind="${kind}" data-id="${id}">${text}</button>`
function assignmentRows(rows){return rows.map(a=>`<tr><td>${link('labels',data.labels.find(l=>l.id===a.labelId))}</td><td>${link('experiences',data.experiences.find(e=>e.id===a.experienceId))}</td><td>${a.enabled?'Enabled':'Disabled'}<small>${a.enabled && data.labels.find(l=>l.id===a.labelId).status==='active' && data.experiences.find(e=>e.id===a.experienceId).status==='active'?'Active in runtime':'Not live'}</small></td><td>${a.priority}</td><td><div class="actions">${button('edit','assignments',a.id,'Configure')}${button('toggle','assignments',a.id,a.enabled?'Disable':'Enable')}${button('delete','assignments',a.id,'Remove','danger')}</div></td></tr>`).join('')}
const table=(heads,rows)=>`<div class="table-wrap"><table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${heads.length}" class="empty">No records yet.</td></tr>`}</tbody></table></div>`
async function refresh(){
 try{
  const results=await Promise.all(['labels','experiences','assignments','dashboard','implementations'].map(p=>api(p)))
  ;['labels','experiences','assignments','dashboard','implementations'].forEach((k,i)=>data[k]=results[i])
  render()
 }catch(e){$('#notice').textContent=e.message}
}
function render(){
 if(!data.dashboard)return
 const [kind='dashboard',id]=route();const current=titles[kind]?kind:'dashboard'
 document.querySelectorAll('nav a').forEach(a=>a.setAttribute('aria-current',a.hash==='#'+current?'page':'false'))
 if(current==='dashboard'){
  const d=data.dashboard
  $('#view').innerHTML=`<header><div><h1>Control room</h1><p>Your labels. Your experiences.</p></div><span class="tag">LOCAL DEVELOPMENT</span></header><div class="cards">${[['TOTAL LABELS',d.totalLabels],['ACTIVE LABELS',d.activeLabels],['TOTAL EXPERIENCES',d.totalExperiences],['ACTIVE ASSIGNMENTS',d.activeAssignments]].map(([t,n])=>`<div class="card"><small>${t}</small><strong>${n}</strong></div>`).join('')}</div><div class="columns"><section class="section"><h2>Recent labels</h2>${d.recentLabels.map(l=>`<p>${link('labels',l)} ${status(l)}</p>`).join('') || 'No labels yet.'}</section><section class="section"><h2>Recent assignments</h2>${d.recentAssignments.map(a=>`<p>${esc(a.labelName)} → ${esc(a.experienceName)}</p>`).join('') || 'No assignments yet.'}</section></div><section class="section"><h2>Needs attention</h2>${[['unassignedLabels','Labels without an experience','labels'],['unusedExperiences','Experiences without a label','experiences'],['missingTargets','Labels missing target data','labels']].map(([key,title,k])=>`<h3>${title} (${d.warnings[key].length})</h3>${d.warnings[key].map(r=>link(k,r)).join(' · ') || '<span class="muted">All clear</span>'}`).join('')}</section>`
  return
 }
 if(id && current!=='assignments') return detail(current,id)
 $('#view').innerHTML=`<header><div><h1>${titles[current]}</h1><p>${data[current].length} total records</p></div>${button('add',current,'',current==='assignments'?'Create assignment':current==='labels'?'Add label':'Add experience','')}</header><div class="toolbar"><input id="search" type="search" aria-label="Search records" placeholder="Search ${current}" value="${esc(search)}"></div><div id="list"></div>`
 $('#search').oninput=e=>{search=e.target.value;page=0;renderList(current)}
 renderList(current)
}
function renderList(kind){
 const rows=data[kind].filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
 page=Math.min(page,Math.max(0,Math.ceil(rows.length/20)-1))
 const visible=rows.slice(page*20,page*20+20)
 let html
 if(kind==='assignments') html=table(['Label','Experience','Status','Priority','Actions'],assignmentRows(visible))
 else html=table(kind==='labels'?['Artwork','Label','Type / target','Status','Experiences','Actions']:['Thumbnail','Experience','Type / implementation','Status','Labels','Actions'],visible.map(r=>`<tr><td>${image(r.sourceImage || r.thumbnail)}</td><td>${link(kind,r)}<small>${esc(r.internalName || r.slug)}</small></td><td>${esc(r.targetType || r.experienceType)}<small>${esc(r.targetName || r.implementationKey)}</small></td><td>${status(r)}</td><td>${r.assignmentCount}</td><td><div class="actions">${button('edit',kind,r.id,'Edit')}${button('toggle',kind,r.id,r.status==='disabled'?'Set draft':'Disable')}${button('delete',kind,r.id,'Delete','danger')}</div></td></tr>`).join(''))
 $('#list').innerHTML=html+`<div class="pager"><button id="prev" class="secondary" ${page===0?'disabled':''}>Previous</button><span>${rows.length} results · page ${page+1} / ${Math.max(1,Math.ceil(rows.length/20))}</span><button id="next" class="secondary" ${(page+1)*20>=rows.length?'disabled':''}>Next</button></div>`
 $('#prev').onclick=()=>{page--;renderList(kind)};$('#next').onclick=()=>{page++;renderList(kind)}
}
function detail(kind,id){
 const r=data[kind].find(r=>r.id===id);if(!r){$('#view').textContent='Record not found';return}
 const attached=data.assignments.filter(a=>kind==='labels'?a.labelId===id:a.experienceId===id)
 const info=kind==='labels'?['internalName','targetName','targetType','physicalWidth','physicalHeight','circumference','radius','radiusTop','radiusBottom','createdAt','updatedAt']:['slug','experienceType','implementationKey','createdAt','updatedAt']
 $('#view').innerHTML=`<p><a href="#${kind}">← ${titles[kind]}</a></p><header><div><h1>${esc(r.displayName || r.name)}</h1>${status(r)}</div>${button('edit',kind,id,'Edit','')}</header><section class="section">${r.sourceImage || r.thumbnail?`<img class="detail-image" alt="Label or experience artwork" src="${esc(r.sourceImage || r.thumbnail)}">`:''}<dl>${info.map(k=>`<dt>${esc(k)}</dt><dd>${esc(r[k]??'—')}</dd>`).join('')}</dl>${kind==='labels'?`<h2>Target file status</h2><p>${r.targetFile?`Ready · <a href="${esc(r.targetFile)}" target="_blank" rel="noopener">View target JSON</a>`:'Missing — save as draft, then upload the generated bundle.'}</p>`:`<p>${esc(r.description)}</p><h2>Default configuration</h2><pre>${esc(JSON.stringify(r.config,null,2))}</pre>`}</section><section><header><h2>${kind==='labels'?'Attached experiences':'Used by labels'}</h2>${button('attach',kind,id,kind==='labels'?'Attach experience':'Attach label','')}</header>${table(['Label','Experience','Status','Priority','Actions'],assignmentRows(attached))}</section>`
}
function openEditor(kind,id='',preset={}){
 editing={kind,id};const r={...(data[kind].find(r=>r.id===id)||{}),...preset}
 $('#editor-title').textContent=(id?'Edit ':'Add ')+({labels:'label',experiences:'experience',assignments:'assignment'}[kind]);$('#form-error').textContent=''
 const field=(name,title,type='text',required=false)=>`<label>${title}<input name="${name}" type="${type}" value="${esc(r[name]??'')}" ${required?'required':''} ${type==='number'?'step="any" min="0.001"':''}></label>`
 const select=(name,title,values)=>`<label>${title}<select name="${name}">${values.map(v=>{const [key,label]=Array.isArray(v)?v:[v,v];return `<option value="${esc(key)}" ${r[name]===key?'selected':''}>${esc(label)}</option>`}).join('')}</select></label>`
 const json=(name,title)=>`<label>${title}<textarea name="${name}" spellcheck="false">${esc(JSON.stringify(r[name]||{},null,2))}</textarea></label>`
 const upload=(name,title,multiple=false)=>`<label>${title}<input type="file" name="${name}" ${multiple?'multiple accept=".json,.png,.jpg,.jpeg,.webp"':'accept="image/png,image/jpeg,image/webp"'}><small>${multiple?'Select ONE CLI target JSON and ALL generated images together. The imported name and type must match the label.':'PNG, JPEG or WebP. Existing image stays if no file is selected.'}</small></label>`
 let html=''
 if(kind==='labels') html=field('internalName','Internal name','text',true)+field('displayName','Display name','text',true)+upload('artwork','Label artwork')+select('targetType','Target type',['flat','cylindrical','conical'])+field('targetName','Tracking target key','text',true)+`<p class="muted">Measurements are in millimeters. Tracking uses the geometry already generated by the CLI; these fields document it.</p>`+['physicalWidth','physicalHeight','circumference','radius','radiusTop','radiusBottom'].map(k=>field(k,k+' (mm)','number')).join('')+upload('targetBundle','Generated target data + images',true)+select('status','Status',['draft','active','disabled'])
 if(kind==='experiences') html=field('name','Name','text',true)+field('slug','Slug','text',true)+field('description','Description')+upload('thumbnailUpload','Thumbnail')+select('experienceType','Experience type',['GAME','BREWER_TOUR','STORY','CUSTOM'])+select('implementationKey','Implementation',data.implementations)+select('status','Status',['draft','active','disabled'])+json('config','Default configuration (JSON object)')
 if(kind==='assignments') html=select('labelId','Label',data.labels.map(l=>[l.id,l.displayName]))+select('experienceId','Experience',data.experiences.map(e=>[e.id,e.name]))+`<label><input name="enabled" type="checkbox" ${r.enabled!==false?'checked':''}>Enabled</label><label>Priority (lowest number launches first)<input type="number" step="1" name="priority" value="${r.priority??0}" required></label>`+json('overrides','Configuration overrides (JSON object)')+'<p class="muted">An enabled assignment goes live only when both its label and experience are active. The runtime selects the first active assignment.</p>'
 $('#fields').innerHTML=html;$('#editor').showModal()
}
async function upload(input,category){
 if(!input.files.length)return null
 const form=new FormData();for(const f of input.files)form.append('files',f)
 return api('uploads/'+category,'POST',form)
}
$('#form').onsubmit=async e=>{
 e.preventDefault();const submit=$('#form button[type=submit]');submit.disabled=true;$('#form-error').textContent=''
 try{
  const {kind,id}=editing,form=e.target,d=Object.fromEntries(new FormData(form))
  for(const key of ['artwork','targetBundle','thumbnailUpload'])delete d[key]
  if(kind==='labels'){
   for(const k of ['physicalWidth','physicalHeight','circumference','radius','radiusTop','radiusBottom'])d[k]=d[k]?Number(d[k]):null
   const art=await upload(form.elements.artwork,'labels');if(art)d.sourceImage=art.url
   const target=await upload(form.elements.targetBundle,'targets')
   if(target){if(d.targetName!==target.targetName || d.targetType!==target.targetType)throw new Error(`This bundle is ${target.targetName} (${target.targetType}). Update the key/type fields to match and save again.`);Object.assign(d,target)}
  }
  if(kind==='experiences'){d.config=JSON.parse(d.config);const thumb=await upload(form.elements.thumbnailUpload,'thumbnails');if(thumb)d.thumbnail=thumb.url}
  if(kind==='assignments'){d.overrides=JSON.parse(d.overrides);d.enabled=form.elements.enabled.checked;d.priority=Number(d.priority)}
  await api(kind+(id?'/'+id:''),id?'PATCH':'POST',d)
  $('#editor').close();$('#notice').textContent='Saved.';await refresh()
 }catch(error){$('#form-error').textContent=error.message}finally{submit.disabled=false}
}
$('#cancel').onclick=()=>$('#editor').close()
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b)return
 const {action,kind,id}=b.dataset
 if(action==='add' || action==='edit')return openEditor(kind,id)
 if(action==='attach')return openEditor('assignments','',{[kind==='labels'?'labelId':'experienceId']:id})
 try{
  if(action==='delete'){if(!confirm('Delete this record and its assignments? Uploaded files are retained for backup.'))return;await api(kind+'/'+id,'DELETE')}
  if(action==='toggle'){const r=data[kind].find(r=>r.id===id);await api(kind+'/'+id,'PATCH',kind==='assignments'?{enabled:!r.enabled}:{status:r.status==='disabled'?'draft':'disabled'})}
  $('#notice').textContent='Updated.';await refresh()
 }catch(error){$('#notice').textContent=error.message}
})
window.addEventListener('hashchange',()=>{page=0;search='';render()})
refresh()
