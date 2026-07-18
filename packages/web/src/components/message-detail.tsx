import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatBytes } from '@/lib/format';
import type { ActiveTab, MessageAttachment, MessageDetail as MessageDetailType } from '@/types';

type MessageDetailProps = {
  message: MessageDetailType | null;
};

const tabPanelClass = 'min-h-0 flex-1 overflow-auto rounded-lg border bg-card p-4 text-card-foreground';

export function MessageDetail({ message }: MessageDetailProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('body');

  if (!message) {
    return <EmptyMessageDetail />;
  }

  return (
    <section className="min-w-0 p-6">
      <article className="flex h-[calc(100vh-48px)] min-w-0 flex-col gap-[18px] max-[760px]:h-auto max-[760px]:min-h-[55vh]">
        <MessageHeader message={message} />

        <Tabs
          className="min-h-0 flex-1"
          value={activeTab}
          onValueChange={(value: string) => setActiveTab(value as ActiveTab)}
        >
          <MessageContentTabs message={message} />
        </Tabs>
      </article>
    </section>
  );
}

function EmptyMessageDetail() {
  return (
    <section className="min-w-0 p-6">
      <div className="flex flex-col gap-2 pt-[20vh]">
        <h2 className="text-[22px] leading-snug font-semibold">No message selected</h2>
        <p className="text-muted-foreground">Send an email to the local SMTP server and select it here.</p>
      </div>
    </section>
  );
}

function MessageHeader({ message }: { message: MessageDetailType }) {
  return (
    <header className="flex flex-col gap-2">
      <p className="text-[13px] text-muted-foreground">{new Date(message.receivedAt).toLocaleString()}</p>
      <h2 className="text-[22px] leading-snug font-semibold">{message.subject || '(No subject)'}</h2>
      <p className="text-[13px] text-muted-foreground">
        {message.from || 'unknown'} -&gt; {message.to.join(', ') || 'unknown'}
      </p>
      {message.attachments.length > 0 ? <AttachmentList attachments={message.attachments} messageId={message.id} /> : null}
    </header>
  );
}

function MessageContentTabs({ message }: { message: MessageDetailType }) {
  const selectedBody = useMemo(() => {
    if (message.html) {
      return (
        <iframe
          className="h-full min-h-[420px] w-full border-0"
          title="HTML email preview"
          sandbox=""
          srcDoc={message.html}
        />
      );
    }

    return <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6">{message.text || ''}</pre>;
  }, [message]);

  return (
    <>
      <TabsList variant="line">
        <TabsTrigger value="body">Body</TabsTrigger>
        <TabsTrigger value="headers">Headers</TabsTrigger>
        <TabsTrigger value="raw">Raw</TabsTrigger>
      </TabsList>

      <TabsContent className={tabPanelClass} value="body">
        {selectedBody}
      </TabsContent>
      <TabsContent className={tabPanelClass} value="headers">
        <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6">
          {JSON.stringify(message.headers, null, 2)}
        </pre>
      </TabsContent>
      <TabsContent className={tabPanelClass} value="raw">
        <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6">{message.raw}</pre>
      </TabsContent>
    </>
  );
}

function AttachmentList({ attachments, messageId }: { attachments: MessageAttachment[]; messageId: string }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1" aria-label="Attachments">
      {attachments.map((attachment) => (
        <Badge asChild className="h-auto max-w-[260px] justify-start rounded-lg px-2.5 py-1.5" key={attachment.id} variant="outline">
          <a
            href={`/api/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachment.id)}`}
            title={attachment.filename || 'attachment'}
          >
            <Download data-icon="inline-start" />
            <span className="min-w-0 truncate">{attachment.filename || 'attachment'}</span>
            <span className="text-muted-foreground">{formatBytes(attachment.sizeBytes)}</span>
          </a>
        </Badge>
      ))}
    </div>
  );
}
