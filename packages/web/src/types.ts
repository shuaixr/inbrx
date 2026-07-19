export type MessageSummary = {
  id: string;
  receivedAt: string;
  from: string | null;
  to: string[];
  subject: string | null;
  rawSizeBytes: number;
  attachmentCount: number;
};

export type MessageAttachment = {
  id: string;
  filename: string | null;
  contentType: string;
  sizeBytes: number;
};

export type MessageDetail = MessageSummary & {
  cc: string[];
  bcc: string[];
  headers: Record<string, string | string[]>;
  text: string | null;
  html: string | null;
  attachments: MessageAttachment[];
  raw: string;
};

export type ActiveTab = 'body' | 'headers' | 'raw';
