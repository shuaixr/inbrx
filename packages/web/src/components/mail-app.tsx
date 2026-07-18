import { MessageDetail } from '@/components/message-detail';
import { MessageSidebar } from '@/components/message-sidebar';
import type { MessageDetail as MessageDetailType, MessageFilter, MessageSummary } from '@/types';

type MailAppProps = {
  messages: MessageSummary[];
  queryText: string;
  selectedId: string | null;
  selectedMessage: MessageDetailType | null;
  filter: MessageFilter;
  isClearing: boolean;
  error: string | null;
  onRefresh(): void;
  onClear(): void;
  onFilterChange(filter: MessageFilter): void;
  onQueryChange(query: string): void;
  onSelect(messageId: string): void;
};

export function MailApp({
  messages,
  queryText,
  selectedId,
  selectedMessage,
  filter,
  isClearing,
  error,
  onRefresh,
  onClear,
  onFilterChange,
  onQueryChange,
  onSelect
}: MailAppProps) {
  return (
    <MailLayout
      sidebar={
        <MessageSidebar
          error={error}
          filter={filter}
          isClearing={isClearing}
          messages={messages}
          queryText={queryText}
          selectedId={selectedId}
          onClear={onClear}
          onFilterChange={onFilterChange}
          onQueryChange={onQueryChange}
          onRefresh={onRefresh}
          onSelect={onSelect}
        />
      }
      detail={<MessageDetail message={selectedMessage} />}
    />
  );
}

function MailLayout({ sidebar, detail }: { sidebar: React.ReactNode; detail: React.ReactNode }) {
  return (
    <main className="grid min-h-screen grid-cols-[minmax(280px,360px)_minmax(0,1fr)] bg-background text-foreground max-[760px]:grid-cols-1">
      {sidebar}
      {detail}
    </main>
  );
}
