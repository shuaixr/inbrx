import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { serve, type ServerType } from '@hono/node-server';
import { Hono } from 'hono';
import { createMailboxEvents, type MailboxEvent, type MailboxEvents } from '../events/mailbox-events.js';
import type {
  AppConfig,
  AttachmentStore,
  CapturedAttachment,
  CapturedMessage,
  ManagedServer,
  MessageListQuery,
  MessageStore
} from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '../../..', 'web/dist');

type MessageSummary = Pick<CapturedMessage, 'id' | 'receivedAt' | 'from' | 'to' | 'subject' | 'rawSizeBytes'> & {
  attachmentCount: number;
};
type MessageDetail = CapturedMessage & {
  attachmentCount: number;
};
type ConnectionSettings = {
  smtpHost: string;
  smtpPort: number;
  smtpStartTls: boolean;
  smtpAuth: 'optional';
};

export function createHttpServer({
  store,
  attachmentStore,
  connectionSettings,
  events = createMailboxEvents()
}: {
  store: MessageStore;
  attachmentStore: AttachmentStore;
  connectionSettings: ConnectionSettings;
  events?: MailboxEvents;
}): ManagedServer {
  const app = createHttpApp({ store, attachmentStore, connectionSettings, events });
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
  attachmentStore,
  connectionSettings = toConnectionSettings({
    smtpHost: '127.0.0.1',
    smtpPort: 2525,
    smtpStartTls: false,
    smtpTlsKeyPath: null,
    smtpTlsCertPath: null,
    httpHost: '127.0.0.1',
    httpPort: 3000,
    maxMessages: 500,
    storage: 'memory'
  }),
  events = createMailboxEvents()
}: {
  store: MessageStore;
  attachmentStore: AttachmentStore;
  connectionSettings?: ConnectionSettings;
  events?: MailboxEvents;
}): Hono {
  const app = new Hono();

  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  });

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  app.get('/api/connection', (c) => c.json({ connection: connectionSettings }));

  app.get('/api/events', (c) => sseResponse(events, c.req.raw.signal));

  app.get('/api/messages', async (c) => {
    const query = parseMessageListQuery(new URL(c.req.url).searchParams);
    if ('error' in query) {
      return c.json({ error: query.error }, 400);
    }

    return c.json({
      messages: (await store.list(query.value)).map(toMessageSummary)
    });
  });

  app.delete('/api/messages', async (c) => {
    const deleted = await store.clear();
    events.emit({ type: 'messages.cleared', deleted });
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
    const messageId = c.req.param('id');
    const deleted = await store.delete(messageId);
    if (deleted) {
      events.emit({ type: 'message.deleted', id: messageId });
    }
    return c.json({ deleted }, deleted ? 200 : 404);
  });

  app.all('*', (c) => serveStatic(new URL(c.req.url).pathname));

  return app;
}

export function toConnectionSettings(config: AppConfig): ConnectionSettings {
  return {
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpStartTls: config.smtpStartTls,
    smtpAuth: 'optional'
  };
}

function sseResponse(events: MailboxEvents, signal: AbortSignal): Response {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepalive: NodeJS.Timeout | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown): void => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const cleanup = (): void => {
        if (closed) {
          return;
        }

        closed = true;
        unsubscribe?.();
        unsubscribe = null;
        if (keepalive) {
          clearInterval(keepalive);
          keepalive = null;
        }
      };

      send('ready', { version: 1 });
      unsubscribe = events.subscribe((event) => {
        send(event.type, eventData(event));
      });
      keepalive = setInterval(() => {
        if (!closed) {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        }
      }, 30000);
      signal.addEventListener('abort', cleanup, { once: true });
    },

    cancel() {
      closed = true;
      unsubscribe?.();
      unsubscribe = null;
      if (keepalive) {
        clearInterval(keepalive);
        keepalive = null;
      }
    }
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive'
    }
  });
}

function eventData(event: MailboxEvent): Record<string, unknown> {
  switch (event.type) {
    case 'message.created':
      return { id: event.id, receivedAt: event.receivedAt };
    case 'message.deleted':
      return { id: event.id };
    case 'messages.cleared':
      return { deleted: event.deleted };
  }
}

function parseMessageListQuery(searchParams: URLSearchParams): { value: MessageListQuery } | { error: string } {
  const query: MessageListQuery = {};
  const q = searchParams.get('q')?.trim();
  const hasAttachments = searchParams.get('hasAttachments');
  const receivedAfter = searchParams.get('receivedAfter');
  const receivedBefore = searchParams.get('receivedBefore');

  if (q) {
    query.q = q;
  }

  if (hasAttachments) {
    if (hasAttachments !== 'true') {
      return { error: 'Invalid hasAttachments.' };
    }
    query.hasAttachments = true;
  }

  if (receivedAfter) {
    if (!isValidIsoDate(receivedAfter)) {
      return { error: 'Invalid receivedAfter.' };
    }
    query.receivedAfter = receivedAfter;
  }

  if (receivedBefore) {
    if (!isValidIsoDate(receivedBefore)) {
      return { error: 'Invalid receivedBefore.' };
    }
    query.receivedBefore = receivedBefore;
  }

  if (query.receivedAfter && query.receivedBefore && query.receivedAfter >= query.receivedBefore) {
    return { error: 'receivedAfter must be before receivedBefore.' };
  }

  return { value: query };
}

function isValidIsoDate(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function toMessageSummary(message: CapturedMessage): MessageSummary {
  return {
    id: message.id,
    receivedAt: message.receivedAt,
    from: message.from,
    to: message.to,
    subject: message.subject,
    rawSizeBytes: message.rawSizeBytes,
    attachmentCount: message.attachments.length
  };
}

function toMessageDetail(message: CapturedMessage): MessageDetail {
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
