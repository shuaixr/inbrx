import type { AppConfig, StorageMode } from './types.js';
import { getDefaultDataDir } from './store/data-dir.js';

type ConfigValue = string | number | boolean | null | undefined;

export type ConfigOverrides = Partial<Record<keyof AppConfig | 'smtpStarttls', ConfigValue>>;

const DEFAULTS: AppConfig = {
  smtpHost: '127.0.0.1',
  smtpPort: 2525,
  smtpStartTls: false,
  smtpTlsKeyPath: null,
  smtpTlsCertPath: null,
  httpHost: '127.0.0.1',
  httpPort: 3000,
  maxMessages: 500,
  storage: 'file',
  dataDir: getDefaultDataDir()
};

export function loadConfig(overrides: ConfigOverrides = {}): AppConfig {
  const smtpTlsKeyPath = readOptionalString(
    overrides.smtpTlsKeyPath,
    process.env.INBRX_SMTP_TLS_KEY,
    DEFAULTS.smtpTlsKeyPath
  );
  const smtpTlsCertPath = readOptionalString(
    overrides.smtpTlsCertPath,
    process.env.INBRX_SMTP_TLS_CERT,
    DEFAULTS.smtpTlsCertPath
  );
  const config: AppConfig = {
    smtpHost: readString(overrides.smtpHost, process.env.SMTP_TEST_SMTP_HOST, DEFAULTS.smtpHost),
    smtpPort: readNumber(overrides.smtpPort, process.env.SMTP_TEST_SMTP_PORT, DEFAULTS.smtpPort),
    smtpStartTls:
      readBoolean(
        overrides.smtpStartTls ?? overrides.smtpStarttls,
        process.env.INBRX_SMTP_STARTTLS,
        DEFAULTS.smtpStartTls
      ) ||
      Boolean(smtpTlsKeyPath) ||
      Boolean(smtpTlsCertPath),
    smtpTlsKeyPath,
    smtpTlsCertPath,
    httpHost: readString(overrides.httpHost, process.env.SMTP_TEST_HTTP_HOST, DEFAULTS.httpHost),
    httpPort: readNumber(overrides.httpPort, process.env.SMTP_TEST_HTTP_PORT, DEFAULTS.httpPort),
    maxMessages: readNumber(overrides.maxMessages, process.env.SMTP_TEST_MAX_MESSAGES, DEFAULTS.maxMessages),
    storage: readStorageMode(overrides.storage, process.env.INBRX_STORAGE, DEFAULTS.storage),
    dataDir: readString(overrides.dataDir, process.env.INBRX_DATA_DIR, DEFAULTS.dataDir)
  };

  assertPort(config.smtpPort, 'SMTP port');
  assertPort(config.httpPort, 'HTTP port');

  if (Boolean(config.smtpTlsKeyPath) !== Boolean(config.smtpTlsCertPath)) {
    throw new Error('SMTP TLS key and certificate paths must be provided together.');
  }

  if (!Number.isInteger(config.maxMessages) || config.maxMessages < 1) {
    throw new Error('Max messages must be a positive integer.');
  }

  return config;
}

export function getDefaultConfig(): AppConfig {
  return { ...DEFAULTS };
}

function readString(
  override: ConfigValue,
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

function readOptionalString(
  override: ConfigValue,
  envValue: string | undefined,
  fallback: string | null
): string | null {
  if (override !== undefined && override !== null && override !== '') {
    return String(override);
  }

  if (envValue !== undefined && envValue !== '') {
    return envValue;
  }

  return fallback;
}

function readNumber(
  override: ConfigValue,
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

function readBoolean(override: ConfigValue, envValue: string | undefined, fallback: boolean): boolean {
  const value = override ?? envValue;
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  throw new Error(`Expected a boolean, received "${value}".`);
}

function assertPort(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${label} must be an integer between 1 and 65535.`);
  }
}

function readStorageMode(
  override: ConfigValue,
  envValue: string | undefined,
  fallback: StorageMode
): StorageMode {
  const value = readString(override, envValue, fallback);
  if (value === 'file' || value === 'memory') {
    return value;
  }

  throw new Error('Storage must be either "file" or "memory".');
}
