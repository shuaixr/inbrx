import { describe, expect, it } from 'vitest';
import { resolveInlineCidUrls } from './inline-cid';
import type { MessageAttachment } from '@/types';

describe('resolveInlineCidUrls', () => {
  it('rewrites cid src values to attachment URLs', () => {
    const html = resolveInlineCidUrls({
      html: '<img src="cid:logo@example">',
      messageId: 'message-1',
      attachments: [createAttachment({ id: 'attachment-1', contentId: '<logo@example>' })]
    });

    expect(html).toContain('<img src="/api/messages/message-1/attachments/attachment-1">');
  });

  it('rewrites cid src values with angle brackets', () => {
    const html = resolveInlineCidUrls({
      html: '<img src="cid:<logo@example>">',
      messageId: 'message-1',
      attachments: [createAttachment({ id: 'attachment-1', contentId: '<logo@example>' })]
    });

    expect(html).toContain('<img src="/api/messages/message-1/attachments/attachment-1">');
  });

  it('rewrites URL-encoded cid values', () => {
    const html = resolveInlineCidUrls({
      html: '<img src="cid:logo%40example">',
      messageId: 'message-1',
      attachments: [createAttachment({ id: 'attachment-1', contentId: '<logo@example>' })]
    });

    expect(html).toContain('<img src="/api/messages/message-1/attachments/attachment-1">');
  });

  it('rewrites cid srcset candidates', () => {
    const html = resolveInlineCidUrls({
      html: '<img srcset="cid:logo@example 1x, cid:logo-2x@example 2x">',
      messageId: 'message-1',
      attachments: [
        createAttachment({ id: 'attachment-1', contentId: '<logo@example>' }),
        createAttachment({ id: 'attachment-2', contentId: '<logo-2x@example>' })
      ]
    });

    expect(html).toContain(
      'srcset="/api/messages/message-1/attachments/attachment-1 1x, /api/messages/message-1/attachments/attachment-2 2x"'
    );
  });

  it('leaves unknown cid and non-cid URLs unchanged', () => {
    const html = resolveInlineCidUrls({
      html: '<img src="cid:missing@example"><img src="https://example.test/logo.png">',
      messageId: 'message-1',
      attachments: [createAttachment({ id: 'attachment-1', contentId: '<logo@example>' })]
    });

    expect(html).toContain('<img src="cid:missing@example">');
    expect(html).toContain('<img src="https://example.test/logo.png">');
  });

  it('does not rewrite matching text outside URL attributes', () => {
    const html = resolveInlineCidUrls({
      html: '<p>cid:logo@example</p><img alt="cid:logo@example" src="cid:logo@example">',
      messageId: 'message-1',
      attachments: [createAttachment({ id: 'attachment-1', contentId: '<logo@example>' })]
    });

    expect(html).toContain('<p>cid:logo@example</p>');
    expect(html).toContain('alt="cid:logo@example"');
    expect(html).toContain('src="/api/messages/message-1/attachments/attachment-1"');
  });
});

function createAttachment(overrides: Partial<MessageAttachment>): MessageAttachment {
  return {
    id: 'attachment-1',
    filename: 'logo.png',
    contentType: 'image/png',
    sizeBytes: 128,
    ...overrides
  };
}
