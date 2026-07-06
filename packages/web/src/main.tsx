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

type MessageDetail = MessageSummary & {
  cc: string[];
  bcc: string[];
  headers: Record<string, string | string[]>;
  text: string | null;
  html: string | null;
  attachments: unknown[];
  raw: string;
};

type ActiveTab = 'body' | 'headers' | 'raw';

function App() {
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageDetail | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('body');

  async function loadMessages() {
    const response = await fetch('/api/messages');
    const data = (await response.json()) as { messages: MessageSummary[] };
    setMessages(data.messages);

    if (!selectedId && data.messages[0]) {
      setSelectedId(data.messages[0].id);
    }

    if (selectedId && !data.messages.some((message) => message.id === selectedId)) {
      setSelectedId(data.messages[0]?.id ?? null);
    }
  }

  async function clearMessages() {
    await fetch('/api/messages', { method: 'DELETE' });
    setSelectedId(null);
    setSelectedMessage(null);
    await loadMessages();
  }

  useEffect(() => {
    void loadMessages();
    const interval = window.setInterval(() => {
      void loadMessages();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [selectedId]);

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
        <button className="danger" type="button" onClick={() => void clearMessages()}>
          Clear
        </button>
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
