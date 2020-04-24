const Directual = require('../../lib/directual')

const config = {
  appID: '49f30984-cfba-43cb-8803-958b54f7e374',
  apiHost: 'http://localhost:8081'
}
const api = new Directual.default(config)

//example read data from API-endpoint with name `test` from structure UsageHistory
api
  .structure('UsageHistory')
  .getData('test')
  .then((response) => {
    console.dir(response, { depth: null })
  })
  .catch((e) => {
    if (e.response.status === 403) {
      //todo: api endpoint required authorisation
    }
    if (e.response.status === 400) {
      //todo: api endpoint not found
    }
  })

//example for write data {id:1} to Api-endpoint with name `test` from structure UsageHistory
api
  .structure('UsageHistory')
  .setData('test', { id: 1 })
  .then((response) => {
    console.dir(response, { depth: null })
  })
  .catch((e) => {
    if (e.response.status === 403) {
      //todo: api endpoint required authorisation
    }
    if (e.response.status === 400) {
      //todo: api endpoint not found
    }
  })
