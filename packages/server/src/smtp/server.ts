import net from 'node:net';
import { parseMessage } from '../mail/parser.js';
import type { MailEnvelope, ManagedServer, MessageStore } from '../types.js';

type SmtpSession = {
  buffer: string;
  dataMode: boolean;
  dataLines: string[];
  envelope: MailEnvelope;
};

export function createSmtpServer({ store }: { store: MessageStore }): ManagedServer {
  const server = net.createServer((socket) => handleConnection(socket, store));

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
      return new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}

function handleConnection(socket: net.Socket, store: MessageStore): void {
  const session: SmtpSession = {
    buffer: '',
    dataMode: false,
    dataLines: [],
    envelope: {
      from: null,
      to: []
    }
  };

  socket.setEncoding('utf8');
  write(socket, '220 inbrix-smtp ESMTP ready');

  socket.on('data', (chunk) => {
    session.buffer += chunk;
    processBuffer(socket, session, store);
  });

  socket.on('error', () => {
    socket.destroy();
  });
}

function processBuffer(socket: net.Socket, session: SmtpSession, store: MessageStore): void {
  let lineEnd: number;
  while ((lineEnd = session.buffer.indexOf('\n')) !== -1) {
    const rawLine = session.buffer.slice(0, lineEnd).replace(/\r$/, '');
    session.buffer = session.buffer.slice(lineEnd + 1);

    if (session.dataMode) {
      if (rawLine === '.') {
        finishData(socket, session, store);
      } else {
        session.dataLines.push(rawLine.startsWith('..') ? rawLine.slice(1) : rawLine);
      }
      continue;
    }

    handleCommand(socket, session, rawLine);
  }
}

function handleCommand(socket: net.Socket, session: SmtpSession, line: string): void {
  const upper = line.toUpperCase();

  if (upper.startsWith('EHLO')) {
    write(socket, '250-inbrix-smtp');
    write(socket, '250-8BITMIME');
    write(socket, '250 SIZE');
    return;
  }

  if (upper.startsWith('HELO')) {
    write(socket, '250 inbrix-smtp');
    return;
  }

  if (upper.startsWith('MAIL FROM:')) {
    session.envelope.from = parsePath(line.slice(10));
    session.envelope.to = [];
    write(socket, '250 OK');
    return;
  }

  if (upper.startsWith('RCPT TO:')) {
    const recipient = parsePath(line.slice(8));
    if (recipient) {
      session.envelope.to.push(recipient);
    }
    write(socket, '250 OK');
    return;
  }

  if (upper === 'DATA') {
    if (!session.envelope.from || session.envelope.to.length === 0) {
      write(socket, '503 MAIL FROM and RCPT TO are required before DATA');
      return;
    }

    session.dataMode = true;
    session.dataLines = [];
    write(socket, '354 End data with <CR><LF>.<CR><LF>');
    return;
  }

  if (upper === 'RSET') {
    session.dataMode = false;
    session.dataLines = [];
    session.envelope = { from: null, to: [] };
    write(socket, '250 OK');
    return;
  }

  if (upper === 'NOOP') {
    write(socket, '250 OK');
    return;
  }

  if (upper === 'QUIT') {
    write(socket, '221 Bye');
    socket.end();
    return;
  }

  write(socket, '502 Command not implemented');
}

function finishData(socket: net.Socket, session: SmtpSession, store: MessageStore): void {
  const raw = `${session.dataLines.join('\r\n')}\r\n`;
  const message = parseMessage({ raw, envelope: session.envelope });
  store.add(message);

  session.dataMode = false;
  session.dataLines = [];
  session.envelope = { from: null, to: [] };

  write(socket, `250 OK captured as ${message.id}`);
}

function parsePath(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/<([^>]+)>/);
  return (match?.[1] ?? trimmed).split(/\s+/)[0] || null;
}

function write(socket: net.Socket, line: string): void {
  socket.write(`${line}\r\n`);
}
