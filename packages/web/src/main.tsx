import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type MessageSummary = {
  id: string;
  receivedAt: string;
  from: string | null;
  to: string[];
  subject: string | null;
  rawSizeBytes: number;
};

type MessageAttachment = {
  id: string;
  filename: string | null;
  contentType: string;
  sizeBytes: number;
};

type MessageDetail = MessageSummary & {
  cc: string[];
  bcc: string[];
  headers: Record<string, string | string[]>;
  text: string | null;
  html: string | null;
  attachments: MessageAttachment[];
  raw: string;
};

type ActiveTab = 'body' | 'headers' | 'raw';

function App() {
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageDetail | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('body');
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchMessages() {
    const response = await fetch('/api/messages');
    if (!response.ok) {
      throw new Error(`Failed to load messages (${response.status})`);
    }

    const data = (await response.json()) as { messages: MessageSummary[] };
    return data.messages;
  }

  async function loadMessages({ autoSelect = true }: { autoSelect?: boolean } = {}) {
    const nextMessages = await fetchMessages();
    setError(null);
    setMessages(nextMessages);

    setSelectedId((currentId) => {
      if (currentId && nextMessages.some((message) => message.id === currentId)) {
        return currentId;
      }

      if (autoSelect) {
        return nextMessages[0]?.id ?? null;
      }

      return null;
    });
  }

  async function clearMessages() {
    if (isClearing) {
      return;
    }

    setIsClearing(true);
    setError(null);

    try {
      const response = await fetch('/api/messages', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`Failed to clear messages (${response.status})`);
      }

      setSelectedId(null);
      setSelectedMessage(null);
      await loadMessages({ autoSelect: false });
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Failed to clear messages');
    } finally {
      setIsClearing(false);
    }
  }

  useEffect(() => {
    void loadMessages().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load messages');
    });
    const interval = window.setInterval(() => {
      void loadMessages().catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load messages');
      });
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedMessage(null);
      return;
    }

    let cancelled = false;
    fetch(`/api/messages/${encodeURIComponent(selectedId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { message: MessageDetail } | null) => {
        if (!cancelled) {
          setSelectedMessage(data?.message ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedMessage(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectedBody = useMemo(() => {
    if (!selectedMessage) {
      return null;
    }

    if (selectedMessage.html) {
      return <iframe title="HTML email preview" sandbox="" srcDoc={selectedMessage.html} />;
    }

    return <pre>{selectedMessage.text || ''}</pre>;
  }, [selectedMessage]);

  return (
    <main className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>inbrx</h1>
          <button type="button" onClick={() => void loadMessages()}>
            Refresh
          </button>
        </div>
        <button className="danger" type="button" disabled={isClearing} onClick={() => void clearMessages()}>
          {isClearing ? 'Clearing...' : 'Clear'}
        </button>
        {error ? <p className="error">{error}</p> : null}
        <div className="message-list">
          {messages.length === 0 ? (
            <p className="hint">No captured messages yet.</p>
          ) : (
            messages.map((message) => (
              <button
                className={message.id === selectedId ? 'message-item active' : 'message-item'}
                key={message.id}
                type="button"
                onClick={() => setSelectedId(message.id)}
              >
                <strong>{message.subject || '(No subject)'}</strong>
                <span>
                  {message.from || 'unknown'} -&gt; {message.to.join(', ') || 'unknown'}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="detail">
        {!selectedMessage ? (
          <div className="empty-state">
            <h2>No message selected</h2>
            <p>Send an email to the local SMTP server and select it here.</p>
          </div>
        ) : (
          <article className="message-detail">
            <header>
              <p className="meta">{new Date(selectedMessage.receivedAt).toLocaleString()}</p>
              <h2>{selectedMessage.subject || '(No subject)'}</h2>
              <p className="meta">
                {selectedMessage.from || 'unknown'} -&gt; {selectedMessage.to.join(', ') || 'unknown'}
              </p>
              {selectedMessage.attachments.length > 0 ? (
                <div className="attachments" aria-label="Attachments">
                  {selectedMessage.attachments.map((attachment) => (
                    <a
                      className="attachment-link"
                      href={`/api/messages/${encodeURIComponent(selectedMessage.id)}/attachments/${encodeURIComponent(
                        attachment.id
                      )}`}
                      key={attachment.id}
                    >
                      <span>{attachment.filename || 'attachment'}</span>
                      <small>
                        {attachment.contentType} · {formatBytes(attachment.sizeBytes)}
                      </small>
                    </a>
                  ))}
                </div>
              ) : null}
            </header>

            <nav className="tabs">
              {(['body', 'headers', 'raw'] as const).map((tab) => (
                <button
                  className={activeTab === tab ? 'tab active' : 'tab'}
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                >
                  {tab[0].toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>

            <section className={activeTab === 'body' ? 'tab-panel' : 'tab-panel hidden'}>{selectedBody}</section>
            <section className={activeTab === 'headers' ? 'tab-panel' : 'tab-panel hidden'}>
              <pre>{JSON.stringify(selectedMessage.headers, null, 2)}</pre>
            </section>
            <section className={activeTab === 'raw' ? 'tab-panel' : 'tab-panel hidden'}>
              <pre>{selectedMessage.raw}</pre>
            </section>
          </article>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
