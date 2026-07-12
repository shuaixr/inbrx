import { randomUUID } from 'node:crypto';
import { simpleParser, type AddressObject, type HeaderValue as ParsedHeaderValue } from 'mailparser';
import type {
  AttachmentStore,
  CapturedAttachment,
  CapturedMessage,
  CapturedSmtpSession,
  HeaderValue,
  MailEnvelope
} from '../types.js';

export async function parseMessage({
  raw,
  envelope,
  smtp,
  attachmentStore
}: {
  raw: string;
  envelope: MailEnvelope;
  smtp: CapturedSmtpSession;
  attachmentStore: AttachmentStore;
}): Promise<CapturedMessage> {
  const parsed = await simpleParser(Buffer.from(raw));
  const id = randomUUID();
  const attachments: CapturedAttachment[] = [];

  for (const attachment of parsed.attachments) {
    attachments.push(
      await attachmentStore.save({
        messageId: id,
        filename: attachment.filename || null,
        contentType: attachment.contentType,
        contentId: attachment.contentId,
        content: attachment.content
      })
    );
  }

  return {
    id,
    receivedAt: new Date().toISOString(),
    from: envelope.from || firstAddress(parsed.from),
    to: envelope.to.length > 0 ? envelope.to : addressList(parsed.to),
    cc: addressList(parsed.cc),
    bcc: addressList(parsed.bcc),
    subject: parsed.subject || null,
    headers: headersToRecord(parsed.headers),
    text: parsed.text || null,
    html: typeof parsed.html === 'string' ? parsed.html : null,
    attachments,
    rawSizeBytes: Buffer.byteLength(raw),
    raw,
    smtp
  };
}

function headersToRecord(parsedHeaders: Map<string, ParsedHeaderValue>): Record<string, HeaderValue> {
  const record: Record<string, HeaderValue> = {};
  for (const [key, value] of parsedHeaders) {
    record[key] = headerValueToString(value);
  }
  return record;
}

function headerValueToString(value: ParsedHeaderValue): HeaderValue {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object' && value !== null) {
    return 'text' in value ? value.text : JSON.stringify(value);
  }

  return String(value);
}

function firstAddress(value: AddressObject | undefined): string | null {
  return value?.value.find((address) => Boolean(address.address))?.address || null;
}

function addressList(value: AddressObject | AddressObject[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.flatMap((item) => item.value.map((address) => address.address).filter(Boolean) as string[]);
}
