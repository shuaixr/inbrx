import type { CapturedMessage, HeaderValue, MessageListQuery } from '../types.js';

export function filterMessages(messages: CapturedMessage[], query: MessageListQuery = {}): CapturedMessage[] {
  return messages.filter((message) => messageMatchesQuery(message, query));
}

export function messageMatchesQuery(message: CapturedMessage, query: MessageListQuery = {}): boolean {
  if (query.hasAttachments && message.attachments.length === 0) {
    return false;
  }

  if (query.receivedAfter && message.receivedAt < query.receivedAfter) {
    return false;
  }

  if (query.receivedBefore && message.receivedAt >= query.receivedBefore) {
    return false;
  }

  const terms = normalizeSearchTerms(query.q);
  if (terms.length === 0) {
    return true;
  }

  const text = searchableText(message);
  return terms.every((term) => text.includes(term));
}

export function normalizeSearchTerms(query: string | undefined): string[] {
  return (query ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function searchableText(message: CapturedMessage): string {
  return [
    message.subject,
    message.from,
    ...message.to,
    ...message.cc,
    ...message.bcc,
    message.text,
    message.html,
    message.raw,
    ...headerSearchValues(message.headers),
    ...message.attachments.flatMap((attachment) => [attachment.filename, attachment.contentType])
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join('\n')
    .toLowerCase();
}

function headerSearchValues(headers: Record<string, HeaderValue>): string[] {
  return Object.entries(headers).flatMap(([key, value]) => [
    key,
    ...(Array.isArray(value) ? value : [value])
  ]);
}
