import { describe, expect, it } from 'vitest';
import { createMailboxEvents, type MailboxEvent } from '../events/mailbox-events.js';
import { createMemoryAttachmentStore } from '../store/attachment-store.js';
import { createMemoryStore } from '../store/memory-store.js';
import { createCapturedMessage } from '../test/factories.js';
import { createHttpApp } from './server.js';

describe('createHttpApp', () => {
  it('returns health status', async () => {
    const app = createTestApp();

    const response = await app.request('/api/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('returns connection settings', async () => {
    const app = createHttpApp({
      store: createMemoryStore({ maxMessages: 10 }),
      attachmentStore: createMemoryAttachmentStore(),
      connectionSettings: {
        smtpHost: '0.0.0.0',
        smtpPort: 2526,
        smtpStartTls: true,
        smtpAuth: 'optional'
      }
    });

    const response = await app.request('/api/connection');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      connection: {
        smtpHost: '0.0.0.0',
        smtpPort: 2526,
        smtpStartTls: true,
        smtpAuth: 'optional'
      }
    });
  });

  it('lists message summaries without body fields', async () => {
    const store = createMemoryStore({ maxMessages: 10 });
    await store.add(createCapturedMessage({ id: 'message-1', subject: 'First' }));
    const app = createTestApp(store);

    const response = await app.request('/api/messages');
    const body = (await response.json()) as { messages: Array<Record<string, unknown>> };

    expect(response.status).toBe(200);
    expect(body.messages).toEqual([
      {
        id: 'message-1',
        receivedAt: '2026-07-06T00:00:00.000Z',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'First',
        rawSizeBytes: 128,
        attachmentCount: 0
      }
    ]);
    expect(body.messages[0]).not.toHaveProperty('raw');
    expect(body.messages[0]).not.toHaveProperty('text');
    expect(body.messages[0]).not.toHaveProperty('html');
  });

  it('lists message summaries with attachment counts', async () => {
    const store = createMemoryStore({ maxMessages: 10 });
    await store.add(
      createCapturedMessage({
        id: 'message-1',
        attachments: [
          {
            id: 'attachment-1',
            filename: 'note.txt',
            contentType: 'text/plain',
            sizeBytes: 12,
            storageKey: 'message-1/attachment-1'
          },
          {
            id: 'attachment-2',
            filename: 'report.pdf',
            contentType: 'application/pdf',
            sizeBytes: 24,
            storageKey: 'message-1/attachment-2'
          }
        ]
      })
    );
    const app = createTestApp(store);

    const response = await app.request('/api/messages');
    const body = (await response.json()) as { messages: Array<Record<string, unknown>> };

    expect(response.status).toBe(200);
    expect(body.messages[0]?.attachmentCount).toBe(2);
  });

  it('filters message summaries by search query', async () => {
    const store = createMemoryStore({ maxMessages: 10 });
    await store.add(createCapturedMessage({ id: 'message-1', subject: 'Password reset', text: 'Hello Alice' }));
    await store.add(createCapturedMessage({ id: 'message-2', subject: 'Welcome', text: 'Hello Bob' }));
    const app = createTestApp(store);

    const response = await app.request('/api/messages?q=reset%20alice');
    const body = (await response.json()) as { messages: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.messages.map((message) => message.id)).toEqual(['message-1']);
  });

  it('filters message summaries by attachments and received date range', async () => {
    const store = createMemoryStore({ maxMessages: 10 });
    const attachment = {
      id: 'attachment-1',
      filename: 'note.txt',
      contentType: 'text/plain',
      sizeBytes: 12,
      storageKey: 'message-1/attachment-1'
    };
    await store.add(createCapturedMessage({ id: 'old', receivedAt: '2026-07-17T23:59:59.999Z', attachments: [attachment] }));
    await store.add(createCapturedMessage({ id: 'match', receivedAt: '2026-07-18T12:00:00.000Z', attachments: [attachment] }));
    await store.add(createCapturedMessage({ id: 'without-attachment', receivedAt: '2026-07-18T13:00:00.000Z' }));
    await store.add(createCapturedMessage({ id: 'next', receivedAt: '2026-07-19T00:00:00.000Z', attachments: [attachment] }));
    const app = createTestApp(store);

    const response = await app.request(
      '/api/messages?hasAttachments=true&receivedAfter=2026-07-18T00%3A00%3A00.000Z&receivedBefore=2026-07-19T00%3A00%3A00.000Z'
    );
    const body = (await response.json()) as { messages: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.messages.map((message) => message.id)).toEqual(['match']);
  });

  it('returns 400 for invalid message query parameters', async () => {
    const app = createTestApp();

    await expectBadRequest(app, '/api/messages?hasAttachments=false', 'Invalid hasAttachments.');
    await expectBadRequest(app, '/api/messages?receivedAfter=not-a-date', 'Invalid receivedAfter.');
    await expectBadRequest(app, '/api/messages?receivedBefore=not-a-date', 'Invalid receivedBefore.');
    await expectBadRequest(
      app,
      '/api/messages?receivedAfter=2026-07-19T00%3A00%3A00.000Z&receivedBefore=2026-07-18T00%3A00%3A00.000Z',
      'receivedAfter must be before receivedBefore.'
    );
  });

  it('returns message details', async () => {
    const store = createMemoryStore({ maxMessages: 10 });
    const message = createCapturedMessage({ id: 'message-1' });
    await store.add(message);
    const app = createTestApp(store);

    const response = await app.request('/api/messages/message-1');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: { ...message, attachmentCount: 0 } });
  });

  it('returns 404 for a missing message', async () => {
    const app = createTestApp();

    const response = await app.request('/api/messages/missing');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Message not found' });
  });

  it('deletes one message', async () => {
    const store = createMemoryStore({ maxMessages: 10 });
    await store.add(createCapturedMessage({ id: 'message-1' }));
    const app = createTestApp(store);

    const response = await app.request('/api/messages/message-1', { method: 'DELETE' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deleted: true });
    await expect(store.get('message-1')).resolves.toBeNull();
  });

  it('emits an event when deleting one message', async () => {
    const store = createMemoryStore({ maxMessages: 10 });
    const events = createMailboxEvents();
    const emitted: MailboxEvent[] = [];
    events.subscribe((event) => emitted.push(event));
    await store.add(createCapturedMessage({ id: 'message-1' }));
    const app = createTestApp(store, events);

    const response = await app.request('/api/messages/message-1', { method: 'DELETE' });

    expect(response.status).toBe(200);
    expect(emitted).toEqual([{ type: 'message.deleted', id: 'message-1' }]);
  });

  it('clears all messages', async () => {
    const store = createMemoryStore({ maxMessages: 10 });
    await store.add(createCapturedMessage({ id: 'message-1' }));
    await store.add(createCapturedMessage({ id: 'message-2' }));
    const app = createTestApp(store);

    const response = await app.request('/api/messages', { method: 'DELETE' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deleted: 2 });
    await expect(store.list()).resolves.toEqual([]);
  });

  it('emits an event when clearing messages', async () => {
    const store = createMemoryStore({ maxMessages: 10 });
    const events = createMailboxEvents();
    const emitted: MailboxEvent[] = [];
    events.subscribe((event) => emitted.push(event));
    await store.add(createCapturedMessage({ id: 'message-1' }));
    await store.add(createCapturedMessage({ id: 'message-2' }));
    const app = createTestApp(store, events);

    const response = await app.request('/api/messages', { method: 'DELETE' });

    expect(response.status).toBe(200);
    expect(emitted).toEqual([{ type: 'messages.cleared', deleted: 2 }]);
  });

  it('streams mailbox events through SSE', async () => {
    const events = createMailboxEvents();
    const app = createTestApp(createMemoryStore({ maxMessages: 10 }), events);

    const response = await app.request('/api/events');
    const reader = response.body?.getReader();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(reader).toBeDefined();

    const ready = await reader?.read();
    expect(decodeChunk(ready?.value)).toBe('event: ready\ndata: {"version":1}\n\n');

    events.emit({ type: 'message.created', id: 'message-1', receivedAt: '2026-07-06T00:00:00.000Z' });

    const created = await reader?.read();
    expect(decodeChunk(created?.value)).toBe(
      'event: message.created\ndata: {"id":"message-1","receivedAt":"2026-07-06T00:00:00.000Z"}\n\n'
    );

    await reader?.cancel();
  });

  it('downloads stored attachments', async () => {
    const attachmentStore = createMemoryAttachmentStore();
    const attachment = await attachmentStore.save({
      messageId: 'message-1',
      filename: 'note.txt',
      contentType: 'text/plain',
      content: Buffer.from('attached text')
    });
    const store = createMemoryStore({ maxMessages: 10 });
    await store.add(createCapturedMessage({ id: 'message-1', attachments: [attachment] }));
    const app = createHttpApp({ store, attachmentStore });

    const response = await app.request(`/api/messages/message-1/attachments/${attachment.id}`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/plain');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="note.txt"');
    await expect(response.text()).resolves.toBe('attached text');
  });

  it('returns 404 when downloading an attachment for a missing message', async () => {
    const app = createTestApp();

    const response = await app.request('/api/messages/missing/attachments/attachment-1');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Message not found' });
  });

  it('returns 404 when a message does not reference the requested attachment', async () => {
    const store = createMemoryStore({ maxMessages: 10 });
    await store.add(createCapturedMessage({ id: 'message-1' }));
    const app = createTestApp(store);

    const response = await app.request('/api/messages/message-1/attachments/missing');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Attachment not found' });
  });

  it('returns 404 when referenced attachment content is missing from storage', async () => {
    const store = createMemoryStore({ maxMessages: 10 });
    await store.add(
      createCapturedMessage({
        id: 'message-1',
        attachments: [
          {
            id: 'attachment-1',
            filename: 'missing.txt',
            contentType: 'text/plain',
            sizeBytes: 12,
            storageKey: 'message-1/attachment-1'
          }
        ]
      })
    );
    const app = createTestApp(store);

    const response = await app.request('/api/messages/message-1/attachments/attachment-1');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Attachment not found' });
  });

  it('rejects static path traversal outside the web root', async () => {
    const app = createTestApp();

    const response = await app.request('/..%2Fpackage.json');

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe('Forbidden');
  });
});

function createTestApp(store = createMemoryStore({ maxMessages: 10 }), events = createMailboxEvents()) {
  return createHttpApp({ store, attachmentStore: createMemoryAttachmentStore(), events });
}

async function expectBadRequest(app: ReturnType<typeof createHttpApp>, path: string, error: string): Promise<void> {
  const response = await app.request(path);

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({ error });
}

function decodeChunk(value: Uint8Array | undefined): string {
  return new TextDecoder().decode(value);
}
