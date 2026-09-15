const fs = require('node:fs')
const path = require('node:path')
const {DatabaseSync} = require('node:sqlite')
const {randomUUID} = require('node:crypto')
const tables = {labels: 'labels', experiences: 'experiences', assignments: 'label_experience_assignments'}
const fields = {
 labels: ['internalName','displayName','sourceImage','targetFile','targetType','targetName','physicalWidth','physicalHeight','circumference','radius','radiusTop','radiusBottom','status'],
 experiences: ['name','slug','description','thumbnail','experienceType','implementationKey','status','config'],
 assignments: ['labelId','experienceId','enabled','priority','overrides'],
}
function decode(row) {
 if (!row) return null
 const r = {...row}
 for (const k of ['config','overrides']) if (k in r) r[k] = JSON.parse(r[k])
 if ('enabled' in r) r.enabled = !!r.enabled
 return r
}
function createRepository(filename) {
 fs.mkdirSync(path.dirname(filename), {recursive:true})
 const db = new DatabaseSync(filename)
 db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;')
 db.exec(fs.readFileSync(path.join(__dirname,'migrations/001.sql'),'utf8'))
 const table = kind => { if (!tables[kind]) throw new Error('Unknown entity'); return tables[kind] }
 return {
  db,
  all(kind) { return db.prepare(`SELECT * FROM ${table(kind)} ORDER BY updatedAt DESC, id`).all().map(decode) },
  get(kind,id) { return decode(db.prepare(`SELECT * FROM ${table(kind)} WHERE id=?`).get(id)) },
  save(kind, data, id) {
   const previous = id ? this.get(kind,id) : null
   if (id && !previous) throw Object.assign(new Error('Record not found'),{status:404})
   const now = new Date().toISOString()
   const row = {...data,id:id || randomUUID(),createdAt:previous?.createdAt || now,updatedAt:now}
   const keys = ['id',...fields[kind],'createdAt','updatedAt']
   const values = keys.map(k => ['config','overrides'].includes(k) ? JSON.stringify(row[k]) : typeof row[k] === 'boolean' ? Number(row[k]) : row[k] ?? null)
   db.prepare(`INSERT INTO ${table(kind)} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${keys.filter(k=>k!=='id').map(k=>`${k}=excluded.${k}`).join(',')}`).run(...values)
   return this.get(kind,row.id)
  },
  remove(kind,id) { return db.prepare(`DELETE FROM ${table(kind)} WHERE id=?`).run(id).changes > 0 },
  close() { db.close() },
 }
}
module.exports = {createRepository,fields}
