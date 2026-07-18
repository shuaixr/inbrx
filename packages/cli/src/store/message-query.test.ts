import { describe, expect, it } from 'vitest';
import { createCapturedMessage } from '../test/factories.js';
import { filterMessages, normalizeSearchTerms, searchableText } from './message-query.js';

describe('message query helpers', () => {
  it('normalizes search terms', () => {
    expect(normalizeSearchTerms('  Reset   ALICE  ')).toEqual(['reset', 'alice']);
    expect(normalizeSearchTerms('')).toEqual([]);
    expect(normalizeSearchTerms(undefined)).toEqual([]);
  });

  it('builds searchable text from public and detail fields', () => {
    const message = createCapturedMessage({
      subject: 'Password reset',
      from: 'sender@example.com',
      to: ['alice@example.com'],
      cc: ['copy@example.com'],
      bcc: ['hidden@example.com'],
      text: 'Plain body',
      html: '<p>HTML body</p>',
      raw: 'X-Provider-Id: abc123',
      headers: {
        subject: 'Password reset',
        'x-provider-id': 'abc123',
        received: ['mx-one', 'mx-two']
      },
      attachments: [
        {
          id: 'attachment-1',
          filename: 'invoice.pdf',
          contentType: 'application/pdf',
          sizeBytes: 12,
          storageKey: 'message-1/attachment-1'
        }
      ]
    });

    const text = searchableText(message);

    expect(text).toContain('password reset');
    expect(text).toContain('alice@example.com');
    expect(text).toContain('copy@example.com');
    expect(text).toContain('hidden@example.com');
    expect(text).toContain('plain body');
    expect(text).toContain('<p>html body</p>');
    expect(text).toContain('x-provider-id');
    expect(text).toContain('mx-two');
    expect(text).toContain('invoice.pdf');
    expect(text).toContain('application/pdf');
  });

  it('filters by multi-term case-insensitive search with AND semantics', () => {
    const first = createCapturedMessage({
      id: 'first',
      subject: 'Password reset',
      from: 'alice@example.com',
      text: 'Your reset code is 123'
    });
    const second = createCapturedMessage({
      id: 'second',
      subject: 'Password reset',
      from: 'bob@example.com',
      text: 'Your code is 456'
    });

    expect(filterMessages([first, second], { q: 'RESET alice' }).map((message) => message.id)).toEqual(['first']);
  });

  it('filters by attachments and received date range', () => {
    const attachment = {
      id: 'attachment-1',
      filename: 'note.txt',
      contentType: 'text/plain',
      sizeBytes: 12,
      storageKey: 'middle/attachment-1'
    };
    const old = createCapturedMessage({ id: 'old', receivedAt: '2026-07-17T23:59:59.999Z', attachments: [attachment] });
    const middle = createCapturedMessage({
      id: 'middle',
      receivedAt: '2026-07-18T12:00:00.000Z',
      attachments: [attachment]
    });
    const withoutAttachment = createCapturedMessage({ id: 'without-attachment', receivedAt: '2026-07-18T13:00:00.000Z' });
    const next = createCapturedMessage({ id: 'next', receivedAt: '2026-07-19T00:00:00.000Z', attachments: [attachment] });

    expect(
      filterMessages([old, middle, withoutAttachment, next], {
        hasAttachments: true,
        receivedAfter: '2026-07-18T00:00:00.000Z',
        receivedBefore: '2026-07-19T00:00:00.000Z'
      }).map((message) => message.id)
    ).toEqual(['middle']);
  });
});
