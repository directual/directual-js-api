# directual-js-api
The Directual Web Library serves as the base JavaScript library for Directual based projects.  
https://directual.com/

## Install
```sh
npm install directual-api
```

## Usage

```js
const Directual = require('directual-api');

const api = new Directual.default({
  appID: '...',
  // apiHost: 'https://api.directual.com'           // optional, default
  // streamApiHost: 'https://api.alfa.directual.com' // optional, default (streaming is on alfa for now)
});
```

### Authentication

```js
// Login
api.auth.login('username', 'password').then((token) => {
  console.log('sessionID: ' + token.sessionID);
});

// Check session
api.auth.isAuthorize(sessionID, (isAuth, token) => {
  console.log('authorized:', isAuth);
});

// Logout
api.auth.logout(sessionID);
```

### Read data (GET)

```js
api
  .structure('UsageHistory')
  .getData('test', { sessionID: '...', page: 0 })
  .then((response) => {
    console.dir(response, { depth: null });
  })
  .catch((e) => {
    if (e.response.status === 403) {
      // API endpoint requires authorization
    }
    if (e.response.status === 400) {
      // API endpoint not found
    }
  });
```

### Write data (POST)

```js
api
  .structure('UsageHistory')
  .setData('test', { id: 1 }, { sessionID: '...' })
  .then((response) => {
    console.dir(response, { depth: null });
  })
  .catch((e) => {
    if (e.response.status === 403) {
      // API endpoint requires authorization
    }
    if (e.response.status === 400) {
      // API endpoint not found
    }
  });
```

### Streaming (SSE)

Streaming methods use Server-Sent Events over HTTP.  
Endpoint URL: `/good/api/v5/stream/{structure}/{method}` (instead of `/data/`).  
Default stream host: `https://api.alfa.directual.com` (override via `streamApiHost` config).

#### POST stream (`setStream`)

```js
const stream = api
  .structure('UsageHistory')
  .setStream(
    'test',
    { prompt: 'hello' },       // request body
    { sessionID: '...' },      // query params
    {
      onData: (data, event) => {
        // event: 'start' | 'chunk' | 'done'
        // data is auto-parsed from JSON (double-encoding handled)
        console.log(event, data);
      },
      onError: (error) => {
        console.error('stream error:', error);
      },
      onComplete: () => {
        console.log('stream finished');
      },
    },
  );

// abort the stream at any time
stream.abort();

// or await completion
stream.promise.then(() => {
  console.log('done');
});
```

#### Types

```ts
import { StreamCallbacks, StreamResponse } from 'directual-api';

interface StreamCallbacks {
  onData: (data: any, event: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

interface StreamResponse {
  abort: () => void;
  promise: Promise<void>;
}
```
