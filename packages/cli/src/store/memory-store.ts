import type { CapturedMessage, MessageStore } from '../types.js';

export function createMemoryStore({ maxMessages }: { maxMessages: number }): MessageStore {
  const messages = new Map<string, CapturedMessage>();
  const order: string[] = [];

  return {
    add(message) {
      messages.set(message.id, message);
      order.unshift(message.id);

      while (order.length > maxMessages) {
        const removedId = order.pop();
        if (removedId) {
          messages.delete(removedId);
        }
      }

      return message;
    },

    list() {
      return order.map((id) => messages.get(id)).filter((message): message is CapturedMessage => Boolean(message));
    },

    get(id) {
      return messages.get(id) || null;
    },

    delete(id) {
      const existed = messages.delete(id);
      const index = order.indexOf(id);
      if (index !== -1) {
        order.splice(index, 1);
      }
      return existed;
    },

    clear() {
      const count = messages.size;
      messages.clear();
      order.length = 0;
      return count;
    }
  };
}
