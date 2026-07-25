import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessageSidebar } from './message-sidebar';
import type { MessageSummary } from '@/types';

describe('MessageSidebar', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('opens confirm dialog when a row delete button is clicked and only deletes after confirm', () => {
    const onDeleteMessage = vi.fn();
    const onSelect = vi.fn();

    render(
      <MessageSidebar
        messages={[createMessage('message-1', { subject: 'First message' })]}
        queryText=""
        selectedId={null}
        isClearing={false}
        deletingMessageId={null}
        error={null}
        onRefresh={() => {
          void Promise.resolve();
        }}
        onClear={() => {
          void Promise.resolve();
        }}
        onDeleteMessage={onDeleteMessage}
        onQueryChange={() => {
          void Promise.resolve();
        }}
        onSelect={onSelect}
      />
    );

    const row = screen.getByText('First message');
    const rowDeleteButton = within(row.closest('div') as HTMLDivElement).getByRole('button', { name: /^Delete$/ });

    act(() => {
      fireEvent.click(rowDeleteButton);
    });

    const dialog = screen.getByRole('dialog') as HTMLElement;
    expect(dialog.textContent).toContain('Delete message "First message"?');
    const confirmButton = within(dialog).getByRole('button', { name: /^Delete$/ });

    act(() => {
      fireEvent.click(confirmButton);
    });

    expect(onDeleteMessage).toHaveBeenCalledWith('message-1');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('disables the row delete button for the deleting message', () => {
    render(
      <MessageSidebar
        messages={[createMessage('message-1', { subject: 'First message' })]}
        queryText=""
        selectedId={null}
        isClearing={false}
        deletingMessageId="message-1"
        error={null}
        onRefresh={() => {
          void Promise.resolve();
        }}
        onClear={() => {
          void Promise.resolve();
        }}
        onDeleteMessage={() => undefined}
        onQueryChange={() => {
          void Promise.resolve();
        }}
        onSelect={() => undefined}
      />
    );

    const row = screen.getByText('First message');
    const rowDeleteButton = within(row.closest('div') as HTMLDivElement).getByRole('button', { name: /^Deleting...$/ });

    expect(rowDeleteButton).toHaveProperty('disabled', true);
  });
});

function createMessage(id: string, overrides: Partial<MessageSummary> = {}): MessageSummary {
  return {
    id,
    receivedAt: '2026-07-06T00:00:00.000Z',
    from: 'sender@example.com',
    to: ['recipient@example.com'],
    subject: 'Subject',
    rawSizeBytes: 128,
    attachmentCount: 0,
    ...overrides
  };
}
