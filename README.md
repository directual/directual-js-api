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

Default stream host: `https://api.alfa.directual.com` (override via `streamApiHost` config).

#### Init/Subscribe streaming (`initStream`) — recommended

Two-phase mechanism: POST to init returns a `streamId`, then we subscribe to the SSE stream.

- Init: `POST /good/api/v5/stream/init/{structure}/{method}`
- Subscribe: `GET /api/v5/stream/subscribe/{streamId}`

```js
const stream = api
  .structure('ai_actions')
  .initStream(
    'platformAIActions',
    { prompt: 'hello' },       // request body
    { sessionID: '...' },      // query params
    {
      onData: (data, event) => {
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

// await completion
stream.promise.then(() => console.log('done'));

// get the streamId (resolves after init completes)
stream.streamId.then(id => console.log('stream id:', id));
```

You can also use the two phases separately:

```js
// Phase 1: init — get streamId
const streamId = await api
  .structure('ai_actions')
  .streamInit('platformAIActions', { prompt: 'hello' }, { sessionID: '...' });

// Phase 2: subscribe — read SSE events
const stream = api
  .structure('ai_actions')
  .streamSubscribe(streamId, {
    onData: (data, event) => console.log(event, data),
    onComplete: () => console.log('done'),
  });
```

#### Legacy: single-request streaming (`setStream`)

Single POST where the response body IS the SSE stream.  
Endpoint: `POST /good/api/v5/stream/{structure}/{method}`.

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

### Proxying streams via Next.js Route Handlers

If you proxy stream requests through Next.js Route Handlers, keep in mind that `initStream` uses two different request types through different paths:

- **Init** (`POST .../stream/init/{structure}/{method}`) — regular JSON request, returns `{ streamId, status }`
- **Subscribe** (`GET .../stream/subscribe/{streamId}`) — SSE stream

These go through different base paths, so you need **two separate Route Handlers**. With `streamApiHost: '/api'` the resulting Next.js paths are:
- `/api/good/api/v5/stream/...` (init)
- `/api/api/v5/stream/subscribe/...` (subscribe)

> **Gotcha:** Don't hardcode `Accept: text/event-stream` for all requests — the init phase will break with "Struct not found". Forward the original headers instead.

#### Init Route Handler

```ts
// app/api/good/api/v5/stream/[...path]/route.ts
const STREAM_HOST = 'https://api.alfa.directual.com';

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  const targetUrl = `${STREAM_HOST}/good/api/v5/stream/${path.join('/')}${searchParams ? `?${searchParams}` : ''}`;
  const body = await request.text();

  const headers: Record<string, string> = {
    'Content-Type': request.headers.get('Content-Type') || 'application/json',
  };
  const accept = request.headers.get('Accept');
  if (accept) {
    headers['Accept'] = accept;
  }

  const response = await fetch(targetUrl, { method: 'POST', headers, body });

  if (!response.ok) {
    return new Response(await response.text(), { status: response.status });
  }

  const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
  const responseHeaders: Record<string, string> = { 'Content-Type': contentType };

  if (contentType.includes('text/event-stream')) {
    responseHeaders['Cache-Control'] = 'no-cache';
    responseHeaders['Connection'] = 'keep-alive';
  }

  return new Response(response.body, { headers: responseHeaders });
}
```

#### Subscribe Route Handler

```ts
// app/api/api/v5/stream/subscribe/[streamId]/route.ts
const STREAM_HOST = 'https://api.alfa.directual.com';

export async function GET(
  _request: Request,
  context: { params: Promise<{ streamId: string }> }
) {
  const { streamId } = await context.params;

  const response = await fetch(
    `${STREAM_HOST}/api/v5/stream/subscribe/${streamId}`,
    { headers: { Accept: 'text/event-stream' } }
  );

  if (!response.ok) {
    return new Response(await response.text(), { status: response.status });
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

#### Types

```ts
import { InitStreamResponse, StreamCallbacks, StreamResponse } from 'directual-api';

interface StreamCallbacks {
  onData: (data: any, event: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

interface StreamResponse {
  abort: () => void;
  promise: Promise<void>;
}

interface InitStreamResponse {
  abort: () => void;
  promise: Promise<void>;
  streamId: Promise<string>;
}
```
