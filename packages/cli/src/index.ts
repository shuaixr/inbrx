import { createMailboxEvents, type MailboxEvents } from './events/mailbox-events.js';
import { createHttpServer, toConnectionSettings } from './http/server.js';
import { createFileAttachmentStore, createMemoryAttachmentStore } from './store/attachment-store.js';
import { getDefaultDataDir } from './store/data-dir.js';
import { createFileMessageStore } from './store/file-store.js';
import { createMemoryStore } from './store/memory-store.js';
import { createSmtpServer } from './smtp/server.js';
import type { AppConfig, AttachmentStore, MessageStore } from './types.js';

export async function startApp(config: AppConfig): Promise<{ store: MessageStore; stop(): Promise<void> }> {
  const events = createMailboxEvents();
  const { store, attachmentStore } = createStores(config, events);
  const smtpServer = await createSmtpServer({
    store,
    attachmentStore,
    events,
    startTls: config.smtpStartTls,
    tlsKeyPath: config.smtpTlsKeyPath,
    tlsCertPath: config.smtpTlsCertPath
  });
  const httpServer = createHttpServer({ store, attachmentStore, connectionSettings: toConnectionSettings(config), events });

  await Promise.all([
    smtpServer.listen(config.smtpPort, config.smtpHost),
    httpServer.listen(config.httpPort, config.httpHost)
  ]);

  return {
    store,
    async stop() {
      await Promise.allSettled([smtpServer.close(), httpServer.close()]);
    }
  };
}

function createStores(config: AppConfig, events: MailboxEvents): { store: MessageStore; attachmentStore: AttachmentStore } {
  if (config.storage === 'memory') {
    const attachmentStore = createMemoryAttachmentStore();
    return {
      attachmentStore,
      store: createMemoryStore({
        maxMessages: config.maxMessages,
        onDelete: createDeleteHandler(attachmentStore, events)
      })
    };
  }

  const dataDir = getDefaultDataDir();
  const attachmentStore = createFileAttachmentStore({ rootDir: dataDir });
  return {
    attachmentStore,
    store: createFileMessageStore({
      rootDir: dataDir,
      maxMessages: config.maxMessages,
      onDelete: createDeleteHandler(attachmentStore, events)
    })
  };
}

function createDeleteHandler(
  attachmentStore: AttachmentStore,
  events: MailboxEvents
): (messageId: string, reason: 'deleted' | 'cleared' | 'evicted') => Promise<void> {
  return async (messageId, reason) => {
    await attachmentStore.deleteForMessage(messageId);
    if (reason === 'evicted') {
      events.emit({ type: 'message.deleted', id: messageId });
    }
  };
}
