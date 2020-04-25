const Directual = require('../../lib/directual')

const config = {
  appID: '050e77bb-b0e6-4685-8712-a85774fad272',
  apiHost: 'http://localhost:8081', // custom server api
  sessionKey: 'sessionID' // custom server api
}
const api = new Directual.default(config)

//if you api endpoint requried autorisation, first of all, you must get sessionID key

api.auth.isAuthorize((isAuth, sessionID)=>{
  if(isAuth){
    console.log("sessionID")
  }else{
    api.auth.login("test", "test").then((res)=>{
      console.log("sessionID" + res.sessionID)
      api.auth.isAuthorize(()=>{
        console.log('ok')
      })
      //api.auth.logout(res.sessionID)
    }).catch((err)=>{
      console.log('login or password invalid')
    })
  }
})

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
