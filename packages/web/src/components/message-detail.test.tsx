import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MessageDetail } from './message-detail';
import type { MessageDetail as MessageDetailType } from '@/types';

describe('MessageDetail', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows separate HTML, text, source, headers, and raw tabs for multipart messages', () => {
    render(
      <MessageDetail
        message={createMessageDetail({
          html: '<h1>Hello HTML</h1>',
          text: 'Hello text'
        })}
      />
    );

    expect(tabNames()).toEqual(['HTML Preview', 'Text', 'HTML Source', 'Headers', 'Raw']);

    const preview = screen.getByTitle('HTML email preview') as HTMLIFrameElement;
    expect(preview.getAttribute('srcdoc')).toBe('<h1>Hello HTML</h1>');

    selectTab('Text');
    expect(screen.getByText('Hello text')).not.toBeNull();

    selectTab('HTML Source');
    expect(screen.getByText('<h1>Hello HTML</h1>')).not.toBeNull();
  });

  it('hides the text tab for HTML-only messages', () => {
    render(
      <MessageDetail
        message={createMessageDetail({
          html: '<p>Only HTML</p>',
          text: null
        })}
      />
    );

    expect(tabNames()).toEqual(['HTML Preview', 'HTML Source', 'Headers', 'Raw']);
    expect(screen.queryByRole('tab', { name: 'Text' })).toBeNull();
    expect(screen.getByTitle('HTML email preview').getAttribute('srcdoc')).toBe('<p>Only HTML</p>');
  });

  it('hides HTML tabs for text-only messages', () => {
    render(
      <MessageDetail
        message={createMessageDetail({
          html: null,
          text: 'Only text'
        })}
      />
    );

    expect(tabNames()).toEqual(['Text', 'Headers', 'Raw']);
    expect(screen.queryByRole('tab', { name: 'HTML Preview' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'HTML Source' })).toBeNull();
    expect(screen.getByText('Only text')).not.toBeNull();
  });
});

function tabNames(): string[] {
  return screen.getAllByRole('tab').map((tab) => tab.textContent ?? '');
}

function selectTab(name: string): void {
  const tab = screen.getByRole('tab', { name });
  fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
  fireEvent.mouseUp(tab);
  fireEvent.click(tab);
}

function createMessageDetail(overrides: Partial<MessageDetailType> = {}): MessageDetailType {
  return {
    id: 'message-1',
    receivedAt: '2026-07-06T00:00:00.000Z',
    from: 'sender@example.com',
    to: ['recipient@example.com'],
    subject: 'Subject',
    rawSizeBytes: 128,
    attachmentCount: 0,
    cc: [],
    bcc: [],
    headers: {
      subject: 'Subject'
    },
    text: 'Plain text body',
    html: '<p>HTML body</p>',
    attachments: [],
    raw: 'raw-message-content',
    ...overrides
  };
}
