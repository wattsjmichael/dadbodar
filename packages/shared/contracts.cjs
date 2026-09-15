const implementations = ['pumpkin-game', 'brewer-tour']
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) }
function merge(a = {}, b = {}) {
  const out = {...a}
  for (const [k, v] of Object.entries(b)) {
    if (['__proto__', 'prototype', 'constructor'].includes(k)) throw new Error('Unsafe configuration key')
    out[k] = object(v) ? merge(object(a[k]) ? a[k] : {}, v) : v
  }
  return out
}
function config(value) {
  if (!object(value)) throw new Error('Configuration must be a JSON object')
  return merge({}, value)
}
module.exports = {implementations, merge, config}
