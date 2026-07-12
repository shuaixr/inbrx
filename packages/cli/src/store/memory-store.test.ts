import { describe, expect, it } from 'vitest';
import { createCapturedMessage } from '../test/factories.js';
import { createMemoryStore } from './memory-store.js';

describe('createMemoryStore', () => {
  it('lists newer messages first', async () => {
    const store = createMemoryStore({ maxMessages: 10 });

    await store.add(createCapturedMessage({ id: 'older' }));
    await store.add(createCapturedMessage({ id: 'newer' }));

    expect((await store.list()).map((message) => message.id)).toEqual(['newer', 'older']);
  });

  it('removes the oldest messages when the limit is exceeded', async () => {
    const store = createMemoryStore({ maxMessages: 2 });

    await store.add(createCapturedMessage({ id: 'first' }));
    await store.add(createCapturedMessage({ id: 'second' }));
    await store.add(createCapturedMessage({ id: 'third' }));

    expect((await store.list()).map((message) => message.id)).toEqual(['third', 'second']);
    await expect(store.get('first')).resolves.toBeNull();
  });

  it('gets, deletes, and clears messages', async () => {
    const store = createMemoryStore({ maxMessages: 10 });

    await store.add(createCapturedMessage({ id: 'message-1' }));
    await store.add(createCapturedMessage({ id: 'message-2' }));

    expect((await store.get('message-1'))?.id).toBe('message-1');
    await expect(store.delete('message-1')).resolves.toBe(true);
    await expect(store.delete('missing')).resolves.toBe(false);
    await expect(store.get('message-1')).resolves.toBeNull();
    await expect(store.clear()).resolves.toBe(1);
    await expect(store.list()).resolves.toEqual([]);
  });

  it('runs delete hooks for evicted, deleted, and cleared messages', async () => {
    const deleted: string[] = [];
    const store = createMemoryStore({
      maxMessages: 2,
      onDelete: async (messageId) => {
        deleted.push(messageId);
      }
    });

    await store.add(createCapturedMessage({ id: 'first' }));
    await store.add(createCapturedMessage({ id: 'second' }));
    await store.add(createCapturedMessage({ id: 'third' }));
    await store.delete('second');
    await store.clear();

    expect(deleted).toEqual(['first', 'second', 'third']);
  });
});
