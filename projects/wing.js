const utils = require('./helper/utils');

/* * * * * * * *
* ==> Correct adapter needs to be created.
*
*****************/
async function fetch() {
  const tvl = await utils.fetchURL('https://api.wing.finance/wing/governance/tvl')
  return tvl.data;
}

module.exports = {
  fetch
}