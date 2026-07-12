import { mkdtemp, rm } from 'node:fs/promises';
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
});
