import { MessageDetail } from '@/components/message-detail';
import { MessageSidebar } from '@/components/message-sidebar';
import type { MessageDetail as MessageDetailType, MessageSummary } from '@/types';

type MailAppProps = {
  messages: MessageSummary[];
  selectedId: string | null;
  selectedMessage: MessageDetailType | null;
  isClearing: boolean;
  error: string | null;
  onRefresh(): void;
  onClear(): void;
  onSelect(messageId: string): void;
};

export function MailApp({
  messages,
  selectedId,
  selectedMessage,
  isClearing,
  error,
  onRefresh,
  onClear,
  onSelect
}: MailAppProps) {
  return (
    <MailLayout
      sidebar={
        <MessageSidebar
          error={error}
          isClearing={isClearing}
          messages={messages}
          selectedId={selectedId}
          onClear={onClear}
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
