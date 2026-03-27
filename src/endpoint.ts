import { extractResponseData } from './utils';
import axios from 'axios';

const axiosInstance = axios.create({
  headers: {
    post: {
      'Content-Type': 'application/json',
    },
  },
});

/** Коллбэки для SSE-стрима */
export interface StreamCallbacks {
  onData: (data: any, event: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

/** Управление стримом: abort + промис завершения */
export interface StreamResponse {
  abort: () => void;
  promise: Promise<void>;
}

/** Управление стримом через init/subscribe: abort + промис + streamId */
export interface InitStreamResponse {
  abort: () => void;
  promise: Promise<void>;
  streamId: Promise<string>;
}

/** Распарсенное SSE-событие */
interface SSEEvent {
  type: string;
  data: any;
}

/**
 * Парсит буфер SSE-событий.
 * Разбивает по двойному переводу строки, вытаскивает event: и data: поля.
 * Directual шлёт двойную JSON-кодировку (data:"<json-строка>"),
 * поэтому парсим рекурсивно — если после первого parse получили строку, парсим ещё раз.
 */
function parseSSEBuffer(buffer: string): { events: SSEEvent[]; remaining: string } {
  const events: SSEEvent[] = [];
  const parts = buffer.split('\n\n');

  // Последний кусок может быть незавершённым
  const remaining = parts.pop() || '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.trim()) continue;

    const lines = part.split('\n');
    const dataLines: string[] = [];
    let eventType = 'message';

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      // event-тип (start, chunk, done)
      if (line.indexOf('event: ') === 0) {
        eventType = line.slice(7).trim();
      } else if (line.indexOf('event:') === 0) {
        eventType = line.slice(6).trim();
        // data-поле
      } else if (line.indexOf('data: ') === 0) {
        dataLines.push(line.slice(6));
      } else if (line.indexOf('data:') === 0) {
        dataLines.push(line.slice(5));
      }
    }

    if (dataLines.length > 0) {
      const rawData = dataLines.join('\n');
      let parsed: any = rawData;
      try {
        parsed = JSON.parse(rawData);
        // Двойная кодировка — если получили строку, пробуем распарсить ещё раз
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch (e) {
            // Не JSON внутри — ну и хуй с ним, оставляем строку
          }
        }
      } catch (e) {
        // Совсем не JSON — отдаём как есть
      }
      events.push({ type: eventType, data: parsed });
    }
  }

  return { events, remaining };
}

// Ключи конфига, которые не должны попадать в query-параметры
const INTERNAL_CONFIG_KEYS = ['apiHost', 'streamApiHost'];

export default class Endpoint {
  name: string;
  config: any;

  /**
   * GET request for API V5
   *
   * @return {Promise}
   */
  getData(name: string, params?: object, options?: object) {
    return axiosInstance
      .request({
        method: 'GET',
        url: `/good/api/v5/data/${this.name}/${name}`,
        baseURL: `${this.config.apiHost}`,
        params: { ...this.config, ...params },
        ...options,
      })
      .then(extractResponseData);
  }

  /**
   * POST request for API V5
   *
   * @return {Promise}
   */
  setData(name: string, data?: object, params?: object) {
    return axiosInstance
      .request({
        method: 'POST',
        url: `/good/api/v5/data/${this.name}/${name}`,
        baseURL: `${this.config.apiHost}`,
        params: { ...this.config, ...params },
        data,
      })
      .then(extractResponseData);
  }

  /**
   * POST-стрим через SSE.
   * URL: /good/api/v5/stream/{структура}/{метод}
   *
   * @return {StreamResponse} — abort() для отмены, promise для ожидания завершения
   */
  setStream(
    name: string,
    data?: object,
    params?: object,
    callbacks?: StreamCallbacks,
  ): StreamResponse {
    const url = this.buildStreamUrl(name, params);
    const controller = new AbortController();

    const promise = this.processStream(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      },
      callbacks,
    );

    return { abort: () => controller.abort(), promise };
  }

  /**
   * Инициализация стрима (фаза 1 нового механизма).
   * POST на /good/api/v5/stream/init/{структура}/{метод} → streamId
   */
  async streamInit(name: string, data?: object, params?: object): Promise<string> {
    const url = this.buildStreamInitUrl(name, params);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    if (typeof result === 'string') return result;
    if (result && result.streamId) return result.streamId;
    throw new Error('streamInit: streamId не найден в ответе');
  }

  /**
   * Подписка на стрим по streamId (фаза 2 нового механизма).
   * GET на /api/v5/stream/subscribe/{streamId}
   */
  streamSubscribe(streamId: string, callbacks?: StreamCallbacks): StreamResponse {
    const host = (this.config.streamApiHost || '').replace(/\/+$/, '');
    const url = `${host}/api/v5/stream/subscribe/${streamId}`;
    const controller = new AbortController();

    const promise = this.processStream(
      url,
      {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      },
      callbacks,
    );

    return { abort: () => controller.abort(), promise };
  }

  /**
   * Стрим через init/subscribe (новый механизм Directual).
   * 1. POST на /good/api/v5/stream/init/{структура}/{метод} → streamId
   * 2. GET на /api/v5/stream/subscribe/{streamId} → SSE-стрим
   *
   * Объединяет обе фазы, API коллбэков идентичен setStream.
   */
  initStream(
    name: string,
    data?: object,
    params?: object,
    callbacks?: StreamCallbacks,
  ): InitStreamResponse {
    const controller = new AbortController();
    let resolveStreamId!: (id: string) => void;
    let rejectStreamId!: (err: Error) => void;

    const streamIdPromise = new Promise<string>((resolve, reject) => {
      resolveStreamId = resolve;
      rejectStreamId = reject;
    });

    // Глушим unhandled rejection если никто не слушает streamId
    streamIdPromise.catch(() => {});

    const promise = (async () => {
      const initUrl = this.buildStreamInitUrl(name, params);

      let initResponse: Response;
      try {
        initResponse = await fetch(initUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          rejectStreamId(new Error('Aborted'));
          return;
        }
        const err = error instanceof Error ? error : new Error(String(error));
        rejectStreamId(err);
        if (callbacks && callbacks.onError) callbacks.onError(err);
        throw err;
      }

      if (!initResponse.ok) {
        const err = new Error(`HTTP ${initResponse.status}: ${initResponse.statusText}`);
        rejectStreamId(err);
        if (callbacks && callbacks.onError) callbacks.onError(err);
        throw err;
      }

      let result: any;
      try {
        result = await initResponse.json();
      } catch (error) {
        const err = new Error('streamInit: невалидный JSON в ответе');
        rejectStreamId(err);
        if (callbacks && callbacks.onError) callbacks.onError(err);
        throw err;
      }

      const streamId = typeof result === 'string' ? result : result && result.streamId;
      if (!streamId) {
        const err = new Error('streamInit: streamId не найден в ответе');
        rejectStreamId(err);
        if (callbacks && callbacks.onError) callbacks.onError(err);
        throw err;
      }

      resolveStreamId(streamId);

      const host = (this.config.streamApiHost || '').replace(/\/+$/, '');
      const subscribeUrl = `${host}/api/v5/stream/subscribe/${streamId}`;

      await this.processStream(
        subscribeUrl,
        {
          method: 'GET',
          headers: { Accept: 'text/event-stream' },
          signal: controller.signal,
        },
        callbacks,
      );
    })();

    return {
      abort: () => controller.abort(),
      promise,
      streamId: streamIdPromise,
    };
  }

  /**
   * Собирает URL для стрим-эндпоинта с query-параметрами
   */
  private buildStreamUrl(method: string, params?: object): string {
    const allParams: Record<string, any> = { ...this.config, ...params };
    const query = new URLSearchParams();

    Object.keys(allParams).forEach(key => {
      if (INTERNAL_CONFIG_KEYS.indexOf(key) !== -1) return;
      if (allParams[key] !== undefined && allParams[key] !== null) {
        query.append(key, String(allParams[key]));
      }
    });

    // Обрезаем trailing слэши, чтобы '' и '/' давали same-origin путь
    const host = (this.config.streamApiHost || '').replace(/\/+$/, '');
    return `${host}/good/api/v5/stream/${this.name}/${method}?${query.toString()}`;
  }

  /**
   * URL для init-эндпоинта: /good/api/v5/stream/init/{структура}/{метод}
   */
  private buildStreamInitUrl(method: string, params?: object): string {
    const allParams: Record<string, any> = { ...this.config, ...params };
    const query = new URLSearchParams();

    Object.keys(allParams).forEach(key => {
      if (INTERNAL_CONFIG_KEYS.indexOf(key) !== -1) return;
      if (allParams[key] !== undefined && allParams[key] !== null) {
        query.append(key, String(allParams[key]));
      }
    });

    const host = (this.config.streamApiHost || '').replace(/\/+$/, '');
    return `${host}/good/api/v5/stream/init/${this.name}/${method}?${query.toString()}`;
  }

  /**
   * Читает SSE-стрим, парсит события, дёргает коллбэки.
   * При abort тихо завершается без ошибки.
   */
  private async processStream(
    url: string,
    init: RequestInit,
    callbacks?: StreamCallbacks,
  ): Promise<void> {
    let response: Response;

    try {
      response = await fetch(url, init);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      const err = error instanceof Error ? error : new Error(String(error));
      if (callbacks && callbacks.onError) callbacks.onError(err);
      throw err;
    }

    if (!response.ok) {
      const err = new Error(`HTTP ${response.status}: ${response.statusText}`);
      if (callbacks && callbacks.onError) callbacks.onError(err);
      throw err;
    }

    const body = response.body;
    if (!body) {
      const err = new Error('Response body is null — стрим недоступен');
      if (callbacks && callbacks.onError) callbacks.onError(err);
      throw err;
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;

        buffer += decoder.decode(chunk.value, { stream: true });
        const parsed = parseSSEBuffer(buffer);
        buffer = parsed.remaining;

        for (let i = 0; i < parsed.events.length; i++) {
          if (callbacks && callbacks.onData) {
            callbacks.onData(parsed.events[i].data, parsed.events[i].type);
          }
        }
      }

      // Дочитываем остатки буфера
      if (buffer.trim()) {
        const parsed = parseSSEBuffer(buffer + '\n\n');
        for (let i = 0; i < parsed.events.length; i++) {
          if (callbacks && callbacks.onData) {
            callbacks.onData(parsed.events[i].data, parsed.events[i].type);
          }
        }
      }

      if (callbacks && callbacks.onComplete) {
        callbacks.onComplete();
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      const err = error instanceof Error ? error : new Error(String(error));
      if (callbacks && callbacks.onError) callbacks.onError(err);
      throw err;
    }
  }
}
