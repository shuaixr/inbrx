import { useEffect, useMemo, useState } from "react";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import go from "highlight.js/lib/languages/go";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import typescript from "highlight.js/lib/languages/typescript";
import { Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  fetchConnectionSettings,
  type ConnectionSettings,
} from "@/lib/connection-api";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("go", go);
hljs.registerLanguage("python", python);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("typescript", typescript);

type ConnectDialogProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
};

export function ConnectDialog({ open, onOpenChange }: ConnectDialogProps) {
  const [activeExample, setActiveExample] = useState(
    connectionExampleTemplates[0]?.id ?? "swaks",
  );
  const [settings, setSettings] = useState<ConnectionSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setError(null);

    fetchConnectionSettings()
      .then((nextSettings) => {
        if (!cancelled) {
          setSettings(nextSettings);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load connection settings",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const examples = useMemo(() => connectionExamplesFor(settings), [settings]);
  const selectedExample =
    examples.find((example) => example.id === activeExample) ?? examples[0];

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      role="presentation"
      onMouseDown={() => onOpenChange(false)}
    >
      <section
        aria-modal="true"
        className="flex max-h-[min(760px,calc(100vh-32px))] w-full max-w-[860px] flex-col overflow-hidden rounded-lg border bg-background text-foreground shadow-2xl"
        role="dialog"
        aria-labelledby="connect-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b p-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold" id="connect-dialog-title">
              Connect to local SMTP
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Point your app or script at this SMTP endpoint. Messages sent here
              appear in the inbox.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <X />
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)] max-[760px]:grid-cols-1">
          <aside className="border-r bg-muted/30 p-4 max-[760px]:border-r-0 max-[760px]:border-b">
            <ConnectionSummary
              settings={settings}
              loading={!settings && !error}
              error={error}
            />
            <Separator className="my-4" />
            <nav
              className="flex flex-col gap-1"
              aria-label="Connection examples"
            >
              {examples.map((example) => (
                <button
                  className={[
                    "rounded-md px-3 py-2 text-left text-sm transition-colors",
                    example.id === activeExample
                      ? "bg-background font-medium shadow-sm"
                      : "text-muted-foreground hover:bg-background hover:text-foreground",
                  ].join(" ")}
                  key={example.id}
                  type="button"
                  onClick={() => setActiveExample(example.id)}
                >
                  {example.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="min-h-0 overflow-auto p-5">
            {selectedExample ? (
              <ConnectionExample
                example={selectedExample}
                disabled={!settings}
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function ConnectionSummary({
  settings,
  loading,
  error,
}: {
  settings: ConnectionSettings | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="text-[13px] leading-5 text-destructive">{error}</p>
      ) : null}
      {loading ? (
        <p className="text-[13px] leading-5 text-muted-foreground">
          Loading connection settings...
        </p>
      ) : null}
      <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Host</dt>
        <dd className="font-mono">{settings?.smtpHost ?? "-"}</dd>
        <dt className="text-muted-foreground">Port</dt>
        <dd className="font-mono">{settings?.smtpPort ?? "-"}</dd>
        <dt className="text-muted-foreground">TLS</dt>
        <dd>{settings ? (settings.smtpStartTls ? "STARTTLS" : "Off") : "-"}</dd>
        <dt className="text-muted-foreground">Auth</dt>
        <dd>
          {settings
            ? settings.smtpAuth === "optional"
              ? "Optional"
              : settings.smtpAuth
            : "-"}
        </dd>
      </dl>
    </div>
  );
}

function ConnectionExample({
  example,
  disabled,
}: {
  example: ConnectionExample;
  disabled: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyExample = async () => {
    try {
      await navigator.clipboard.writeText(example.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="flex min-h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{example.label}</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {example.description}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => void copyExample()}
        >
          {copied ? (
            <Check data-icon="inline-start" />
          ) : (
            <Copy data-icon="inline-start" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="min-h-[360px] overflow-auto rounded-lg border bg-muted/35 p-4 font-mono text-[13px] leading-6 whitespace-pre text-foreground">
        <HighlightedCode code={example.code} language={example.language} />
      </pre>
    </section>
  );
}

function HighlightedCode({
  code,
  language,
}: {
  code: string;
  language: CodeLanguage;
}) {
  const highlighted = useMemo(() => {
    if (language === "text") {
      return escapeHtml(code);
    }

    return hljs.highlight(code, { language }).value;
  }, [code, language]);

  return (
    <code
      className="inbrx-code"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

type ConnectionExample = {
  id: string;
  label: string;
  description: string;
  language: CodeLanguage;
  code: string;
};

type ConnectionExampleTemplate = Omit<ConnectionExample, "code"> & {
  code(settings: ConnectionSettings): string;
};

type CodeLanguage = "bash" | "typescript" | "python" | "go" | "ruby" | "text";

const connectionExampleTemplates: ConnectionExampleTemplate[] = [
  {
    id: "swaks",
    label: "Command line",
    description: "Send a quick message with swaks.",
    language: "bash",
    code: ({ smtpHost, smtpPort }) => `swaks --to recipient@example.com \\
  --from sender@example.com \\
  --server ${smtpHost} \\
  --port ${smtpPort} \\
  --header "Subject: Local SMTP test" \\
  --body "Hello from inbrx"`,
  },
  {
    id: "node",
    label: "Node.js",
    description: "Use Nodemailer from a local script or test.",
    language: "typescript",
    code: ({
      smtpHost,
      smtpPort,
      smtpStartTls,
    }) => `import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: '${smtpHost}',
  port: ${smtpPort},
  secure: false,
  ignoreTLS: ${smtpStartTls ? "false" : "true"}
});

await transport.sendMail({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Local SMTP test',
  text: 'Hello from inbrx'
});

transport.close();`,
  },
  {
    id: "python",
    label: "Python",
    description: "Send mail with the standard library.",
    language: "python",
    code: ({ smtpHost, smtpPort }) => `import smtplib
from email.message import EmailMessage

message = EmailMessage()
message["From"] = "sender@example.com"
message["To"] = "recipient@example.com"
message["Subject"] = "Local SMTP test"
message.set_content("Hello from inbrx")

with smtplib.SMTP("${smtpHost}", ${smtpPort}) as smtp:
    smtp.send_message(message)`,
  },
  {
    id: "go",
    label: "Go",
    description: "Use net/smtp against the local endpoint.",
    language: "go",
    code: ({ smtpHost, smtpPort }) => `package main

import "net/smtp"

func main() {
  msg := []byte("To: recipient@example.com\\r\\n" +
    "From: sender@example.com\\r\\n" +
    "Subject: Local SMTP test\\r\\n" +
    "\\r\\n" +
    "Hello from inbrx\\r\\n")

  _ = smtp.SendMail(
    "${smtpHost}:${smtpPort}",
    nil,
    "sender@example.com",
    []string{"recipient@example.com"},
    msg,
  )
}`,
  },
  {
    id: "ruby",
    label: "Ruby",
    description: "Send a message with net/smtp.",
    language: "ruby",
    code: ({ smtpHost, smtpPort }) => `require "net/smtp"

message = <<~MESSAGE
  From: sender@example.com
  To: recipient@example.com
  Subject: Local SMTP test

  Hello from inbrx
MESSAGE

Net::SMTP.start("${smtpHost}", ${smtpPort}) do |smtp|
  smtp.send_message message, "sender@example.com", "recipient@example.com"
end`,
  },
];

function connectionExamplesFor(
  settings: ConnectionSettings | null,
): ConnectionExample[] {
  return connectionExampleTemplates.map(({ code, ...example }) => ({
    ...example,
    language: settings ? example.language : "text",
    code: settings ? code(settings) : "Loading connection settings...",
  }));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
