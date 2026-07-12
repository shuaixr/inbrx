import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CapturedMessage, MessageStore } from '../types.js';

export function createFileMessageStore({
  rootDir,
  maxMessages,
  onDelete
}: {
  rootDir: string;
  maxMessages: number;
  onDelete?: (messageId: string) => Promise<void>;
}): MessageStore {
  const messagesDir = path.join(rootDir, 'messages');

  return {
    async add(message) {
      await mkdir(messagesDir, { recursive: true });
      await writeFile(messagePath(messagesDir, message.id), JSON.stringify(message, null, 2));
      await trimMessages({ messagesDir, maxMessages, onDelete });
      return message;
    },

    async list() {
      return listMessages(messagesDir);
    },

    async get(id) {
      return readMessage(messagesDir, id);
    },

    async delete(id) {
      const message = await readMessage(messagesDir, id);
      if (!message) {
        return false;
      }

      await rm(messagePath(messagesDir, id), { force: true });
      await onDelete?.(id);
      return true;
    },

    async clear() {
      const messages = await listMessages(messagesDir);
      await rm(messagesDir, { recursive: true, force: true });
      await Promise.all(messages.map((message) => onDelete?.(message.id)));
      return messages.length;
    }
  };
}

async function trimMessages({
  messagesDir,
  maxMessages,
  onDelete
}: {
  messagesDir: string;
  maxMessages: number;
  onDelete?: (messageId: string) => Promise<void>;
}): Promise<void> {
  const messages = await listMessages(messagesDir);
  const removed = messages.slice(maxMessages);
  await Promise.all(
    removed.map(async (message) => {
      await rm(messagePath(messagesDir, message.id), { force: true });
      await onDelete?.(message.id);
    })
  );
}

async function listMessages(messagesDir: string): Promise<CapturedMessage[]> {
  let entries: string[];
  try {
    entries = await readdir(messagesDir);
  } catch {
    return [];
  }

  const messages = await Promise.all(
    entries
      .filter((entry) => entry.endsWith('.json'))
      .map((entry) => readMessageFile(path.join(messagesDir, entry)))
  );

  return messages
    .filter((message): message is CapturedMessage => Boolean(message))
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

async function readMessage(messagesDir: string, id: string): Promise<CapturedMessage | null> {
  return readMessageFile(messagePath(messagesDir, id));
}

async function readMessageFile(filePath: string): Promise<CapturedMessage | null> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as CapturedMessage;
  } catch {
    return null;
  }
}

function messagePath(messagesDir: string, id: string): string {
  return path.join(messagesDir, `${id}.json`);
}
