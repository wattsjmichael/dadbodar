// Execute the production bundle, not just the source module. This catches mixed
// ESM/CommonJS runtime crashes that compilation alone does not catch.
const vm = require('node:vm')
const fs = require('node:fs')
const assert = require('node:assert/strict')
const nodes = new Map()
const element = () => ({setAttribute() {}, appendChild() {}, removeChild() {}, style: {}, childNodes: []})
const querySelector = id => {
  if (!nodes.has(id)) nodes.set(id, element())
  return nodes.get(id)
}
const context = {
  document: {createElement: element, createTextNode: element, querySelector, head: element(), addEventListener() {}},
  window: {addEventListener() {}, isSecureContext: false, location: {search: ''}},
  navigator: {userAgent: 'desktop', platform: 'test'},
  console, setTimeout, clearTimeout, URLSearchParams,
}
vm.runInNewContext(fs.readFileSync('dist/bundle.js', 'utf8'), context)
assert.equal(typeof querySelector('#start').onclick, 'function', 'START AR handler installed')
querySelector('#start').onclick()
assert.equal(querySelector('#message').textContent, 'A secure connection is required.')
console.log('PASS: production bundle executes, START AR handler exists and responds')
context.window.location.search = '?experience=brewer-tour'
nodes.clear()
vm.runInNewContext(fs.readFileSync('dist/bundle.js', 'utf8'), context)
assert.equal(typeof querySelector('#start').onclick, 'function')
querySelector('#start').onclick()
assert.equal(querySelector('#message').textContent, 'A secure connection is required.')
console.log('PASS: Brewer Tour production entry executes and START AR responds')
