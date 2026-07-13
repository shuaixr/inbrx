import type { MessageDetail, MessageSummary } from '@/types';

export async function fetchMessages(): Promise<MessageSummary[]> {
  const response = await fetch('/api/messages');
  if (!response.ok) {
    throw new Error(`Failed to load messages (${response.status})`);
  }

  const data = (await response.json()) as { messages: MessageSummary[] };
  return data.messages;
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
