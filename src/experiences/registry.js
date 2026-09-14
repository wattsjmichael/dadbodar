const originalTarget = require('../../image-targets/dadbod-test-can.json')
const brewerConfig = require('./brewer-tour/config')

// Add another locally generated target here, keeping its unique internal name.
const campaigns = [
  {target: originalTarget, component: 'pumpkin-game'},
  // {target: require('../../image-targets/your-second-label.json'), component: 'brewer-tour', config: {...brewerConfig, beerName: 'Your Beer', labelTexture: './image-targets/your-label.jpg'}},
]

function getCampaigns() {
  // Explicit demo mode makes Experience #2 testable before a second target exists.
  if (new URLSearchParams(window.location.search).get('experience') === 'brewer-tour') {
    return [{target: originalTarget, component: 'brewer-tour', config: {...brewerConfig, beerName: 'Elysian', labelTexture: './image-targets/elysian_1_cropped.png'}}]
  }
  const names = campaigns.map(c => c.target.name)
  if (new Set(names).size !== names.length) throw new Error('Each campaign needs a unique image target name.')
  return campaigns
}
module.exports = {getCampaigns}
