import net from 'node:net';
import nodemailer from 'nodemailer';
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryAttachmentStore } from '../store/attachment-store.js';
import { createMemoryStore } from '../store/memory-store.js';
import type { ManagedServer } from '../types.js';
import { createSmtpServer } from './server.js';

describe('createSmtpServer', () => {
  let smtpServer: ManagedServer | null = null;

  afterEach(async () => {
    await smtpServer?.close();
    smtpServer = null;
  });

  it('captures mail sent through SMTP', async () => {
    const store = createMemoryStore({ maxMessages: 10 });
    const attachmentStore = createMemoryAttachmentStore();
    const port = await getAvailablePort();
    smtpServer = createSmtpServer({ store, attachmentStore });
    await smtpServer.listen(port, '127.0.0.1');

    const transport = nodemailer.createTransport({
      host: '127.0.0.1',
      port,
      secure: false,
      ignoreTLS: true
    });

    const info = await transport.sendMail({
      from: 'sender@example.com',
      to: ['recipient@example.com', 'second@example.com'],
      subject: 'SMTP e2e',
      text: 'Captured text body',
      html: '<strong>Captured HTML body</strong>',
      attachments: [
        {
          filename: 'note.txt',
          content: 'attached text'
        }
      ]
    });

    const [message] = await store.list();
    expect(info.response).toContain('OK captured as');
    expect(message).toBeDefined();
    expect(message?.from).toBe('sender@example.com');
    expect(message?.to).toEqual(['recipient@example.com', 'second@example.com']);
    expect(message?.subject).toBe('SMTP e2e');
    expect(message?.text).toContain('Captured text body');
    expect(message?.html).toContain('<strong>Captured HTML body</strong>');
    expect(message?.attachments).toEqual([
      {
        id: expect.any(String),
        filename: 'note.txt',
        contentType: 'text/plain',
        sizeBytes: Buffer.byteLength('attached text'),
        storageKey: `${message?.id}/${message?.attachments[0]?.id}`
      }
    ]);
    await expect(attachmentStore.get(message?.id || '', message?.attachments[0]?.id || '')).resolves.toMatchObject({
      content: Buffer.from('attached text')
    });
    expect(message?.rawSizeBytes).toBeGreaterThan(0);
    expect(message?.smtp.envelope.mailFrom?.address).toBe('sender@example.com');
    expect(message?.smtp.envelope.rcptTo.map((recipient) => recipient.address)).toEqual([
      'recipient@example.com',
      'second@example.com'
    ]);
  });

  it('accepts optional SMTP auth without validating credentials', async () => {
    const store = createMemoryStore({ maxMessages: 10 });
    const attachmentStore = createMemoryAttachmentStore();
    const port = await getAvailablePort();
    smtpServer = createSmtpServer({ store, attachmentStore });
    await smtpServer.listen(port, '127.0.0.1');

    const transport = nodemailer.createTransport({
      host: '127.0.0.1',
      port,
      secure: false,
      ignoreTLS: true,
      auth: {
        user: 'sender@example.com',
        pass: 'your_password'
      }
    });

    const info = await transport.sendMail({
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'SMTP auth',
      text: 'Captured with auth'
    });

    const [message] = await store.list();
    expect(info.response).toContain('OK captured as');
    expect(message?.from).toBe('sender@example.com');
    expect(message?.to).toEqual(['recipient@example.com']);
    expect(message?.subject).toBe('SMTP auth');
    expect(message?.text).toContain('Captured with auth');
  });
});

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        if (typeof address === 'object' && address) {
          resolve(address.port);
          return;
        }

        reject(new Error('Unable to allocate a local port.'));
      });
    });
  });
}
