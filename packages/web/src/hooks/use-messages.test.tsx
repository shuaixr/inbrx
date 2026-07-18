import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessages } from './use-messages';
import type { MessageDetail, MessageSummary } from '@/types';

type FetchCall = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

class MockEventSource {
  static instances: MockEventSource[] = [];

  readonly listeners = new Map<string, Set<EventListener>>();
  readonly url: string | URL;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  constructor(url: string | URL) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.closed = true;
  }

  dispatch(type: string): void {
    const event = new MessageEvent(type, { data: '{}' });
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

describe('useMessages', () => {
  let messages: MessageSummary[];
  let details: Map<string, MessageDetail>;
  let deleted = false;
  let fetchCalls: FetchCall[];

  beforeEach(() => {
    messages = [];
    details = new Map();
    deleted = false;
    fetchCalls = [];
    MockEventSource.instances = [];

    vi.stubGlobal('EventSource', MockEventSource);
    vi.stubGlobal('fetch', vi.fn(fetchMock));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads messages and selects the first message on mount', async () => {
    const first = createMessage('message-1', { subject: 'First' });
    messages = [first];
    details.set(first.id, createDetail(first, { text: 'First body' }));

    const { result } = renderHook(() => useMessages());

    await waitFor(() => expect(result.current.messages).toEqual([first]));
    await waitFor(() => expect(result.current.selectedMessage?.text).toBe('First body'));

    expect(result.current.selectedId).toBe('message-1');
    expect(fetchPaths()).toEqual(['/api/messages', '/api/messages/message-1']);
  });

  it('opens the mailbox event stream on mount', async () => {
    renderHook(() => useMessages());

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));

    expect(MockEventSource.instances[0]?.url).toBe('/api/events');
  });

  it('requests messages with search query parameters after debounce', async () => {
    const { result } = renderHook(() => useMessages());
    await waitFor(() => expect(fetchPaths()).toEqual(['/api/messages']));

    await act(async () => {
      result.current.setQueryText('  reset alice  ');
      await delay(250);
    });

    await waitFor(() => expect(fetchPaths()).toContain('/api/messages?q=reset+alice'));
  });

  it('requests messages with filter parameters', async () => {
    const { result } = renderHook(() => useMessages());
    await waitFor(() => expect(fetchPaths()).toEqual(['/api/messages']));

    act(() => {
      result.current.setFilter('with-attachments');
    });

    await waitFor(() => expect(fetchPaths()).toContain('/api/messages?hasAttachments=true'));
  });

  it('reloads messages when mailbox events arrive', async () => {
    messages = [createMessage('message-1')];
    details.set('message-1', createDetail(messages[0]));

    const { result } = renderHook(() => useMessages());
    await waitFor(() => expect(result.current.selectedId).toBe('message-1'));

    const source = currentEventSource();

    messages = [createMessage('message-2'), createMessage('message-1')];
    details.set('message-2', createDetail(messages[0]));
    await act(async () => {
      source.dispatch('message.created');
    });
    await waitFor(() => expect(result.current.messages.map((message) => message.id)).toEqual(['message-2', 'message-1']));

    messages = [createMessage('message-2')];
    await act(async () => {
      source.dispatch('message.deleted');
    });
    await waitFor(() => expect(result.current.messages.map((message) => message.id)).toEqual(['message-2']));

    messages = [];
    await act(async () => {
      source.dispatch('messages.cleared');
    });
    await waitFor(() => expect(result.current.messages).toEqual([]));
  });

  it('keeps the current selection when a newer message arrives', async () => {
    const oldMessage = createMessage('old-message');
    const newMessage = createMessage('new-message');
    messages = [oldMessage];
    details.set(oldMessage.id, createDetail(oldMessage));
    details.set(newMessage.id, createDetail(newMessage));

    const { result } = renderHook(() => useMessages());
    await waitFor(() => expect(result.current.selectedId).toBe('old-message'));

    messages = [newMessage, oldMessage];
    await act(async () => {
      currentEventSource().dispatch('message.created');
    });

    await waitFor(() => expect(result.current.messages.map((message) => message.id)).toEqual(['new-message', 'old-message']));
    expect(result.current.selectedId).toBe('old-message');
  });

  it('selects the first available message when the selected message disappears', async () => {
    const first = createMessage('message-1');
    const second = createMessage('message-2');
    messages = [first];
    details.set(first.id, createDetail(first));
    details.set(second.id, createDetail(second, { text: 'Second body' }));

    const { result } = renderHook(() => useMessages());
    await waitFor(() => expect(result.current.selectedId).toBe('message-1'));

    messages = [second];
    await act(async () => {
      currentEventSource().dispatch('message.deleted');
    });

    await waitFor(() => expect(result.current.selectedId).toBe('message-2'));
    await waitFor(() => expect(result.current.selectedMessage?.text).toBe('Second body'));
  });

  it('clears selection when the selected message disappears and no messages remain', async () => {
    const first = createMessage('message-1');
    messages = [first];
    details.set(first.id, createDetail(first));

    const { result } = renderHook(() => useMessages());
    await waitFor(() => expect(result.current.selectedId).toBe('message-1'));

    messages = [];
    await act(async () => {
      currentEventSource().dispatch('message.deleted');
    });

    await waitFor(() => expect(result.current.selectedId).toBeNull());
    expect(result.current.selectedMessage).toBeNull();
  });

  it('clears messages without auto-selecting the next loaded message', async () => {
    const first = createMessage('message-1');
    const second = createMessage('message-2');
    messages = [first];
    details.set(first.id, createDetail(first));

    const { result } = renderHook(() => useMessages());
    await waitFor(() => expect(result.current.selectedId).toBe('message-1'));

    messages = [second];
    details.set(second.id, createDetail(second));

    await act(async () => {
      await result.current.clearMessages();
    });

    expect(deleted).toBe(true);
    expect(result.current.messages).toEqual([second]);
    expect(result.current.selectedId).toBeNull();
    expect(result.current.selectedMessage).toBeNull();
    expect(fetchCalls.some((call) => pathOnly(call.input) === '/api/messages' && call.init?.method === 'DELETE')).toBe(true);
  });

  it('keeps state intact when EventSource reports an error', async () => {
    const first = createMessage('message-1');
    messages = [first];
    details.set(first.id, createDetail(first));

    const { result } = renderHook(() => useMessages());
    await waitFor(() => expect(result.current.selectedId).toBe('message-1'));

    act(() => {
      currentEventSource().onerror?.(new Event('error'));
    });

    expect(result.current.messages).toEqual([first]);
    expect(result.current.selectedId).toBe('message-1');
  });

  it('keeps query parameters when mailbox events arrive', async () => {
    const { result } = renderHook(() => useMessages());
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));

    await act(async () => {
      result.current.setQueryText('reset');
      await delay(250);
    });
    await waitFor(() => expect(fetchPaths()).toContain('/api/messages?q=reset'));

    await act(async () => {
      currentEventSource().dispatch('message.created');
    });

    await waitFor(() => expect(fetchPaths().filter((path) => path === '/api/messages?q=reset')).toHaveLength(2));
    expect(MockEventSource.instances).toHaveLength(1);
  });

  it('closes the event stream and removes listeners on unmount', async () => {
    const { unmount } = renderHook(() => useMessages());
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));

    const source = currentEventSource();
    expect(source.listeners.get('message.created')?.size).toBe(1);

    unmount();

    expect(source.closed).toBe(true);
    expect(source.listeners.get('message.created')?.size).toBe(0);
    expect(source.listeners.get('message.deleted')?.size).toBe(0);
    expect(source.listeners.get('messages.cleared')?.size).toBe(0);
  });

  async function fetchMock(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    fetchCalls.push({ input, init });

    const path = pathOnly(input);
    if (path === '/api/messages' && init?.method === 'DELETE') {
      deleted = true;
      return jsonResponse({});
    }

    if (path === '/api/messages') {
      return jsonResponse({ messages });
    }

    const messageMatch = path.match(/^\/api\/messages\/([^/]+)$/);
    if (messageMatch) {
      const id = decodeURIComponent(messageMatch[1] ?? '');
      const detail = details.get(id);
      if (!detail) {
        return jsonResponse({ error: 'Message not found' }, 404);
      }

      return jsonResponse({ message: detail });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }

  function fetchPaths(): string[] {
    return fetchCalls.map((call) => urlFor(call.input));
  }
});

function currentEventSource(): MockEventSource {
  const source = MockEventSource.instances[0];
  if (!source) {
    throw new Error('Expected an EventSource instance.');
  }

  return source;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  });
}

function urlFor(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return `${input.pathname}${input.search}`;
  }

  return input.url;
}

function pathOnly(input: RequestInfo | URL): string {
  const url = urlFor(input);
  return url.startsWith('/api/') ? (url.split('?')[0] ?? url) : new URL(url).pathname;
}

function createMessage(id: string, overrides: Partial<MessageSummary> = {}): MessageSummary {
  return {
    id,
    receivedAt: '2026-07-06T00:00:00.000Z',
    from: 'sender@example.com',
    to: ['recipient@example.com'],
    subject: 'Subject',
    rawSizeBytes: 128,
    attachmentCount: 0,
    ...overrides
  };
}

function createDetail(message: MessageSummary, overrides: Partial<MessageDetail> = {}): MessageDetail {
  return {
    ...message,
    cc: [],
    bcc: [],
    headers: {},
    text: 'Body',
    html: null,
    attachments: [],
    raw: 'Subject: Subject\r\n\r\nBody',
    ...overrides
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
