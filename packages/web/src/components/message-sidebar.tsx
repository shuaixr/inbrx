import { type FormEvent, type KeyboardEvent, type MouseEvent, useState } from 'react';
import { Inbox, Paperclip, Plug, RefreshCw, Search, Trash2 } from 'lucide-react';
import { ConnectDialog } from '@/components/connect-dialog';
import { useMessageMailbox } from '@/contexts/message-mailbox-context';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatBytes, formatMessageTime } from '@/lib/format';
import type { MessageSummary } from '@/types';

export function MessageSidebar() {
  const {
    messages,
    queryText,
    selectedId,
    isClearing,
    error,
    deletingMessageId,
    clearMessages,
    deleteMessage,
    loadMessages,
    setQueryText,
    selectMessage
  } = useMessageMailbox();

  const hasActiveSearch = queryText.trim().length > 0;
  const [messageToDelete, setMessageToDelete] = useState<MessageSummary | null>(null);

  const requestDeleteMessage = (messageId: string) => {
    const target = messages.find((message) => message.id === messageId);
    if (target) {
      setMessageToDelete(target);
    }
  };

  const closeDeleteDialog = () => {
    setMessageToDelete(null);
  };

  const confirmDeleteMessage = () => {
    if (!messageToDelete) {
      return;
    }

    deleteMessage(messageToDelete.id);
    closeDeleteDialog();
  };

  return (
    <aside className="flex min-w-0 flex-col border-r bg-sidebar text-sidebar-foreground max-[760px]:max-h-[42vh] max-[760px]:border-r-0 max-[760px]:border-b">
      <MailboxHeader
        isClearing={isClearing}
        onClear={() => {
          void clearMessages();
        }}
        onRefresh={() => {
          void loadMessages();
        }}
      />

      <MailboxControls queryText={queryText} onQueryChange={setQueryText} />

      <MailboxError error={error} />

      <Separator />

      <MessageList
        hasActiveSearch={hasActiveSearch}
        messages={messages}
        selectedId={selectedId}
        deletingMessageId={deletingMessageId}
        onRequestDelete={requestDeleteMessage}
        onSelect={selectMessage}
      />

      <MessageDeleteDialog
        message={messageToDelete}
        deletingMessageId={deletingMessageId}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDeleteMessage}
      />
    </aside>
  );
}

function MailboxHeader({
  isClearing,
  onClear,
  onRefresh
}: {
  isClearing: boolean;
  onClear(): void;
  onRefresh(): void;
}) {
  const [isConnectOpen, setIsConnectOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <Inbox className="size-5" aria-hidden="true" />
              <h1 className="text-lg leading-tight font-semibold">inbrx</h1>
            </div>
            <p className="text-[12px] leading-4 text-muted-foreground">Local SMTP testing inbox</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsConnectOpen(true)}>
            <Plug data-icon="inline-start" />
            Connect
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw data-icon="inline-start" />
            Refresh
          </Button>
          <Button type="button" variant="destructive" size="sm" disabled={isClearing} onClick={onClear}>
            <Trash2 data-icon="inline-start" />
            {isClearing ? 'Clearing...' : 'Clear'}
          </Button>
        </div>
      </div>
      <ConnectDialog open={isConnectOpen} onOpenChange={setIsConnectOpen} />
    </>
  );
}

function MailboxControls({
  queryText,
  onQueryChange
}: {
  queryText: string;
  onQueryChange(query: string): void;
}) {
  return (
    <div className="px-4 pb-4">
      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Search messages</span>
        <input
          className="h-9 w-full rounded-md border bg-background pr-3 pl-9 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/35"
          placeholder="Search messages"
          type="search"
          value={queryText}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
        />
      </label>
    </div>
  );
}

function MailboxError({ error }: { error: string | null }) {
  return error ? <p className="px-4 pb-3 text-[13px] leading-5 text-destructive">{error}</p> : null;
}

function MessageList({
  hasActiveSearch,
  messages,
  selectedId,
  deletingMessageId,
  onRequestDelete,
  onSelect
}: {
  hasActiveSearch: boolean;
  messages: MessageSummary[];
  selectedId: string | null;
  deletingMessageId: string | null;
  onRequestDelete(messageId: string): void;
  onSelect(messageId: string): void;
}) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-2 p-4">
        {messages.length === 0 ? (
          <EmptyMailbox hasActiveSearch={hasActiveSearch} />
        ) : (
          messages.map((message) => (
            <MessageListItem
              isActive={message.id === selectedId}
              key={message.id}
              message={message}
              deletingMessageId={deletingMessageId}
              onRequestDelete={onRequestDelete}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
}

function EmptyMailbox({ hasActiveSearch }: { hasActiveSearch: boolean }) {
  return (
    <div className="rounded-lg border border-dashed bg-background p-4">
      <p className="text-[13px] font-medium">{hasActiveSearch ? 'No matching messages' : 'Waiting for email'}</p>
      <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
        {hasActiveSearch ? 'Try a different search.' : 'Send a message to the local SMTP server to inspect it here.'}
      </p>
    </div>
  );
}

function MessageListItem({
  message,
  isActive,
  onRequestDelete,
  deletingMessageId,
  onSelect
}: {
  message: MessageSummary;
  isActive: boolean;
  onRequestDelete(messageId: string): void;
  deletingMessageId: string | null;
  onSelect(messageId: string): void;
}) {
  const isDeleting = deletingMessageId === message.id;

  const openMessage = () => {
    onSelect(message.id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(message.id);
    }
  };

  return (
    <div
      className={[
        'flex min-h-[60px] w-full flex-col items-stretch gap-1 overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-colors',
        isActive ? 'border-primary/40 bg-primary/5' : 'border-border bg-background hover:bg-muted'
      ].join(' ')}
      role="button"
      tabIndex={0}
      onClick={openMessage}
      onKeyDown={handleKeyDown}
    >
      <span className="flex min-w-0 items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <strong className="min-w-0 truncate font-medium">{message.subject || '(No subject)'}</strong>
          {message.attachmentCount > 0 ? (
            <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-label={`${message.attachmentCount} attachments`} />
          ) : null}
        </span>
        <span className="shrink-0 text-[12px] text-muted-foreground">{formatMessageTime(message.receivedAt)}</span>
      </span>
      <span className="truncate text-[13px] text-muted-foreground">{message.from || 'unknown'}</span>
      <span className="flex min-w-0 items-center justify-between gap-2 text-[12px] text-muted-foreground">
        <span className="min-w-0 truncate">To {recipientSummary(message.to)}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="shrink-0">{formatBytes(message.rawSizeBytes)}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={isDeleting ? 'Deleting message' : 'Delete message'}
            disabled={isDeleting}
            title={isDeleting ? 'Deleting message' : 'Delete message'}
            onClick={(event) => {
              event.stopPropagation();
              onRequestDelete(message.id);
            }}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
          >
            <Trash2 data-icon="inline-start" />
          </Button>
        </span>
      </span>
    </div>
  );
}

function MessageDeleteDialog({
  message,
  deletingMessageId,
  onCancel,
  onConfirm
}: {
  message: MessageSummary | null;
  deletingMessageId: string | null;
  onCancel(): void;
  onConfirm(): void;
}) {
  if (!message) {
    return null;
  }

  const isDeleting = deletingMessageId === message.id;

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <dialog
      open
      role="dialog"
      aria-modal="true"
      aria-labelledby={`delete-message-${message.id}`}
      className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-[430px] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-4 shadow-2xl"
      onMouseDown={closeOnBackdrop}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <form method="dialog" onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
        <p id={`delete-message-${message.id}`} className="text-sm">
          Delete message {message.subject ? `"${message.subject}"` : 'without a subject'}?
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" size="sm" disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

function recipientSummary(recipients: string[]): string {
  if (recipients.length === 0) {
    return 'unknown';
  }

  if (recipients.length === 1) {
    return recipients[0] ?? 'unknown';
  }

  return `${recipients[0]} +${recipients.length - 1}`;
}
