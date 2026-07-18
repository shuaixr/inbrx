import { MailApp } from '@/components/mail-app';
import { useMessages } from '@/hooks/use-messages';

export function App() {
  const { messages, selectedId, selectedMessage, isClearing, error, clearMessages, loadMessages, selectMessage } =
    useMessages();

  return (
    <MailApp
      error={error}
      isClearing={isClearing}
      messages={messages}
      selectedId={selectedId}
      selectedMessage={selectedMessage}
      onClear={() => void clearMessages()}
      onRefresh={() => void loadMessages()}
      onSelect={selectMessage}
    />
  );
}
