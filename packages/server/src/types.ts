export type AppConfig = {
  smtpHost: string;
  smtpPort: number;
  httpHost: string;
  httpPort: number;
  maxMessages: number;
};

export type CapturedAttachment = {
  filename: string | null;
  contentType: string;
  sizeBytes: number;
  contentId?: string;
};

export type HeaderValue = string | string[];

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
};

export type MailEnvelope = {
  from: string | null;
  to: string[];
};

export type MessageStore = {
  add(message: CapturedMessage): CapturedMessage;
  list(): CapturedMessage[];
  get(id: string): CapturedMessage | null;
  delete(id: string): boolean;
  clear(): number;
};

export type ManagedServer = {
  listen(port: number, host: string): Promise<void>;
  close(): Promise<void>;
};
