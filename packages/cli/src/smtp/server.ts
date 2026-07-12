import { readFile } from 'node:fs/promises';
import { SMTPServer, type SMTPServerAddress, type SMTPServerDataStream, type SMTPServerSession } from 'smtp-server';
import { generate } from 'selfsigned';
import { parseMessage } from '../mail/parser.js';
import type { AttachmentStore, CapturedSmtpSession, MailEnvelope, ManagedServer, MessageStore } from '../types.js';

type SmtpTlsConfig = {
  key: string | Buffer;
  cert: string | Buffer;
};

export async function createSmtpServer({
  store,
  attachmentStore,
  startTls = false,
  tlsKeyPath = null,
  tlsCertPath = null
}: {
  store: MessageStore;
  attachmentStore: AttachmentStore;
  startTls?: boolean;
  tlsKeyPath?: string | null;
  tlsCertPath?: string | null;
}): Promise<ManagedServer> {
  const tlsConfig = startTls ? await createTlsConfig({ keyPath: tlsKeyPath, certPath: tlsCertPath }) : null;
  const server = new SMTPServer({
    name: 'inbrx',
    banner: 'inbrx ready',
    ...(tlsConfig ?? {}),
    authOptional: true,
    allowInsecureAuth: true,
    disabledCommands: startTls ? [] : ['STARTTLS'],
    hidePIPELINING: true,
    logger: false,
    onAuth(auth, _session, callback) {
      callback(null, { user: auth.username || 'anonymous' });
    },
    onMailFrom(_address, _session, callback) {
      callback();
    },
    onRcptTo(_address, _session, callback) {
      callback();
    },
    onData(stream, session, callback) {
      void handleData(stream, session, store, attachmentStore)
        .then((messageId) => callback(null, `OK captured as ${messageId}`))
        .catch((error: unknown) => callback(error instanceof Error ? error : new Error(String(error))));
    }
  });

  return {
    listen(port, host) {
      return new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          server.off('error', reject);
          resolve();
        });
      });
    },

    close() {
      return new Promise<void>((resolve) => {
        server.close(resolve);
      });
    }
  };
}

async function createTlsConfig({
  keyPath,
  certPath
}: {
  keyPath: string | null;
  certPath: string | null;
}): Promise<SmtpTlsConfig> {
  if (keyPath || certPath) {
    if (!keyPath || !certPath) {
      throw new Error('SMTP TLS key and certificate paths must be provided together.');
    }

    const [key, cert] = await Promise.all([readFile(keyPath), readFile(certPath)]);
    return { key, cert };
  }

  const pems = await generate([{ name: 'commonName', value: 'localhost' }], {
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'basicConstraints',
        cA: false
      },
      {
        name: 'keyUsage',
        digitalSignature: true,
        keyEncipherment: true
      },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: '::1' }
        ]
      }
    ]
  });

  return {
    key: pems.private,
    cert: pems.cert
  };
}

async function handleData(
  stream: SMTPServerDataStream,
  session: SMTPServerSession,
  store: MessageStore,
  attachmentStore: AttachmentStore
): Promise<string> {
  const raw = await readStream(stream);
  const smtp = toCapturedSmtpSession(session);
  const envelope = toMailEnvelope(smtp);
  const message = await parseMessage({ raw, envelope, smtp, attachmentStore });
  try {
    await store.add(message);
  } catch (error) {
    await attachmentStore.deleteForMessage(message.id);
    throw error;
  }

  return message.id;
}

function readStream(stream: SMTPServerDataStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    stream.on('error', reject);
    stream.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
  });
}

function toCapturedSmtpSession(session: SMTPServerSession): CapturedSmtpSession {
  return {
    id: session.id,
    remoteAddress: session.remoteAddress,
    remotePort: session.remotePort,
    clientHostname: session.clientHostname,
    openingCommand: session.openingCommand,
    hostNameAppearsAs: session.hostNameAppearsAs,
    secure: session.secure,
    envelope: {
      mailFrom: session.envelope.mailFrom ? toCapturedAddress(session.envelope.mailFrom) : null,
      rcptTo: session.envelope.rcptTo.map(toCapturedAddress)
    }
  };
}

function toCapturedAddress(address: SMTPServerAddress): { address: string; args: Record<string, unknown> } {
  return {
    address: address.address,
    args: address.args && typeof address.args === 'object' ? (address.args as Record<string, unknown>) : {}
  };
}

function toMailEnvelope(smtp: CapturedSmtpSession): MailEnvelope {
  return {
    from: smtp.envelope.mailFrom?.address || null,
    to: smtp.envelope.rcptTo.map((recipient) => recipient.address)
  };
}
