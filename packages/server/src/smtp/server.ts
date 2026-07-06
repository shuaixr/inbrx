import { SMTPServer, type SMTPServerAddress, type SMTPServerDataStream, type SMTPServerSession } from 'smtp-server';
import { parseMessage } from '../mail/parser.js';
import type { CapturedSmtpSession, MailEnvelope, ManagedServer, MessageStore } from '../types.js';

export function createSmtpServer({ store }: { store: MessageStore }): ManagedServer {
  const server = new SMTPServer({
    name: 'inbrx',
    banner: 'inbrx ready',
    authOptional: true,
    disabledCommands: ['AUTH', 'STARTTLS'],
    hidePIPELINING: true,
    logger: false,
    onMailFrom(_address, _session, callback) {
      callback();
    },
    onRcptTo(_address, _session, callback) {
      callback();
    },
    onData(stream, session, callback) {
      void handleData(stream, session, store)
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

async function handleData(
  stream: SMTPServerDataStream,
  session: SMTPServerSession,
  store: MessageStore
): Promise<string> {
  const raw = await readStream(stream);
  const smtp = toCapturedSmtpSession(session);
  const envelope = toMailEnvelope(smtp);
  const message = await parseMessage({ raw, envelope, smtp });
  store.add(message);

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
