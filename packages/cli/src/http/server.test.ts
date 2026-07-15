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
        rawSizeBytes: 128
      }
    ]);
    expect(body.messages[0]).not.toHaveProperty('raw');
    expect(body.messages[0]).not.toHaveProperty('text');
    expect(body.messages[0]).not.toHaveProperty('html');
  });

  it('returns message details', async () => {
    const store = createMemoryStore({ maxMessages: 10 });
    const message = createCapturedMessage({ id: 'message-1' });
    await store.add(message);
    const app = createTestApp(store);

    const response = await app.request('/api/messages/message-1');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message });
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

function decodeChunk(value: Uint8Array | undefined): string {
  return new TextDecoder().decode(value);
}
