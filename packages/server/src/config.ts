import type { AppConfig } from './types.js';

const DEFAULTS: AppConfig = {
  smtpHost: '127.0.0.1',
  smtpPort: 2525,
  httpHost: '127.0.0.1',
  httpPort: 3000,
  maxMessages: 500
};

const FLAG_MAP = {
  '--smtp-host': 'smtpHost',
  '--smtp-port': 'smtpPort',
  '--http-host': 'httpHost',
  '--http-port': 'httpPort',
  '--max-messages': 'maxMessages'
} as const;

type FlagName = keyof typeof FLAG_MAP;

export function loadConfig(args: string[]): AppConfig {
  const config: AppConfig = {
    smtpHost: process.env.SMTP_TEST_SMTP_HOST || DEFAULTS.smtpHost,
    smtpPort: readNumber(process.env.SMTP_TEST_SMTP_PORT, DEFAULTS.smtpPort),
    httpHost: process.env.SMTP_TEST_HTTP_HOST || DEFAULTS.httpHost,
    httpPort: readNumber(process.env.SMTP_TEST_HTTP_PORT, DEFAULTS.httpPort),
    maxMessages: readNumber(process.env.SMTP_TEST_MAX_MESSAGES, DEFAULTS.maxMessages)
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) {
      continue;
    }

    const [flag, inlineValue] = arg.includes('=') ? arg.split('=', 2) : [arg, undefined];
    if (!isFlagName(flag)) {
      throw new Error(`Unknown option "${arg}". Run "inbrix-smtp help" for usage.`);
    }

    const key = FLAG_MAP[flag];
    const value = inlineValue ?? args[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for ${flag}.`);
    }

    if (inlineValue === undefined) {
      index += 1;
    }

    if (key === 'smtpPort' || key === 'httpPort' || key === 'maxMessages') {
      config[key] = readNumber(value, null);
    } else {
      config[key] = value;
    }
  }

  assertPort(config.smtpPort, 'SMTP port');
  assertPort(config.httpPort, 'HTTP port');

  if (!Number.isInteger(config.maxMessages) || config.maxMessages < 1) {
    throw new Error('Max messages must be a positive integer.');
  }

  return config;
}

export function printHelp(): void {
  console.log(`Inbrix

Usage:
  inbrix-smtp start [options]
  inbrix-smtp help

Options:
  --smtp-host <host>       SMTP bind host. Default: ${DEFAULTS.smtpHost}
  --smtp-port <port>       SMTP port. Default: ${DEFAULTS.smtpPort}
  --http-host <host>       HTTP bind host. Default: ${DEFAULTS.httpHost}
  --http-port <port>       HTTP port. Default: ${DEFAULTS.httpPort}
  --max-messages <count>   Maximum retained messages. Default: ${DEFAULTS.maxMessages}

Environment:
  SMTP_TEST_SMTP_HOST
  SMTP_TEST_SMTP_PORT
  SMTP_TEST_HTTP_HOST
  SMTP_TEST_HTTP_PORT
  SMTP_TEST_MAX_MESSAGES
`);
}

function readNumber(value: string | undefined | null, fallback: number | null): number {
  if (value === undefined || value === null || value === '') {
    if (fallback === null) {
      throw new Error('Expected an integer value.');
    }
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Expected an integer, received "${value}".`);
  }

  return parsed;
}

function assertPort(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${label} must be an integer between 1 and 65535.`);
  }
}

function isFlagName(value: string | undefined): value is FlagName {
  return value !== undefined && value in FLAG_MAP;
}
