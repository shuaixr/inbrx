export type MailboxEvent =
  | { type: 'message.created'; id: string; receivedAt: string }
  | { type: 'message.deleted'; id: string }
  | { type: 'messages.cleared'; deleted: number };

export type MailboxEventListener = (event: MailboxEvent) => void;

export type MailboxEvents = {
  emit(event: MailboxEvent): void;
  subscribe(listener: MailboxEventListener): () => void;
};

export function createMailboxEvents(): MailboxEvents {
  const listeners = new Set<MailboxEventListener>();

  return {
    emit(event) {
      for (const listener of listeners) {
        listener(event);
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
