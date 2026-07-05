import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { serve, type ServerType } from '@hono/node-server';
import { Hono } from 'hono';
import type { CapturedMessage, ManagedServer, MessageStore } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '../../..', 'web/dist');

type MessageSummary = Pick<CapturedMessage, 'id' | 'receivedAt' | 'from' | 'to' | 'subject' | 'rawSizeBytes'>;

export function createHttpServer({ store }: { store: MessageStore }): ManagedServer {
  const app = createHttpApp({ store });
  let server: ServerType | null = null;

  return {
    listen(port, host) {
      return new Promise<void>((resolve, reject) => {
        const listeningServer = serve(
          {
            fetch: app.fetch,
            hostname: host,
            port
          },
          () => {
            listeningServer.off('error', reject);
            server = listeningServer;
            resolve();
          }
        );

        listeningServer.once('error', reject);
      });
    },

    close() {
      return new Promise<void>((resolve, reject) => {
        if (!server) {
          resolve();
          return;
        }

        server.close((error?: Error) => {
          if (error) {
            reject(error);
            return;
          }

          server = null;
          resolve();
        });
      });
    }
  };
}

export function createHttpApp({ store }: { store: MessageStore }): Hono {
  const app = new Hono();

  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  });

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  app.get('/api/messages', (c) =>
    c.json({
      messages: store.list().map(toMessageSummary)
    })
  );

  app.delete('/api/messages', (c) => {
    const deleted = store.clear();
    return c.json({ deleted });
  });

  app.get('/api/messages/:id', (c) => {
    const message = store.get(c.req.param('id'));
    if (!message) {
      return c.json({ error: 'Message not found' }, 404);
    }

    return c.json({ message: toMessageDetail(message) });
  });

  app.delete('/api/messages/:id', (c) => {
    const deleted = store.delete(c.req.param('id'));
    return c.json({ deleted }, deleted ? 200 : 404);
  });

  app.all('*', (c) => serveStatic(new URL(c.req.url).pathname));

  return app;
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
    raw: message.raw,
    smtp: message.smtp
  };
}

async function serveStatic(urlPath: string): Promise<Response> {
  const relativePath = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath.slice(1));
  const filePath = path.resolve(WEB_ROOT, relativePath);

  if (!filePath.startsWith(`${WEB_ROOT}${path.sep}`) && filePath !== WEB_ROOT) {
    return textResponse('Forbidden', 403);
  }

  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      return textResponse('Not found', 404);
    }
  } catch {
    return textResponse('Not found', 404);
  }

  return new Response(Readable.toWeb(createReadStream(filePath)), {
    headers: {
      'content-type': contentTypeFor(filePath)
    }
  });
}

function textResponse(text: string, statusCode: number): Response {
  return new Response(text, {
    status: statusCode,
    headers: {
      'content-type': 'text/plain; charset=utf-8'
    }
  });
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
