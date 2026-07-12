import { afterEach, describe, expect, it } from 'vitest';
import { getDefaultConfig, loadConfig } from './config.js';

const ENV_KEYS = [
  'SMTP_TEST_SMTP_HOST',
  'SMTP_TEST_SMTP_PORT',
  'INBRX_SMTP_STARTTLS',
  'INBRX_SMTP_TLS_KEY',
  'INBRX_SMTP_TLS_CERT',
  'SMTP_TEST_HTTP_HOST',
  'SMTP_TEST_HTTP_PORT',
  'SMTP_TEST_MAX_MESSAGES',
  'INBRX_STORAGE'
] as const;

describe('loadConfig', () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  it('returns the default config', () => {
    expect(loadConfig()).toEqual(getDefaultConfig());
  });

  it('reads environment variables', () => {
    process.env.SMTP_TEST_SMTP_HOST = '0.0.0.0';
    process.env.SMTP_TEST_SMTP_PORT = '2526';
    process.env.INBRX_SMTP_STARTTLS = 'true';
    process.env.INBRX_SMTP_TLS_KEY = '/tmp/smtp.key';
    process.env.INBRX_SMTP_TLS_CERT = '/tmp/smtp.crt';
    process.env.SMTP_TEST_HTTP_HOST = 'localhost';
    process.env.SMTP_TEST_HTTP_PORT = '3001';
    process.env.SMTP_TEST_MAX_MESSAGES = '25';
    process.env.INBRX_STORAGE = 'memory';

    expect(loadConfig()).toEqual({
      smtpHost: '0.0.0.0',
      smtpPort: 2526,
      smtpStartTls: true,
      smtpTlsKeyPath: '/tmp/smtp.key',
      smtpTlsCertPath: '/tmp/smtp.crt',
      httpHost: 'localhost',
      httpPort: 3001,
      maxMessages: 25,
      storage: 'memory'
    });
  });

  it('prefers explicit overrides over environment variables', () => {
    process.env.SMTP_TEST_SMTP_PORT = '2526';

    expect(loadConfig({ smtpPort: '2527' }).smtpPort).toBe(2527);
  });

  it('rejects non-integer numeric values', () => {
    expect(() => loadConfig({ smtpPort: 'abc' })).toThrow('Expected an integer');
  });

  it('rejects ports outside the valid range', () => {
    expect(() => loadConfig({ httpPort: 70000 })).toThrow('HTTP port must be an integer between 1 and 65535.');
  });

  it('rejects non-positive max message counts', () => {
    expect(() => loadConfig({ maxMessages: 0 })).toThrow('Max messages must be a positive integer.');
  });

  it('rejects invalid storage modes', () => {
    expect(() => loadConfig({ storage: 'sqlite' })).toThrow('Storage must be either "file" or "memory".');
  });

  it('enables STARTTLS when TLS certificate paths are provided', () => {
    expect(
      loadConfig({
        smtpTlsKeyPath: '/tmp/smtp.key',
        smtpTlsCertPath: '/tmp/smtp.crt'
      })
    ).toMatchObject({
      smtpStartTls: true,
      smtpTlsKeyPath: '/tmp/smtp.key',
      smtpTlsCertPath: '/tmp/smtp.crt'
    });
  });

  it('rejects incomplete TLS certificate path configuration', () => {
    expect(() => loadConfig({ smtpStartTls: true, smtpTlsKeyPath: '/tmp/smtp.key' })).toThrow(
      'SMTP TLS key and certificate paths must be provided together.'
    );
  });

  it('rejects invalid boolean values', () => {
    expect(() => loadConfig({ smtpStartTls: 'maybe' })).toThrow('Expected a boolean');
  });
});
