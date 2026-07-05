import { loadConfig, printHelp } from './config.js';
import { startApp } from './index.js';

export async function runCli(argv: string[]): Promise<void> {
  const command = argv[2] || 'start';

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command !== 'start') {
    throw new Error(`Unknown command "${command}". Run "inbrix-smtp help" for usage.`);
  }

  const config = loadConfig(argv.slice(3));
  const app = await startApp(config);

  console.log('SMTP test server ready');
  console.log(`SMTP: smtp://${config.smtpHost}:${config.smtpPort}`);
  console.log(`Web UI: http://${config.httpHost}:${config.httpPort}`);
  console.log('Press Ctrl+C to stop.');

  const shutdown = async (): Promise<void> => {
    console.log('\nShutting down...');
    await app.stop();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
