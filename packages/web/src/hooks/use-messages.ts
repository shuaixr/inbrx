import { useCallback, useEffect, useRef, useState } from 'react';
import { clearMessages as clearMessagesRequest, fetchMessage, fetchMessages, type FetchMessagesParams } from '@/lib/messages-api';
import type { MessageDetail, MessageFilter, MessageSummary } from '@/types';

export function useMessages() {
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageDetail | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('');
  const [debouncedQueryText, setDebouncedQueryText] = useState('');
  const [filter, setFilter] = useState<MessageFilter>('all');
  const loadMessagesRef = useRef<() => void>(() => {});

  const loadMessages = useCallback(async ({ autoSelect = true }: { autoSelect?: boolean } = {}) => {
    const nextMessages = await fetchMessages(queryParamsFor({ queryText: debouncedQueryText, filter }));
    setError(null);
    setMessages(nextMessages);

    setSelectedId((currentId) => {
      if (currentId && nextMessages.some((message) => message.id === currentId)) {
        return currentId;
      }

      if (autoSelect) {
        return nextMessages[0]?.id ?? null;
      }

      return null;
    });
  }, [debouncedQueryText, filter]);

  useEffect(() => {
    loadMessagesRef.current = () => {
      void loadMessages().catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load messages');
      });
    };
  }, [loadMessages]);

  const clearMessages = useCallback(async () => {
    if (isClearing) {
      return;
    }

    setIsClearing(true);
    setError(null);

    try {
      await clearMessagesRequest();
      setSelectedId(null);
      setSelectedMessage(null);
      await loadMessages({ autoSelect: false });
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Failed to clear messages');
    } finally {
      setIsClearing(false);
    }
  }, [isClearing, loadMessages]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQueryText(queryText.trim());
    }, 200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [queryText]);

  useEffect(() => {
    loadMessagesRef.current();
  }, [loadMessages]);

  useEffect(() => {
    const load = () => loadMessagesRef.current();
    const events = new EventSource('/api/events');
    const reloadEvents = ['message.created', 'message.deleted', 'messages.cleared'];

    for (const eventName of reloadEvents) {
      events.addEventListener(eventName, load);
    }

    events.onerror = () => {
      // EventSource reconnects automatically. Keep the current UI state intact.
    };

    const interval = window.setInterval(load, 60000);

    return () => {
      window.clearInterval(interval);
      for (const eventName of reloadEvents) {
        events.removeEventListener(eventName, load);
      }
      events.close();
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedMessage(null);
      return;
    }

    let cancelled = false;
    fetchMessage(selectedId)
      .then((message) => {
        if (!cancelled) {
          setSelectedMessage(message);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedMessage(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return {
    messages,
    selectedId,
    selectedMessage,
    isClearing,
    error,
    queryText,
    filter,
    clearMessages,
    loadMessages,
    setQueryText,
    setFilter,
    selectMessage: setSelectedId
  };
}

function queryParamsFor({ queryText, filter }: { queryText: string; filter: MessageFilter }): FetchMessagesParams {
  const params: FetchMessagesParams = {};

  if (queryText) {
    params.q = queryText;
  }

  if (filter === 'with-attachments') {
    params.hasAttachments = true;
  }

  if (filter === 'today') {
    const { start, end } = localDayBounds(new Date());
    params.receivedAfter = start;
    params.receivedBefore = end;
  }

  return params;
}

function localDayBounds(now: Date): { start: string; end: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}
