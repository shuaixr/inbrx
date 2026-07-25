import { MailApp } from '@/components/mail-app';
import { useMessages } from '@/hooks/use-messages';

export function App() {
  const {
    messages,
    selectedId,
    selectedMessage,
    isClearing,
    deletingMessageId,
    error,
    queryText,
    clearMessages,
    deleteMessage,
    loadMessages,
    setQueryText,
    selectMessage
  } = useMessages();

  return (
    <MailApp
      error={error}
      isClearing={isClearing}
      deletingMessageId={deletingMessageId}
      messages={messages}
      queryText={queryText}
      selectedId={selectedId}
      selectedMessage={selectedMessage}
      onClear={() => void clearMessages()}
      onDeleteMessage={(messageId) => void deleteMessage(messageId)}
      onQueryChange={setQueryText}
      onRefresh={() => void loadMessages()}
      onSelect={selectMessage}
    />
  );
}
