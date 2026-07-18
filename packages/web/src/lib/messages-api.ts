import type { MessageDetail, MessageSummary } from '@/types';

export type FetchMessagesParams = {
  q?: string;
  hasAttachments?: boolean;
  receivedAfter?: string;
  receivedBefore?: string;
};

export async function fetchMessages(params: FetchMessagesParams = {}): Promise<MessageSummary[]> {
  const response = await fetch(messagesUrl(params));
  if (!response.ok) {
    throw new Error(`Failed to load messages (${response.status})`);
  }

  const data = (await response.json()) as { messages: MessageSummary[] };
  return data.messages;
}

function messagesUrl(params: FetchMessagesParams): string {
  const search = new URLSearchParams();

  if (params.q) {
    search.set('q', params.q);
  }

  if (params.hasAttachments) {
    search.set('hasAttachments', 'true');
  }

  if (params.receivedAfter) {
    search.set('receivedAfter', params.receivedAfter);
  }

  if (params.receivedBefore) {
    search.set('receivedBefore', params.receivedBefore);
  }

  return `/api/messages${search.size > 0 ? `?${search.toString()}` : ''}`;
}

export async function fetchMessage(id: string): Promise<MessageDetail | null> {
  const response = await fetch(`/api/messages/${encodeURIComponent(id)}`);
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load message (${response.status})`);
  }

  const data = (await response.json()) as { message: MessageDetail };
  return data.message;
}

export async function clearMessages(): Promise<void> {
  const response = await fetch('/api/messages', { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`Failed to clear messages (${response.status})`);
  }
}
