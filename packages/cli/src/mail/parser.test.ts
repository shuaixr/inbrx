import { describe, expect, it } from 'vitest';
import { createMemoryAttachmentStore } from '../store/attachment-store.js';
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
      smtp: createCapturedSmtpSession(),
      attachmentStore: createMemoryAttachmentStore()
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
      smtp: createCapturedSmtpSession(),
      attachmentStore: createMemoryAttachmentStore()
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

    const attachmentStore = createMemoryAttachmentStore();
    const message = await parseMessage({
      raw,
      envelope: {
        from: null,
        to: []
      },
      smtp: createCapturedSmtpSession(),
      attachmentStore
    });

    expect(message.attachments).toEqual([
      {
        id: expect.any(String),
        filename: 'note.txt',
        contentType: 'text/plain',
        sizeBytes: Buffer.byteLength('attached text'),
        storageKey: `${message.id}/${message.attachments[0]?.id}`,
        contentId: '<note-1>'
      }
    ]);
    await expect(attachmentStore.get(message.id, message.attachments[0]?.id || '')).resolves.toMatchObject({
      content: Buffer.from('attached text')
    });
  });

  it('captures inline attachment content ids', async () => {
    const imageContent = Buffer.from('inline image');
    const raw = [
      'From: sender@example.com',
      'To: recipient@example.com',
      'Subject: Inline image',
      'Content-Type: multipart/related; boundary="related-boundary"',
      '',
      '--related-boundary',
      'Content-Type: text/html; charset=utf-8',
      '',
      '<img src="cid:logo@example">',
      '--related-boundary',
      'Content-Type: image/png; name="logo.png"',
      'Content-Disposition: inline; filename="logo.png"',
      'Content-Transfer-Encoding: base64',
      'Content-ID: <logo@example>',
      '',
      imageContent.toString('base64'),
      '--related-boundary--'
    ].join('\r\n');

    const attachmentStore = createMemoryAttachmentStore();
    const message = await parseMessage({
      raw,
      envelope: {
        from: null,
        to: []
      },
      smtp: createCapturedSmtpSession(),
      attachmentStore
    });

    expect(message.html).toContain('<img src="cid:logo@example">');
    expect(message.attachments).toEqual([
      {
        id: expect.any(String),
        filename: 'logo.png',
        contentType: 'image/png',
        sizeBytes: imageContent.byteLength,
        storageKey: `${message.id}/${message.attachments[0]?.id}`,
        contentId: '<logo@example>'
      }
    ]);
    await expect(attachmentStore.get(message.id, message.attachments[0]?.id || '')).resolves.toMatchObject({
      content: imageContent
    });
  });
});
