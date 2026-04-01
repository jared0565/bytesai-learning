'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, User, Bot, ChevronRight, ChevronLeft, AlertTriangle, RefreshCw } from 'lucide-react';

interface ChatSession {
  id: string;
  user_id: string | null;
  started_at: string;
  last_message_at: string;
  message_count: number;
  user_email?: string | null;
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'bot';
  content: string;
  courses_json: string | null;
  off_topic: number;
  occurred_at: string;
}

export default function ChatbotConversationsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const loadSessions = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/chatbot?page=${p}`);
      const data: { sessions: ChatSession[]; total: number } = await res.json();
      setSessions(data.sessions ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(page); }, [page, loadSessions]);

  async function loadMessages(sessionId: string) {
    setSelectedSession(sessionId);
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/admin/chatbot?sessionId=${sessionId}`);
      const data: { messages: ChatMessage[] } = await res.json();
      setMessages(data.messages ?? []);
    } finally {
      setLoadingMsgs(false);
    }
  }

  const totalPages = Math.ceil(total / 30);
  const offTopicCount = sessions.filter(s => {
    // We don't have per-session off-topic flag but we can approximate from message_count
    return false;
  }).length;
  void offTopicCount;

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>Chatbot Conversations</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            All user conversations with the course navigator. {total} session{total === 1 ? '' : 's'} total.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => loadSessions(page)} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedSession ? '1fr 1.3fr' : '1fr', gap: '1.5rem' }}>

        {/* Sessions list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={16} /> Sessions
          </div>

          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</p>
          ) : sessions.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No conversations yet. They appear here once users chat.
            </p>
          ) : (
            <>
              <div style={{ overflowY: 'auto', maxHeight: 520 }}>
                {sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => loadMessages(s.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      width: '100%', padding: '0.875rem 1.25rem',
                      background: selectedSession === s.id ? 'var(--accent-soft)' : 'transparent',
                      border: 'none', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: s.user_id ? 'var(--accent-soft)' : 'var(--bg)',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <User size={15} color={s.user_id ? 'var(--accent)' : 'var(--text-muted)'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                        {s.user_email ?? 'Anonymous visitor'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                        {s.message_count} msg{s.message_count === 1 ? '' : 's'} · {new Date(s.last_message_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <span>Page {page} of {totalPages}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Message thread */}
        {selectedSession && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={16} /> Conversation
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, fontFamily: 'monospace' }}>
                {selectedSession.slice(0, 12)}…
              </span>
            </div>

            {loadingMsgs ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading messages…</p>
            ) : (
              <div style={{ overflowY: 'auto', maxHeight: 560, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {messages.map(m => (
                  <div key={m.id} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: m.role === 'user' ? 'var(--accent-soft)' : 'var(--bg)',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {m.role === 'user'
                        ? <User size={13} color="var(--accent)" />
                        : <Bot size={13} color="var(--text-muted)" />}
                    </div>
                    <div style={{ maxWidth: '80%' }}>
                      <div style={{
                        padding: '0.625rem 0.875rem', borderRadius: 12, fontSize: '0.8125rem', lineHeight: 1.5,
                        background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-input)',
                        color: m.role === 'user' ? 'white' : 'var(--text-primary)',
                        borderBottomRightRadius: m.role === 'user' ? 3 : 12,
                        borderBottomLeftRadius: m.role === 'bot' ? 3 : 12,
                      }}>
                        {m.off_topic === 1 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--amber)', fontWeight: 700, marginBottom: '0.25rem' }}>
                            <AlertTriangle size={10} /> Off-topic
                          </span>
                        )}
                        {m.content}
                      </div>
                      {m.courses_json && (
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Courses shown: {(JSON.parse(m.courses_json) as string[]).join(', ')}
                        </p>
                      )}
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.125rem', textAlign: m.role === 'user' ? 'right' : 'left' }}>
                        {new Date(m.occurred_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
