import { MessageDetail } from '@/components/message-detail';
import { MessageSidebar } from '@/components/message-sidebar';
import { useMessageMailbox } from '@/contexts/message-mailbox-context';

export function MailApp() {
  const { selectedMessage } = useMessageMailbox();

  return (
    <MailLayout
      sidebar={<MessageSidebar />}
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
