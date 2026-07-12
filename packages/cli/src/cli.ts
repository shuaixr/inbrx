import { Command } from 'commander';
import { getDefaultConfig, loadConfig, type ConfigOverrides } from './config.js';
import { startApp } from './index.js';
import { getDefaultDataDir } from './store/data-dir.js';

export async function runCli(argv: string[]): Promise<void> {
  const program = createCliProgram();
  await program.parseAsync(normalizeArgv(argv), { from: 'node' });
}

export function createCliProgram(): Command {
  const defaults = getDefaultConfig();
  const program = new Command();

  program
    .name('inbrx')
    .description('Start a local SMTP capture server and web UI.')
    .showHelpAfterError()
    .showSuggestionAfterError();

  program
    .command('start')
    .description('Start the SMTP server and HTTP API/UI.')
    .option('--smtp-host <host>', `SMTP bind host. Default: ${defaults.smtpHost}`)
    .option('--smtp-port <port>', `SMTP port. Default: ${defaults.smtpPort}`)
    .option('--smtp-starttls', 'Advertise and support STARTTLS. Generates a temporary self-signed certificate unless TLS paths are provided.')
    .option('--smtp-tls-key <path>', 'TLS private key path for STARTTLS. Enables STARTTLS when paired with --smtp-tls-cert.')
    .option('--smtp-tls-cert <path>', 'TLS certificate path for STARTTLS. Enables STARTTLS when paired with --smtp-tls-key.')
    .option('--http-host <host>', `HTTP bind host. Default: ${defaults.httpHost}`)
    .option('--http-port <port>', `HTTP port. Default: ${defaults.httpPort}`)
    .option('--max-messages <count>', `Maximum retained messages. Default: ${defaults.maxMessages}`)
    .option('--storage <mode>', `Storage mode: file or memory. Default: ${defaults.storage}`)
    .addHelpText(
      'after',
      `

Environment:
  SMTP_TEST_SMTP_HOST
  SMTP_TEST_SMTP_PORT
  INBRX_SMTP_STARTTLS
  INBRX_SMTP_TLS_KEY
  INBRX_SMTP_TLS_CERT
  SMTP_TEST_HTTP_HOST
  SMTP_TEST_HTTP_PORT
  SMTP_TEST_MAX_MESSAGES
  INBRX_STORAGE`
    )
    .action(async (options: ConfigOverrides) => {
      await startServer(options);
    });

  return program;
}

async function startServer(options: ConfigOverrides): Promise<void> {
  const config = loadConfig(options);
  const app = await startApp(config);

  console.log('SMTP test server ready');
  console.log(`SMTP: smtp://${config.smtpHost}:${config.smtpPort}`);
  console.log(`SMTP STARTTLS: ${config.smtpStartTls ? 'enabled' : 'disabled'}`);
  console.log(`Web UI: http://${config.httpHost}:${config.httpPort}`);
  console.log(`Storage: ${config.storage}${config.storage === 'file' ? ` (${getDefaultDataDir()})` : ''}`);
  console.log('Press Ctrl+C to stop.');

  const shutdown = async (): Promise<void> => {
    console.log('\nShutting down...');
    await app.stop();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

function normalizeArgv(argv: string[]): string[] {
  const firstArg = argv[2];
  if (!firstArg) {
    return [...argv, 'start'];
  }

  if (firstArg.startsWith('-') && firstArg !== '-h' && firstArg !== '--help') {
    return [argv[0] || 'node', argv[1] || 'inbrx', 'start', ...argv.slice(2)];
  }

  return argv;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
