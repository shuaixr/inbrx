import { MailApp } from '@/components/mail-app';
import { useMessages } from '@/hooks/use-messages';

export function App() {
  const {
    messages,
    selectedId,
    selectedMessage,
    isClearing,
    error,
    queryText,
    filter,
    clearMessages,
    loadMessages,
    setQueryText,
    setFilter,
    selectMessage
  } = useMessages();

  return (
    <MailApp
      error={error}
      isClearing={isClearing}
      messages={messages}
      queryText={queryText}
      selectedId={selectedId}
      selectedMessage={selectedMessage}
      filter={filter}
      onClear={() => void clearMessages()}
      onFilterChange={setFilter}
      onQueryChange={setQueryText}
      onRefresh={() => void loadMessages()}
      onSelect={selectMessage}
    />
  );
}
