import type { AppConfig, StorageMode } from './types.js';

export type ConfigOverrides = Partial<Record<keyof AppConfig, string | number | undefined>>;

const DEFAULTS: AppConfig = {
  smtpHost: '127.0.0.1',
  smtpPort: 2525,
  httpHost: '127.0.0.1',
  httpPort: 3000,
  maxMessages: 500,
  storage: 'file'
};

export function loadConfig(overrides: ConfigOverrides = {}): AppConfig {
  const config: AppConfig = {
    smtpHost: readString(overrides.smtpHost, process.env.SMTP_TEST_SMTP_HOST, DEFAULTS.smtpHost),
    smtpPort: readNumber(overrides.smtpPort, process.env.SMTP_TEST_SMTP_PORT, DEFAULTS.smtpPort),
    httpHost: readString(overrides.httpHost, process.env.SMTP_TEST_HTTP_HOST, DEFAULTS.httpHost),
    httpPort: readNumber(overrides.httpPort, process.env.SMTP_TEST_HTTP_PORT, DEFAULTS.httpPort),
    maxMessages: readNumber(overrides.maxMessages, process.env.SMTP_TEST_MAX_MESSAGES, DEFAULTS.maxMessages),
    storage: readStorageMode(overrides.storage, process.env.INBRX_STORAGE, DEFAULTS.storage)
  };

  assertPort(config.smtpPort, 'SMTP port');
  assertPort(config.httpPort, 'HTTP port');

  if (!Number.isInteger(config.maxMessages) || config.maxMessages < 1) {
    throw new Error('Max messages must be a positive integer.');
  }

  return config;
}

export function getDefaultConfig(): AppConfig {
  return { ...DEFAULTS };
}

function readString(
  override: string | number | undefined,
  envValue: string | undefined,
  fallback: string
): string {
  if (override !== undefined && override !== '') {
    return String(override);
  }

  if (envValue !== undefined && envValue !== '') {
    return envValue;
  }

  return fallback;
}

function readNumber(
  override: string | number | undefined,
  envValue: string | undefined,
  fallback: number
): number {
  const value = override ?? envValue;
  if (value === undefined || value === '') {
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

function readStorageMode(
  override: string | number | undefined,
  envValue: string | undefined,
  fallback: StorageMode
): StorageMode {
  const value = readString(override, envValue, fallback);
  if (value === 'file' || value === 'memory') {
    return value;
  }

  throw new Error('Storage must be either "file" or "memory".');
}
