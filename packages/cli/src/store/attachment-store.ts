import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AttachmentStore, CapturedAttachment, StoredAttachment } from '../types.js';

type AttachmentInput = Parameters<AttachmentStore['save']>[0];

export function createMemoryAttachmentStore(): AttachmentStore {
  const attachments = new Map<string, StoredAttachment>();

  return {
    async save(input) {
      const attachment = toCapturedAttachment(input);
      attachments.set(toMapKey(input.messageId, attachment.id), {
        ...attachment,
        content: input.content
      });
      return attachment;
    },

    async get(messageId, attachmentId) {
      return attachments.get(toMapKey(messageId, attachmentId)) || null;
    },

    async deleteForMessage(messageId) {
      for (const key of attachments.keys()) {
        if (key.startsWith(`${messageId}/`)) {
          attachments.delete(key);
        }
      }
    },

    async clear() {
      attachments.clear();
    }
  };
}

export function createFileAttachmentStore({ rootDir }: { rootDir: string }): AttachmentStore {
  const attachmentsDir = path.join(rootDir, 'attachments');

  return {
    async save(input) {
      const attachment = toCapturedAttachment(input);
      const filePath = attachmentPath(attachmentsDir, input.messageId, attachment.id);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, input.content);
      return attachment;
    },

    async get(messageId, attachmentId) {
      const filePath = attachmentPath(attachmentsDir, messageId, attachmentId);
      try {
        const content = await readFile(filePath);
        return {
          id: attachmentId,
          filename: null,
          contentType: 'application/octet-stream',
          sizeBytes: content.byteLength,
          storageKey: storageKeyFor(messageId, attachmentId),
          content
        };
      } catch {
        return null;
      }
    },

    async deleteForMessage(messageId) {
      await rm(path.join(attachmentsDir, messageId), { recursive: true, force: true });
    },

    async clear() {
      await rm(attachmentsDir, { recursive: true, force: true });
    }
  };
}

function toCapturedAttachment(input: AttachmentInput): CapturedAttachment {
  const id = randomUUID();
  return {
    id,
    filename: input.filename,
    contentType: input.contentType,
    sizeBytes: input.content.byteLength,
    storageKey: storageKeyFor(input.messageId, id),
    ...(input.contentId ? { contentId: input.contentId } : {})
  };
}

function toMapKey(messageId: string, attachmentId: string): string {
  return `${messageId}/${attachmentId}`;
}

function storageKeyFor(messageId: string, attachmentId: string): string {
  return toMapKey(messageId, attachmentId);
}

function attachmentPath(attachmentsDir: string, messageId: string, attachmentId: string): string {
  return path.join(attachmentsDir, messageId, attachmentId);
}
