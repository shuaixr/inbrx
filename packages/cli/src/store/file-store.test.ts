import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createCapturedMessage } from '../test/factories.js';
import { createFileAttachmentStore } from './attachment-store.js';
import { createFileMessageStore } from './file-store.js';

describe('file-backed stores', () => {
  let tempDir: string | null = null;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('persists messages and attachments on disk', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'inbrx-store-'));
    const attachmentStore = createFileAttachmentStore({ rootDir: tempDir });
    const store = createFileMessageStore({ rootDir: tempDir, maxMessages: 10 });
    const attachment = await attachmentStore.save({
      messageId: 'message-1',
      filename: 'note.txt',
      contentType: 'text/plain',
      content: Buffer.from('attached text')
    });

    await store.add(createCapturedMessage({ id: 'message-1', attachments: [attachment] }));

    const restoredStore = createFileMessageStore({ rootDir: tempDir, maxMessages: 10 });
    const restoredAttachmentStore = createFileAttachmentStore({ rootDir: tempDir });

    await expect(restoredStore.get('message-1')).resolves.toMatchObject({
      id: 'message-1',
      attachments: [attachment]
    });
    await expect(restoredAttachmentStore.get('message-1', attachment.id)).resolves.toMatchObject({
      content: Buffer.from('attached text')
    });
  });

  it('cleans up attachments when old messages are evicted', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'inbrx-store-'));
    const attachmentStore = createFileAttachmentStore({ rootDir: tempDir });
    const store = createFileMessageStore({
      rootDir: tempDir,
      maxMessages: 1,
      onDelete: (messageId) => attachmentStore.deleteForMessage(messageId)
    });
    const oldAttachment = await attachmentStore.save({
      messageId: 'old',
      filename: 'old.txt',
      contentType: 'text/plain',
      content: Buffer.from('old')
    });
    const newAttachment = await attachmentStore.save({
      messageId: 'new',
      filename: 'new.txt',
      contentType: 'text/plain',
      content: Buffer.from('new')
    });

    await store.add(createCapturedMessage({ id: 'old', receivedAt: '2026-07-06T00:00:00.000Z', attachments: [oldAttachment] }));
    await store.add(createCapturedMessage({ id: 'new', receivedAt: '2026-07-06T00:00:01.000Z', attachments: [newAttachment] }));

    await expect(store.get('old')).resolves.toBeNull();
    await expect(attachmentStore.get('old', oldAttachment.id)).resolves.toBeNull();
    await expect(attachmentStore.get('new', newAttachment.id)).resolves.toMatchObject({
      content: Buffer.from('new')
    });
  });

  it('deletes messages and runs the delete hook', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'inbrx-store-'));
    const deleted: string[] = [];
    const store = createFileMessageStore({
      rootDir: tempDir,
      maxMessages: 10,
      onDelete: async (messageId) => {
        deleted.push(messageId);
      }
    });
    await store.add(createCapturedMessage({ id: 'message-1' }));

    await expect(store.delete('message-1')).resolves.toBe(true);
    await expect(store.delete('missing')).resolves.toBe(false);

    await expect(store.get('message-1')).resolves.toBeNull();
    expect(deleted).toEqual(['message-1']);
  });

  it('clears persisted messages and runs delete hooks for each message', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'inbrx-store-'));
    const deleted: string[] = [];
    const store = createFileMessageStore({
      rootDir: tempDir,
      maxMessages: 10,
      onDelete: async (messageId) => {
        deleted.push(messageId);
      }
    });
    await store.add(createCapturedMessage({ id: 'message-1' }));
    await store.add(createCapturedMessage({ id: 'message-2', receivedAt: '2026-07-06T00:00:01.000Z' }));

    await expect(store.clear()).resolves.toBe(2);

    await expect(store.list()).resolves.toEqual([]);
    expect(deleted).toEqual(['message-2', 'message-1']);
  });

  it('returns empty lists for missing message directories', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'inbrx-store-'));
    const store = createFileMessageStore({ rootDir: tempDir, maxMessages: 10 });

    await expect(store.list()).resolves.toEqual([]);
    await expect(store.clear()).resolves.toBe(0);
  });

  it('ignores malformed message files when listing messages', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'inbrx-store-'));
    const messagesDir = path.join(tempDir, 'messages');
    await mkdir(messagesDir, { recursive: true });
    await writeFile(path.join(messagesDir, 'broken.json'), '{not valid json');
    const store = createFileMessageStore({ rootDir: tempDir, maxMessages: 10 });

    await store.add(createCapturedMessage({ id: 'message-1' }));

    expect((await store.list()).map((message) => message.id)).toEqual(['message-1']);
    await expect(store.get('broken')).resolves.toBeNull();
  });

  it('lists persisted messages matching a query', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'inbrx-store-'));
    const store = createFileMessageStore({ rootDir: tempDir, maxMessages: 10 });

    await store.add(createCapturedMessage({ id: 'first', subject: 'Password reset', text: 'Hello Alice' }));
    await store.add(createCapturedMessage({ id: 'second', subject: 'Welcome', text: 'Hello Bob' }));

    expect((await store.list({ q: 'reset alice' })).map((message) => message.id)).toEqual(['first']);
  });
});
