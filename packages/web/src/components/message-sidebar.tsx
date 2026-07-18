import { Inbox, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { MessageSummary } from '@/types';

type MessageSidebarProps = {
  messages: MessageSummary[];
  selectedId: string | null;
  isClearing: boolean;
  error: string | null;
  onRefresh(): void;
  onClear(): void;
  onSelect(messageId: string): void;
};

export function MessageSidebar({
  messages,
  selectedId,
  isClearing,
  error,
  onRefresh,
  onClear,
  onSelect
}: MessageSidebarProps) {
  return (
    <aside className="flex min-w-0 flex-col border-r bg-sidebar text-sidebar-foreground max-[760px]:max-h-[42vh] max-[760px]:border-r-0 max-[760px]:border-b">
      <MailboxHeader onRefresh={onRefresh} />

      <MailboxActions error={error} isClearing={isClearing} onClear={onClear} />

      <Separator />

      <MessageList messages={messages} selectedId={selectedId} onSelect={onSelect} />
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
  messages,
  selectedId,
  onSelect
}: {
  messages: MessageSummary[];
  selectedId: string | null;
  onSelect(messageId: string): void;
}) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-2 p-4">
        {messages.length === 0 ? (
          <EmptyMailbox />
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

function EmptyMailbox() {
  return <p className="text-[13px] text-muted-foreground">No captured messages yet.</p>;
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
      <strong className="truncate font-medium">{message.subject || '(No subject)'}</strong>
      <span className="truncate text-[13px] text-muted-foreground">
        {message.from || 'unknown'} -&gt; {message.to.join(', ') || 'unknown'}
      </span>
    </button>
  );
}
