import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { serve, type ServerType } from '@hono/node-server';
import { Hono } from 'hono';
import type { AttachmentStore, CapturedAttachment, CapturedMessage, ManagedServer, MessageStore } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '../../..', 'web/dist');

type MessageSummary = Pick<CapturedMessage, 'id' | 'receivedAt' | 'from' | 'to' | 'subject' | 'rawSizeBytes'>;

export function createHttpServer({
  store,
  attachmentStore
}: {
  store: MessageStore;
  attachmentStore: AttachmentStore;
}): ManagedServer {
  const app = createHttpApp({ store, attachmentStore });
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

export function createHttpApp({
  store,
  attachmentStore
}: {
  store: MessageStore;
  attachmentStore: AttachmentStore;
}): Hono {
  const app = new Hono();

  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  });

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  app.get('/api/messages', async (c) =>
    c.json({
      messages: (await store.list()).map(toMessageSummary)
    })
  );

  app.delete('/api/messages', async (c) => {
    const deleted = await store.clear();
    return c.json({ deleted });
  });

  app.get('/api/messages/:id', async (c) => {
    const message = await store.get(c.req.param('id'));
    if (!message) {
      return c.json({ error: 'Message not found' }, 404);
    }

    return c.json({ message: toMessageDetail(message) });
  });

  app.get('/api/messages/:id/attachments/:attachmentId', async (c) => {
    const messageId = c.req.param('id');
    const attachmentId = c.req.param('attachmentId');
    const message = await store.get(messageId);
    if (!message) {
      return c.json({ error: 'Message not found' }, 404);
    }

    const attachment = message.attachments.find((item) => item.id === attachmentId);
    if (!attachment) {
      return c.json({ error: 'Attachment not found' }, 404);
    }

    const storedAttachment = await attachmentStore.get(messageId, attachmentId);
    if (!storedAttachment) {
      return c.json({ error: 'Attachment not found' }, 404);
    }

    return new Response(storedAttachment.content, {
      headers: attachmentHeaders(attachment)
    });
  });

  app.delete('/api/messages/:id', async (c) => {
    const deleted = await store.delete(c.req.param('id'));
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

function attachmentHeaders(attachment: CapturedAttachment): Headers {
  const headers = new Headers();
  headers.set('content-type', attachment.contentType);
  headers.set('content-length', String(attachment.sizeBytes));
  headers.set('content-disposition', contentDispositionFor(attachment.filename));
  return headers;
}

function contentDispositionFor(filename: string | null): string {
  const safeFilename = (filename || 'attachment').replace(/[^\w.!#$&+^`{}~-]+/g, '_');
  return `attachment; filename="${safeFilename}"`;
}
