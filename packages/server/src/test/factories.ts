import type { CapturedMessage, CapturedSmtpSession } from '../types.js';

export function createCapturedSmtpSession(
  overrides: Partial<CapturedSmtpSession> = {}
): CapturedSmtpSession {
  return {
    id: 'smtp-session-1',
    remoteAddress: '127.0.0.1',
    remotePort: 50000,
    clientHostname: '[127.0.0.1]',
    openingCommand: 'EHLO',
    hostNameAppearsAs: 'localhost',
    secure: false,
    envelope: {
      mailFrom: {
        address: 'sender@example.com',
        args: {}
      },
      rcptTo: [
        {
          address: 'recipient@example.com',
          args: {}
        }
      ]
    },
    ...overrides
  };
}

export function createCapturedMessage(overrides: Partial<CapturedMessage> = {}): CapturedMessage {
  return {
    id: 'message-1',
    receivedAt: '2026-07-06T00:00:00.000Z',
    from: 'sender@example.com',
    to: ['recipient@example.com'],
    cc: [],
    bcc: [],
    subject: 'Hello',
    headers: {
      subject: 'Hello'
    },
    text: 'Hello from inbrx',
    html: '<p>Hello from inbrx</p>',
    attachments: [],
    rawSizeBytes: 128,
    raw: 'Subject: Hello\r\n\r\nHello from inbrx',
    smtp: createCapturedSmtpSession(),
    ...overrides
  };
}
