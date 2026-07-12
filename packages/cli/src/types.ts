export type AppConfig = {
  smtpHost: string;
  smtpPort: number;
  smtpStartTls: boolean;
  smtpTlsKeyPath: string | null;
  smtpTlsCertPath: string | null;
  httpHost: string;
  httpPort: number;
  maxMessages: number;
  storage: StorageMode;
};

export type StorageMode = 'file' | 'memory';

export type CapturedAttachment = {
  id: string;
  filename: string | null;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  contentId?: string;
};

export type HeaderValue = string | string[];

export type CapturedSmtpSession = {
  id: string;
  remoteAddress: string;
  remotePort: number;
  clientHostname: string;
  openingCommand: string;
  hostNameAppearsAs: string;
  secure: boolean;
  envelope: {
    mailFrom: {
      address: string;
      args: Record<string, unknown>;
    } | null;
    rcptTo: Array<{
      address: string;
      args: Record<string, unknown>;
    }>;
  };
};

export type CapturedMessage = {
  id: string;
  receivedAt: string;
  from: string | null;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string | null;
  headers: Record<string, HeaderValue>;
  text: string | null;
  html: string | null;
  attachments: CapturedAttachment[];
  rawSizeBytes: number;
  raw: string;
  smtp: CapturedSmtpSession;
};

export type MailEnvelope = {
  from: string | null;
  to: string[];
};

export type MessageStore = {
  add(message: CapturedMessage): Promise<CapturedMessage>;
  list(): Promise<CapturedMessage[]>;
  get(id: string): Promise<CapturedMessage | null>;
  delete(id: string): Promise<boolean>;
  clear(): Promise<number>;
};

export type StoredAttachment = CapturedAttachment & {
  content: Buffer;
};

export type AttachmentStore = {
  save(input: {
    messageId: string;
    filename: string | null;
    contentType: string;
    contentId?: string;
    content: Buffer;
  }): Promise<CapturedAttachment>;
  get(messageId: string, attachmentId: string): Promise<StoredAttachment | null>;
  deleteForMessage(messageId: string): Promise<void>;
  clear(): Promise<void>;
};

export type ManagedServer = {
  listen(port: number, host: string): Promise<void>;
  close(): Promise<void>;
};
