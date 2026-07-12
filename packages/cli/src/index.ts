import { createHttpServer } from './http/server.js';
import { createFileAttachmentStore, createMemoryAttachmentStore } from './store/attachment-store.js';
import { getDefaultDataDir } from './store/data-dir.js';
import { createFileMessageStore } from './store/file-store.js';
import { createMemoryStore } from './store/memory-store.js';
import { createSmtpServer } from './smtp/server.js';
import type { AppConfig, AttachmentStore, MessageStore } from './types.js';

export async function startApp(config: AppConfig): Promise<{ store: MessageStore; stop(): Promise<void> }> {
  const { store, attachmentStore } = createStores(config);
  const smtpServer = createSmtpServer({ store, attachmentStore });
  const httpServer = createHttpServer({ store, attachmentStore });

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

function createStores(config: AppConfig): { store: MessageStore; attachmentStore: AttachmentStore } {
  if (config.storage === 'memory') {
    const attachmentStore = createMemoryAttachmentStore();
    return {
      attachmentStore,
      store: createMemoryStore({
        maxMessages: config.maxMessages,
        onDelete: (messageId) => attachmentStore.deleteForMessage(messageId)
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
      onDelete: (messageId) => attachmentStore.deleteForMessage(messageId)
    })
  };
}
