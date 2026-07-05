import { describe, expect, it } from 'vitest';
import { createCapturedSmtpSession } from '../test/factories.js';
import { parseMessage } from './parser.js';

describe('parseMessage', () => {
  it('parses message bodies, headers, and address fields', async () => {
    const raw = [
      'From: Header Sender <header-sender@example.com>',
      'To: Header Recipient <header-recipient@example.com>',
      'Cc: Copy <copy@example.com>',
      'Subject: Parsed subject',
      'X-Custom: value',
      'Content-Type: multipart/alternative; boundary="alt-boundary"',
      '',
      '--alt-boundary',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'Plain body',
      '--alt-boundary',
      'Content-Type: text/html; charset=utf-8',
      '',
      '<p>HTML body</p>',
      '--alt-boundary--'
    ].join('\r\n');

    const message = await parseMessage({
      raw,
      envelope: {
        from: null,
        to: []
      },
      smtp: createCapturedSmtpSession()
    });

    expect(message.id).toEqual(expect.any(String));
    expect(message.receivedAt).toEqual(expect.any(String));
    expect(message.from).toBe('header-sender@example.com');
    expect(message.to).toEqual(['header-recipient@example.com']);
    expect(message.cc).toEqual(['copy@example.com']);
    expect(message.subject).toBe('Parsed subject');
    expect(message.headers['x-custom']).toBe('value');
    expect(message.text).toContain('Plain body');
    expect(message.html).toContain('<p>HTML body</p>');
    expect(message.rawSizeBytes).toBe(Buffer.byteLength(raw));
    expect(message.raw).toBe(raw);
  });

  it('prefers the SMTP envelope over MIME sender and recipients', async () => {
    const message = await parseMessage({
      raw: 'From: mime-sender@example.com\r\nTo: mime-recipient@example.com\r\nSubject: Envelope\r\n\r\nBody',
      envelope: {
        from: 'envelope-sender@example.com',
        to: ['envelope-recipient@example.com']
      },
      smtp: createCapturedSmtpSession()
    });

    expect(message.from).toBe('envelope-sender@example.com');
    expect(message.to).toEqual(['envelope-recipient@example.com']);
  });

  it('captures attachment metadata without storing attachment content', async () => {
    const raw = [
      'From: sender@example.com',
      'To: recipient@example.com',
      'Subject: Attachment',
      'Content-Type: multipart/mixed; boundary="mixed-boundary"',
      '',
      '--mixed-boundary',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'See attached.',
      '--mixed-boundary',
      'Content-Type: text/plain; name="note.txt"',
      'Content-Disposition: attachment; filename="note.txt"',
      'Content-Transfer-Encoding: base64',
      'Content-ID: <note-1>',
      '',
      Buffer.from('attached text').toString('base64'),
      '--mixed-boundary--'
    ].join('\r\n');

    const message = await parseMessage({
      raw,
      envelope: {
        from: null,
        to: []
      },
      smtp: createCapturedSmtpSession()
    });

    expect(message.attachments).toEqual([
      {
        filename: 'note.txt',
        contentType: 'text/plain',
        sizeBytes: Buffer.byteLength('attached text'),
        contentId: '<note-1>'
      }
    ]);
  });
});
