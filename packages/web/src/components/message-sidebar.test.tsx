import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessageSidebar } from './message-sidebar';
import { MessageMailboxProvider } from '@/contexts/message-mailbox-context';
import type { MessageMailboxContextValue } from '@/contexts/message-mailbox-context';
import type { MessageSummary } from '@/types';

describe('MessageSidebar', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('opens confirm dialog when a row delete button is clicked and only deletes after confirm', () => {
    const onDeleteMessage = vi.fn();
    const onSelect = vi.fn();
    const onRefresh = vi.fn();
    const onClear = vi.fn();
    const onQueryChange = vi.fn();
    const value: MessageMailboxContextValue = {
      messages: [createMessage('message-1', { subject: 'First message' })],
      selectedId: null,
      selectedMessage: null,
      isClearing: false,
      deletingMessageId: null,
      error: null,
      queryText: '',
      clearMessages: onClear,
      deleteMessage: onDeleteMessage,
      loadMessages: onRefresh,
      setQueryText: onQueryChange,
      selectMessage: onSelect
    };

    render(
      <MessageMailboxProvider value={value}>
        <MessageSidebar />
      </MessageMailboxProvider>
    );

    const row = screen.getByText('First message');
    const rowDeleteButton = within(row.closest('div') as HTMLDivElement).getByRole('button', { name: 'Delete message' });

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
    const onDeleteMessage = vi.fn();
    const onRefresh = vi.fn();
    const onClear = vi.fn();
    const onQueryChange = vi.fn();

    render(
      <MessageMailboxProvider
        value={{
          messages: [createMessage('message-1', { subject: 'First message' })],
          selectedId: null,
          selectedMessage: null,
          isClearing: false,
          deletingMessageId: 'message-1',
          error: null,
          queryText: '',
          clearMessages: onClear,
          deleteMessage: onDeleteMessage,
          loadMessages: onRefresh,
          setQueryText: onQueryChange,
          selectMessage: vi.fn()
        }}
      >
        <MessageSidebar />
      </MessageMailboxProvider>
    );

    const row = screen.getByText('First message');
    const rowDeleteButton = within(row.closest('div') as HTMLDivElement).getByRole('button', { name: 'Deleting message' });

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
