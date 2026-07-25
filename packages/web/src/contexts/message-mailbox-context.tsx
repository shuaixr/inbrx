import { createContext, type ReactNode, useContext } from 'react';
import type { useMessages } from '@/hooks/use-messages';

export type MessageMailboxContextValue = ReturnType<typeof useMessages>;

const MessageMailboxContext = createContext<MessageMailboxContextValue | null>(null);

export function MessageMailboxProvider({
  value,
  children
}: {
  value: MessageMailboxContextValue;
  children: ReactNode;
}) {
  return <MessageMailboxContext.Provider value={value}>{children}</MessageMailboxContext.Provider>;
}

export function useMessageMailbox(): MessageMailboxContextValue {
  const value = useContext(MessageMailboxContext);

  if (!value) {
    throw new Error('useMessageMailbox must be used within MessageMailboxProvider.');
  }

  return value;
}
