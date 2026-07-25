import { MailApp } from '@/components/mail-app';
import { MessageMailboxProvider } from '@/contexts/message-mailbox-context';
import { useMessages } from '@/hooks/use-messages';

export function App() {
  const messageMailbox = useMessages();

  return (
    <MessageMailboxProvider value={messageMailbox}>
      <MailApp />
    </MessageMailboxProvider>
  );
}
