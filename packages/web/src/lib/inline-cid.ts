import type { MessageAttachment } from '@/types';

export function resolveInlineCidUrls({
  html,
  messageId,
  attachments
}: {
  html: string;
  messageId: string;
  attachments: MessageAttachment[];
}): string {
  const cidUrls = cidUrlMap(messageId, attachments);
  const document = new DOMParser().parseFromString(html, 'text/html');

  for (const element of document.querySelectorAll('[src]')) {
    const src = element.getAttribute('src');
    const resolved = src ? resolveCidUrl(src, cidUrls) : null;
    if (resolved) {
      element.setAttribute('src', resolved);
    }
  }

  for (const element of document.querySelectorAll('[srcset]')) {
    const srcset = element.getAttribute('srcset');
    const resolved = srcset ? resolveSrcset(srcset, cidUrls) : null;
    if (resolved) {
      element.setAttribute('srcset', resolved);
    }
  }

  return document.body.innerHTML;
}

function cidUrlMap(messageId: string, attachments: MessageAttachment[]): Map<string, string> {
  const urls = new Map<string, string>();

  for (const attachment of attachments) {
    if (attachment.contentId) {
      urls.set(normalizeContentId(attachment.contentId), attachmentUrl(messageId, attachment.id));
    }
  }

  return urls;
}

function resolveCidUrl(value: string, cidUrls: Map<string, string>): string | null {
  if (!value.toLowerCase().startsWith('cid:')) {
    return null;
  }

  const cid = normalizeContentId(decodeURIComponent(value.slice(4)));
  return cidUrls.get(cid) ?? null;
}

function resolveSrcset(value: string, cidUrls: Map<string, string>): string | null {
  let changed = false;
  const resolved = value
    .split(',')
    .map((candidate) => {
      const trimmed = candidate.trim();
      const match = /^(\S+)(\s+.*)?$/.exec(trimmed);
      if (!match) {
        return candidate;
      }

      const url = match[1] ?? '';
      const descriptor = match[2] ?? '';
      const resolvedUrl = resolveCidUrl(url, cidUrls);
      if (!resolvedUrl) {
        return candidate;
      }

      changed = true;
      return `${resolvedUrl}${descriptor}`;
    })
    .join(', ');

  return changed ? resolved : null;
}

function normalizeContentId(value: string): string {
  return value.trim().replace(/^<|>$/g, '');
}

function attachmentUrl(messageId: string, attachmentId: string): string {
  return `/api/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`;
}
