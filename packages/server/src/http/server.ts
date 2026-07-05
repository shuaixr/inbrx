import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CapturedMessage, ManagedServer, MessageStore } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '../../..', 'web/dist');

type MessageSummary = Pick<CapturedMessage, 'id' | 'receivedAt' | 'from' | 'to' | 'subject' | 'rawSizeBytes'>;

export function createHttpServer({ store }: { store: MessageStore }): ManagedServer {
  const server = http.createServer((request, response) => {
    handleRequest(request, response, store).catch((error: unknown) => {
      console.error(error);
      sendJson(response, 500, { error: 'Internal server error' });
    });
  });

  return {
    listen(port, host) {
      return new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          server.off('error', reject);
          resolve();
        });
      });
    },

    close() {
      return new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}

async function handleRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  store: MessageStore
): Promise<void> {
  const url = new URL(request.url || '/', 'http://localhost');

  if (url.pathname === '/api/health' && request.method === 'GET') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (url.pathname === '/api/messages' && request.method === 'GET') {
    sendJson(response, 200, {
      messages: store.list().map(toMessageSummary)
    });
    return;
  }

  if (url.pathname === '/api/messages' && request.method === 'DELETE') {
    const deleted = store.clear();
    sendJson(response, 200, { deleted });
    return;
  }

  const messageMatch = url.pathname.match(/^\/api\/messages\/([^/]+)$/);
  if (messageMatch && request.method === 'GET') {
    const message = store.get(decodeURIComponent(messageMatch[1] || ''));
    if (!message) {
      sendJson(response, 404, { error: 'Message not found' });
      return;
    }

    sendJson(response, 200, { message: toMessageDetail(message) });
    return;
  }

  if (messageMatch && request.method === 'DELETE') {
    const deleted = store.delete(decodeURIComponent(messageMatch[1] || ''));
    sendJson(response, deleted ? 200 : 404, { deleted });
    return;
  }

  await serveStatic(url.pathname, response);
}

function toMessageSummary(message: CapturedMessage): MessageSummary {
  return {
    id: message.id,
    receivedAt: message.receivedAt,
    from: message.from,
    to: message.to,
    subject: message.subject,
    rawSizeBytes: message.rawSizeBytes
  };
}

function toMessageDetail(message: CapturedMessage): CapturedMessage {
  return {
    ...toMessageSummary(message),
    cc: message.cc,
    bcc: message.bcc,
    headers: message.headers,
    text: message.text,
    html: message.html,
    attachments: message.attachments,
    raw: message.raw
  };
}

async function serveStatic(urlPath: string, response: http.ServerResponse): Promise<void> {
  const relativePath = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath.slice(1));
  const filePath = path.resolve(WEB_ROOT, relativePath);

  if (!filePath.startsWith(`${WEB_ROOT}${path.sep}`) && filePath !== WEB_ROOT) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      sendText(response, 404, 'Not found');
      return;
    }
  } catch {
    sendText(response, 404, 'Not found');
    return;
  }

  response.writeHead(200, {
    'content-type': contentTypeFor(filePath)
  });

  createReadStream(filePath).pipe(response);
}

function sendJson(response: http.ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(payload));
}

function sendText(response: http.ServerResponse, statusCode: number, text: string): void {
  response.writeHead(statusCode, {
    'content-type': 'text/plain; charset=utf-8'
  });
  response.end(text);
}

function contentTypeFor(filePath: string): string {
  if (filePath.endsWith('.html')) {
    return 'text/html; charset=utf-8';
  }

  if (filePath.endsWith('.css')) {
    return 'text/css; charset=utf-8';
  }

  if (filePath.endsWith('.js')) {
    return 'text/javascript; charset=utf-8';
  }

  return 'application/octet-stream';
}
