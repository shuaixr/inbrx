import { createHttpServer } from './http/server.js';
import { createMemoryStore } from './store/memory-store.js';
import { createSmtpServer } from './smtp/server.js';
import type { AppConfig, MessageStore } from './types.js';

export async function startApp(config: AppConfig): Promise<{ store: MessageStore; stop(): Promise<void> }> {
  const store = createMemoryStore({ maxMessages: config.maxMessages });
  const smtpServer = createSmtpServer({ store });
  const httpServer = createHttpServer({ store });

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
