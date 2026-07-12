import { describe, expect, it } from 'vitest';
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

  it('rejects static path traversal outside the web root', async () => {
    const app = createTestApp();

    const response = await app.request('/..%2Fpackage.json');

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe('Forbidden');
  });
});

function createTestApp(store = createMemoryStore({ maxMessages: 10 })) {
  return createHttpApp({ store, attachmentStore: createMemoryAttachmentStore() });
}
