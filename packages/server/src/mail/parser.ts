import { randomUUID } from 'node:crypto';
import type { CapturedMessage, HeaderValue, MailEnvelope } from '../types.js';

export function parseMessage({ raw, envelope }: { raw: string; envelope: MailEnvelope }): CapturedMessage {
  const { headerText, body } = splitHeadersAndBody(raw);
  const headers = parseHeaders(headerText);
  const contentType = getHeader(headers, 'content-type') || '';
  const subject = getHeader(headers, 'subject');

  return {
    id: randomUUID(),
    receivedAt: new Date().toISOString(),
    from: envelope.from || extractAddress(getHeader(headers, 'from')),
    to: envelope.to.length > 0 ? envelope.to : splitAddressHeader(getHeader(headers, 'to')),
    cc: splitAddressHeader(getHeader(headers, 'cc')),
    bcc: splitAddressHeader(getHeader(headers, 'bcc')),
    subject: subject || null,
    headers,
    text: isHtml(contentType) ? null : body,
    html: isHtml(contentType) ? body : null,
    attachments: [],
    rawSizeBytes: Buffer.byteLength(raw),
    raw
  };
}

function splitHeadersAndBody(raw: string): { headerText: string; body: string } {
  const normalized = raw.replace(/\r\n/g, '\n');
  const separatorIndex = normalized.indexOf('\n\n');

  if (separatorIndex === -1) {
    return { headerText: normalized, body: '' };
  }

  return {
    headerText: normalized.slice(0, separatorIndex),
    body: normalized.slice(separatorIndex + 2)
  };
}

function parseHeaders(headerText: string): Record<string, HeaderValue> {
  const headers: Record<string, HeaderValue> = {};
  const lines = headerText.split('\n');
  let currentName: string | null = null;

  for (const line of lines) {
    if (!line) {
      continue;
    }

    if ((line.startsWith(' ') || line.startsWith('\t')) && currentName) {
      const existing = headers[currentName];
      const continuation = line.trim();
      headers[currentName] = Array.isArray(existing)
        ? [...existing.slice(0, -1), `${existing.at(-1) || ''} ${continuation}`]
        : `${existing || ''} ${continuation}`;
      continue;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }

    currentName = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    const existing = headers[currentName];
    if (existing === undefined) {
      headers[currentName] = value;
    } else if (Array.isArray(existing)) {
      headers[currentName] = [...existing, value];
    } else {
      headers[currentName] = [existing, value];
    }
  }

  return headers;
}

function getHeader(headers: Record<string, HeaderValue>, name: string): string | null {
  const value = headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0] || null;
  }
  return value || null;
}

function splitAddressHeader(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => extractAddress(item))
    .filter((address): address is string => Boolean(address));
}

function extractAddress(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim() || null;
}

function isHtml(contentType: string): boolean {
  return contentType.toLowerCase().includes('text/html');
}
