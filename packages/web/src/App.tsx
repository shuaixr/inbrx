import { MessageDetail } from '@/components/mail/message-detail';
import { MessageSidebar } from '@/components/mail/message-sidebar';
import { useMessages } from '@/hooks/use-messages';

export function App() {
  const { messages, selectedId, selectedMessage, isClearing, error, clearMessages, loadMessages, selectMessage } =
    useMessages();

  return (
    <main className="grid min-h-screen grid-cols-[minmax(280px,360px)_minmax(0,1fr)] bg-background text-foreground max-[760px]:grid-cols-1">
      <MessageSidebar
        error={error}
        isClearing={isClearing}
        messages={messages}
        selectedId={selectedId}
        onClear={() => void clearMessages()}
        onRefresh={() => void loadMessages()}
        onSelect={selectMessage}
      />
      <MessageDetail message={selectedMessage} />
    </main>
  );
}
