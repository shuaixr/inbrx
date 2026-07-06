import { describe, expect, it } from 'vitest';
import { createCapturedMessage } from '../test/factories.js';
import { createMemoryStore } from './memory-store.js';

describe('createMemoryStore', () => {
  it('lists newer messages first', () => {
    const store = createMemoryStore({ maxMessages: 10 });

    store.add(createCapturedMessage({ id: 'older' }));
    store.add(createCapturedMessage({ id: 'newer' }));

    expect(store.list().map((message) => message.id)).toEqual(['newer', 'older']);
  });

  it('removes the oldest messages when the limit is exceeded', () => {
    const store = createMemoryStore({ maxMessages: 2 });

    store.add(createCapturedMessage({ id: 'first' }));
    store.add(createCapturedMessage({ id: 'second' }));
    store.add(createCapturedMessage({ id: 'third' }));

    expect(store.list().map((message) => message.id)).toEqual(['third', 'second']);
    expect(store.get('first')).toBeNull();
  });

  it('gets, deletes, and clears messages', () => {
    const store = createMemoryStore({ maxMessages: 10 });

    store.add(createCapturedMessage({ id: 'message-1' }));
    store.add(createCapturedMessage({ id: 'message-2' }));

    expect(store.get('message-1')?.id).toBe('message-1');
    expect(store.delete('message-1')).toBe(true);
    expect(store.delete('missing')).toBe(false);
    expect(store.get('message-1')).toBeNull();
    expect(store.clear()).toBe(1);
    expect(store.list()).toEqual([]);
  });
});
