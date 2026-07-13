import { useCallback, useEffect, useState } from 'react';
import { clearMessages as clearMessagesRequest, fetchMessage, fetchMessages } from '@/lib/messages-api';
import type { MessageDetail, MessageSummary } from '@/types';

export function useMessages() {
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageDetail | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async ({ autoSelect = true }: { autoSelect?: boolean } = {}) => {
    const nextMessages = await fetchMessages();
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
  }, []);

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
    const load = () => {
      void loadMessages().catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load messages');
      });
    };

    load();
    const interval = window.setInterval(load, 3000);

    return () => window.clearInterval(interval);
  }, [loadMessages]);

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
    clearMessages,
    loadMessages,
    selectMessage: setSelectedId
  };
}
