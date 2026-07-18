import { Inbox, Paperclip, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatBytes, formatMessageTime } from '@/lib/format';
import type { MessageFilter, MessageSummary } from '@/types';

type MessageSidebarProps = {
  messages: MessageSummary[];
  queryText: string;
  selectedId: string | null;
  filter: MessageFilter;
  isClearing: boolean;
  error: string | null;
  onRefresh(): void;
  onClear(): void;
  onFilterChange(filter: MessageFilter): void;
  onQueryChange(query: string): void;
  onSelect(messageId: string): void;
};

export function MessageSidebar({
  messages,
  queryText,
  selectedId,
  filter,
  isClearing,
  error,
  onRefresh,
  onClear,
  onFilterChange,
  onQueryChange,
  onSelect
}: MessageSidebarProps) {
  const hasActiveView = queryText.trim().length > 0 || filter !== 'all';

  return (
    <aside className="flex min-w-0 flex-col border-r bg-sidebar text-sidebar-foreground max-[760px]:max-h-[42vh] max-[760px]:border-r-0 max-[760px]:border-b">
      <MailboxHeader onRefresh={onRefresh} />

      <MailboxControls filter={filter} queryText={queryText} onFilterChange={onFilterChange} onQueryChange={onQueryChange} />

      <MailboxActions error={error} isClearing={isClearing} onClear={onClear} />

      <Separator />

      <MessageList hasActiveView={hasActiveView} messages={messages} selectedId={selectedId} onSelect={onSelect} />
    </aside>
  );
}

function MailboxHeader({ onRefresh }: { onRefresh(): void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-2">
        <Inbox className="size-5" aria-hidden="true" />
        <h1 className="text-lg leading-tight font-semibold">inbrx</h1>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
        <RefreshCw data-icon="inline-start" />
        Refresh
      </Button>
    </div>
  );
}

function MailboxControls({
  filter,
  queryText,
  onFilterChange,
  onQueryChange
}: {
  filter: MessageFilter;
  queryText: string;
  onFilterChange(filter: MessageFilter): void;
  onQueryChange(query: string): void;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 pb-3">
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
      <div className="grid grid-cols-3 gap-1 rounded-md border bg-background p-1">
        <FilterButton active={filter === 'all'} label="All" onClick={() => onFilterChange('all')} />
        <FilterButton active={filter === 'with-attachments'} label="Files" onClick={() => onFilterChange('with-attachments')} />
        <FilterButton active={filter === 'today'} label="Today" onClick={() => onFilterChange('today')} />
      </div>
    </div>
  );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick(): void }) {
  return (
    <button
      className={[
        'h-7 rounded-sm px-2 text-[12px] font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      ].join(' ')}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function MailboxActions({
  error,
  isClearing,
  onClear
}: {
  error: string | null;
  isClearing: boolean;
  onClear(): void;
}) {
  return (
    <div className="px-4 pb-3">
      <Button className="w-full justify-start" type="button" variant="destructive" disabled={isClearing} onClick={onClear}>
        <Trash2 data-icon="inline-start" />
        {isClearing ? 'Clearing...' : 'Clear'}
      </Button>
      {error ? <p className="mt-2 text-[13px] leading-5 text-destructive">{error}</p> : null}
    </div>
  );
}

function MessageList({
  hasActiveView,
  messages,
  selectedId,
  onSelect
}: {
  hasActiveView: boolean;
  messages: MessageSummary[];
  selectedId: string | null;
  onSelect(messageId: string): void;
}) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-2 p-4">
        {messages.length === 0 ? (
          <EmptyMailbox hasActiveView={hasActiveView} />
        ) : (
          messages.map((message) => (
            <MessageListItem
              isActive={message.id === selectedId}
              key={message.id}
              message={message}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
}

function EmptyMailbox({ hasActiveView }: { hasActiveView: boolean }) {
  return <p className="text-[13px] text-muted-foreground">{hasActiveView ? 'No messages match this view.' : 'No captured messages yet.'}</p>;
}

function MessageListItem({
  message,
  isActive,
  onSelect
}: {
  message: MessageSummary;
  isActive: boolean;
  onSelect(messageId: string): void;
}) {
  return (
    <button
      className={[
        'flex min-h-[68px] w-full flex-col items-stretch gap-1 overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-colors',
        isActive ? 'border-primary/40 bg-primary/5' : 'border-border bg-background hover:bg-muted'
      ].join(' ')}
      type="button"
      onClick={() => onSelect(message.id)}
    >
      <span className="flex min-w-0 items-start justify-between gap-2">
        <strong className="min-w-0 truncate font-medium">{message.subject || '(No subject)'}</strong>
        <span className="shrink-0 text-[12px] text-muted-foreground">{formatMessageTime(message.receivedAt)}</span>
      </span>
      <span className="truncate text-[13px] text-muted-foreground">{message.from || 'unknown'}</span>
      <span className="flex min-w-0 items-center justify-between gap-2 text-[12px] text-muted-foreground">
        <span className="min-w-0 truncate">To {recipientSummary(message.to)}</span>
        <span className="flex shrink-0 items-center gap-2">
          {message.attachmentCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="size-3" aria-hidden="true" />
              {message.attachmentCount}
            </span>
          ) : null}
          <span>{formatBytes(message.rawSizeBytes)}</span>
        </span>
      </span>
    </button>
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
