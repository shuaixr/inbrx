import type { CapturedMessage, MessageStore } from '../types.js';

export function createMemoryStore({
  maxMessages,
  onDelete
}: {
  maxMessages: number;
  onDelete?: (messageId: string) => Promise<void>;
}): MessageStore {
  const messages = new Map<string, CapturedMessage>();
  const order: string[] = [];

  return {
    async add(message) {
      messages.set(message.id, message);
      order.unshift(message.id);

      while (order.length > maxMessages) {
        const removedId = order.pop();
        if (removedId) {
          messages.delete(removedId);
          await onDelete?.(removedId);
        }
      }

      return message;
    },

    async list() {
      return order.map((id) => messages.get(id)).filter((message): message is CapturedMessage => Boolean(message));
    },

    async get(id) {
      return messages.get(id) || null;
    },

    async delete(id) {
      const existed = messages.delete(id);
      const index = order.indexOf(id);
      if (index !== -1) {
        order.splice(index, 1);
      }
      if (existed) {
        await onDelete?.(id);
      }
      return existed;
    },

    async clear() {
      const count = messages.size;
      const ids = [...messages.keys()];
      messages.clear();
      order.length = 0;
      await Promise.all(ids.map((id) => onDelete?.(id)));
      return count;
    }
  };
}
