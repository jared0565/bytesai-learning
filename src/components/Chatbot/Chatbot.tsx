'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, ChevronLeft, Send, Loader2, BookOpen, Sparkles, ExternalLink, Search } from 'lucide-react';
import { nanoid } from 'nanoid';

const ALISON_AFFILIATE_ID = '27668723';

function buildAlisonSearchUrl(query: string) {
  return `https://alison.com/courses?query=${encodeURIComponent(query)}&utm_source=alison_user&utm_medium=affiliate&utm_campaign=${ALISON_AFFILIATE_ID}`;
}

interface AiCourse {
  title: string;
  slug: string;
  provider?: string;
  snippet?: string;
  is_affiliate: boolean;
  is_alison: boolean;
  affiliate_url?: string;
}

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  // Internal BytesAI catalog results
  courses?: AiCourse[];
  // Alison direct search link
  alisonSearchUrl?: string;
  alisonQuery?: string;
}

const AI_CHIPS = [
  '🚀 Best beginner AI courses',
  '🎓 Free courses with certificates',
  '🤖 AI agent development',
  '✍️ Prompt engineering',
  '💼 Generative AI for business',
  '🌐 Other Non-AI Courses',
];

const NUDGE_MESSAGES = [
  { emoji: '🎓', text: "Looking for free courses? I can find them in seconds!" },
  { emoji: '🤖', text: "Need a learning plan? I'm your free course navigator." },
  { emoji: '✨', text: "Over 100 free AI courses + Alison's full catalog — ask me anything!" },
];

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'bot',
  text: "👋 Hi! I'm your free course navigator. I can find the best free AI courses from our catalog, or search Alison's full library for any topic. What would you like to learn?",
};

const SESSION_KEY = 'bytesai_chat_session';

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [nudge, setNudge] = useState<null | { emoji: string; text: string }>(null);
  const [nudgeIndex, setNudgeIndex] = useState(0);
  const [nudgeTyped, setNudgeTyped] = useState('');

  // Alison (non-AI) mode state
  const [alisonMode, setAlisonMode] = useState(false);
  // true = waiting for user to type their query after clicking the chip
  const [alisonAwaitingQuery, setAlisonAwaitingQuery] = useState(false);

  const [sessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) return stored;
      const id = nanoid();
      sessionStorage.setItem(SESSION_KEY, id);
      return id;
    }
    return nanoid();
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nudge after 3s if not yet opened, then cycle messages
  useEffect(() => {
    nudgeTimer.current = setTimeout(() => {
      if (!hasOpened) {
        setNudge(NUDGE_MESSAGES[0]);
        setNudgeIndex(0);
        setNudgeTyped('');
      }
    }, 3000);
    return () => { if (nudgeTimer.current) clearTimeout(nudgeTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Typewriter effect for nudge text
  useEffect(() => {
    if (!nudge || open) return;
    const fullText = nudge.text;
    if (nudgeTyped.length >= fullText.length) return;
    const t = setTimeout(() => {
      setNudgeTyped(fullText.slice(0, nudgeTyped.length + 1));
    }, 30);
    return () => clearTimeout(t);
  }, [nudge, nudgeTyped, open]);

  // Cycle to next nudge message every 6s after typewriter finishes
  useEffect(() => {
    if (!nudge || open || hasOpened) return;
    if (nudgeTyped.length < nudge.text.length) return;
    const t = setTimeout(() => {
      const next = (nudgeIndex + 1) % NUDGE_MESSAGES.length;
      setNudgeIndex(next);
      setNudge(NUDGE_MESSAGES[next]);
      setNudgeTyped('');
    }, 5000);
    return () => clearTimeout(t);
  }, [nudge, nudgeTyped, nudgeIndex, open, hasOpened]);

  // Re-nudge when bot replies while closed
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === 'bot' && last.id !== 'welcome' && !open) {
      const t = setTimeout(() => {
        setNudge({ emoji: '💡', text: "I found some courses — tap to see them!" });
      }, 8000);
      return () => clearTimeout(t);
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setNudge(null);
      setHasOpened(true);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Broadcast unread count to BottomNav via custom event
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('bytesai:unread', { detail: unread }));
  }, [unread]);

  // Listen for BottomNav chat button trigger
  useEffect(() => {
    function handleOpenChat() {
      setOpen(true);
      setNudge(null);
    }
    window.addEventListener('bytesai:openchat', handleOpenChat);
    return () => window.removeEventListener('bytesai:openchat', handleOpenChat);
  }, []);

  // visualViewport API: keep chat panel above software keyboard on mobile.
  // When the virtual keyboard appears, window.visualViewport.height shrinks
  // to the visible area. We update the panel height inline so the input
  // row always stays above the keyboard — exactly like Telegram/WhatsApp.
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    function updatePanelForKeyboard() {
      const panel = panelRef.current;
      if (!panel) return;
      // Only apply the dynamic height on mobile widths
      if (window.innerWidth > 768) {
        panel.style.height = '';
        panel.style.top = '';
        return;
      }
      // Only apply offsetTop when keyboard is actually visible (height shrank by >100px).
      // Without this check, vv.offsetTop in some browsers/previews is non-zero even with
      // no keyboard, which pushes the fullscreen panel down incorrectly.
      const keyboardVisible = vv!.height < window.innerHeight - 100;
      if (keyboardVisible) {
        panel.style.height = `${vv!.height}px`;
        panel.style.top = `${vv!.offsetTop}px`;
      } else {
        panel.style.height = '';
        panel.style.top = '';
      }
    }

    vv.addEventListener('resize', updatePanelForKeyboard);
    vv.addEventListener('scroll', updatePanelForKeyboard);
    updatePanelForKeyboard(); // run immediately

    return () => {
      vv.removeEventListener('resize', updatePanelForKeyboard);
      vv.removeEventListener('scroll', updatePanelForKeyboard);
      const panel = panelRef.current;
      if (panel) { panel.style.height = ''; panel.style.top = ''; }
    };
  }, [open]);

  // ─── Handle "Other Non-AI Courses" chip ──────────────────────────────────
  function handleAlisonChip() {
    const askMsg: Message = {
      id: `b-${Date.now()}`,
      role: 'bot',
      text: "🔍 Sure! Alison has thousands of free courses on almost any subject. What course or topic are you looking for? (e.g. photography, accounting, project management…)",
    };
    setMessages(prev => [...prev, askMsg]);
    setAlisonMode(true);
    setAlisonAwaitingQuery(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  // ─── Build Alison affiliate search link directly ─────────────────────────
  function sendAlisonSearch(query: string) {
    setAlisonAwaitingQuery(false);
    setAlisonMode(false);

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: query };
    const botMsg: Message = {
      id: `b-${Date.now()}`,
      role: 'bot',
      text: `Here are the Alison courses for "${query}" — all free to learn, with optional paid certificates! 🎓`,
      alisonSearchUrl: buildAlisonSearchUrl(query),
      alisonQuery: query,
    };
    setMessages(prev => [...prev, userMsg, botMsg]);
    setInput('');
    if (!open) setUnread(n => n + 1);
  }

  // ─── Send to main AI chatbot API ─────────────────────────────────────────
  async function sendAiMessage(text: string) {
    setLoading(true);
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId,
          history: messages.slice(-6).map(m => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json() as {
        reply?: string;
        courses?: AiCourse[];
        error?: string;
        alisonRedirect?: string;
      };

      const botMsg: Message = {
        id: `b-${Date.now()}`,
        role: 'bot',
        text: data.reply ?? data.error ?? 'Sorry, something went wrong.',
        courses: data.courses,
        // If API flagged this as a non-AI topic, show Alison search link
        ...(data.alisonRedirect ? {
          alisonSearchUrl: buildAlisonSearchUrl(data.alisonRedirect),
          alisonQuery: data.alisonRedirect,
        } : {}),
      };
      setMessages(prev => [...prev, botMsg]);
      if (!open) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [...prev, {
        id: `b-${Date.now()}`, role: 'bot',
        text: 'Network error. Please check your connection.',
      }]);
    } finally {
      setLoading(false);
    }
  }

  // ─── Main send dispatcher ─────────────────────────────────────────────────
  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (alisonAwaitingQuery || alisonMode) {
      sendAlisonSearch(trimmed);
    } else {
      sendAiMessage(trimmed);
    }
  }

  function handleChip(chip: string) {
    if (chip === '🌐 Other Non-AI Courses') {
      handleAlisonChip();
    } else {
      sendMessage(chip);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  const showPulse = !hasOpened;

  return (
    <>
      {/* Nudge tooltip */}
      {nudge && !open && (
        <div className="chatbot-nudge" role="status" key={nudgeIndex}>
          <button className="chatbot-nudge-close" onClick={() => setNudge(null)} aria-label="Dismiss">×</button>
          <span style={{ marginRight: '0.25rem' }}>{nudge.emoji}</span>{' '}
          {nudgeTyped}
          <span className="nudge-cursor" />
          <div className="chatbot-nudge-arrow" />
        </div>
      )}

      {/* Launcher */}
      <button
        className={`chatbot-launcher${showPulse ? ' pulse' : ''}`}
        onClick={() => { setOpen(o => !o); setNudge(null); }}
        aria-label={open ? 'Close course navigator' : 'Open course navigator'}
        id="chatbot-launcher-btn"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, width: 20, height: 20,
            borderRadius: '50%', background: 'var(--rose)', color: 'white',
            fontSize: '0.6875rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(244,63,94,0.5)',
          }}>{unread}</span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="chatbot-panel" ref={panelRef} role="dialog" aria-label="Course Navigator" aria-modal="true">

          {/* Header */}
          <div className="chatbot-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <BookOpen size={18} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  Course Navigator <Sparkles size={12} style={{ opacity: 0.8 }} />
                </p>
                <p style={{ fontSize: '0.75rem', opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span className="chatbot-online-dot" />
                  {alisonMode ? 'Searching Alison catalog…' : 'Free AI courses + Alison library'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="chatbot-close-btn"
              aria-label="Close chat"
            >
              {/* Back chevron on mobile (fullscreen), X on desktop (panel) */}
              <span className="chatbot-close-icon-back"><ChevronLeft size={22} /></span>
              <span className="chatbot-close-icon-x"><X size={16} /></span>
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages" role="log" aria-live="polite">
            {messages.map(msg => (
              <div key={msg.id} style={{ width: '100%' }}>

                {/* Text bubble */}
                {msg.text && (
                  <div className={`chatbot-msg chatbot-msg-${msg.role}`}>
                    {msg.text}
                  </div>
                )}

                {/* Course cards — Alison courses link directly to affiliate URL, others go to internal detail page */}
                {msg.courses && msg.courses.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: msg.text ? '0.5rem' : 0, maxWidth: '88%' }}>
                    {msg.courses.map(c => {
                      const isAlison = c.is_alison;
                      const href = isAlison && c.affiliate_url
                        ? c.affiliate_url
                        : isAlison
                          ? `https://alison.com/course/${c.slug}?utm_source=alison_user&utm_medium=affiliate&utm_campaign=${ALISON_AFFILIATE_ID}`
                          : `/courses/${c.slug}`;
                      return (
                        <a
                          key={c.slug}
                          href={href}
                          target={isAlison ? '_blank' : undefined}
                          rel={isAlison ? 'noopener noreferrer' : undefined}
                          style={{
                            display: 'block', padding: '0.75rem 0.875rem',
                            background: 'var(--bg-card)',
                            border: `1px solid ${isAlison ? 'rgba(245,158,11,0.35)' : c.is_affiliate ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                            borderRadius: 12, textDecoration: 'none', color: 'var(--text-primary)',
                          }}
                        >
                          <p style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.125rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {c.title}
                            {isAlison && <span className="chatbot-badge chatbot-badge-alison">Alison</span>}
                            {!isAlison && c.is_affiliate && <span className="chatbot-badge chatbot-badge-affiliate">Certificate</span>}
                            {isAlison && <ExternalLink size={11} style={{ opacity: 0.5 }} />}
                          </p>
                          {c.provider && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{c.provider}</p>}
                          {c.snippet && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {c.snippet}
                            </p>
                          )}
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* Alison direct search button */}
                {msg.alisonSearchUrl && (
                  <div className="chatbot-alison-results" style={{ marginTop: '0.625rem' }}>
                    <div className="chatbot-alison-header">
                      🏛 Alison · free to learn, optional certificate
                    </div>
                    <a
                      href={msg.alisonSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chatbot-alison-search-btn"
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        <Search size={16} style={{ flexShrink: 0 }} />
                        <span>
                          <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700 }}>
                            Browse "{msg.alisonQuery}" courses on Alison
                          </span>
                          <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.8, marginTop: '0.15rem' }}>
                            Results pre-filtered · opens alison.com
                          </span>
                        </span>
                      </span>
                      <ExternalLink size={14} style={{ flexShrink: 0 }} />
                    </a>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0.25rem 0.125rem 0', lineHeight: 1.5 }}>
                      Affiliate link — free to learn, optional paid certificate. Type another topic to search again.
                    </p>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="chatbot-msg chatbot-msg-bot" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                <span>{alisonMode ? 'Searching Alison catalog…' : 'Searching courses…'}</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick chips — initial state only */}
          {messages.length <= 2 && !alisonMode && (
            <div className="chatbot-chips">
              {AI_CHIPS.map(chip => (
                <button
                  key={chip}
                  className={`chatbot-chip${chip === '🌐 Other Non-AI Courses' ? ' chatbot-chip-alison' : ''}`}
                  onClick={() => handleChip(chip)}
                  disabled={loading}
                  style={chip === '🌐 Other Non-AI Courses' ? {
                    borderColor: 'rgba(245,158,11,0.5)',
                    color: 'var(--amber)',
                  } : undefined}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="chatbot-input-row">
            <input
              ref={inputRef}
              className="chatbot-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={
                alisonAwaitingQuery
                  ? 'e.g. photography, accounting, Excel…'
                  : alisonMode
                    ? 'Search another topic on Alison…'
                    : 'What do you want to learn?'
              }
              maxLength={500}
              disabled={loading}
              aria-label="Chat message input"
              id="chatbot-message-input"
            />
            <button
              className="chatbot-send"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              aria-label="Send"
              id="chatbot-send-btn"
            >
              {loading
                ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
                : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
