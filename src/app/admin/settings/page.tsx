'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Bot, Code2, Plus, Trash2, Save, Loader2, CheckCircle2, ToggleLeft, ToggleRight, Cookie, BarChart2, Target, Shield } from 'lucide-react';

interface TrackingCode {
  id: string;
  name: string;
  placement: 'head' | 'body';
  code: string;
  enabled: boolean;
  category: 'analytics' | 'marketing';
}

export default function AdminSettingsPage() {
  const [chatbotMode, setChatbotMode] = useState<'ai' | 'keyword'>('ai');
  const [trackingCodes, setTrackingCodes] = useState<TrackingCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      const s = data.settings ?? {};
      setChatbotMode(s.chatbot_mode === 'keyword' ? 'keyword' : 'ai');
      try {
        setTrackingCodes(JSON.parse(s.tracking_codes ?? '[]'));
      } catch { setTrackingCodes([]); }
    } catch {
      setError('Could not load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbot_mode: chatbotMode,
          tracking_codes: JSON.stringify(trackingCodes),
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  function addTrackingCode() {
    setTrackingCodes(prev => [...prev, {
      id: `tc-${Date.now()}`,
      name: '',
      placement: 'body',
      code: '',
      enabled: true,
      category: 'analytics',
    }]);
  }

  function updateTrackingCode(id: string, field: keyof TrackingCode, value: string | boolean) {
    setTrackingCodes(prev => prev.map(tc => tc.id === id ? { ...tc, [field]: value } : tc));
  }

  function removeTrackingCode(id: string) {
    setTrackingCodes(prev => prev.filter(tc => tc.id !== id));
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} /> Loading settings...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Settings size={24} /> Site Settings
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Chatbot mode, tracking pixels, and global configuration.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 140, justifyContent: 'center' }}
        >
          {saving ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save all'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {/* ── Chatbot Mode ───────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
          <Bot size={20} color="var(--accent)" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Chatbot Mode</h2>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.65 }}>
          Choose how the chatbot responds to visitor queries. <strong>AI mode</strong> uses the LLM (via OpenRouter) for natural language understanding, spelling correction, and smart routing. <strong>Keyword mode</strong> uses pattern matching only — faster, no API cost, but less intelligent.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setChatbotMode('ai')}
            style={{
              flex: 1, padding: '1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              border: chatbotMode === 'ai' ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: chatbotMode === 'ai' ? 'rgba(79,110,247,0.08)' : 'var(--bg)',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {chatbotMode === 'ai'
                ? <ToggleRight size={22} color="var(--accent)" />
                : <ToggleLeft size={22} color="var(--text-muted)" />
              }
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: chatbotMode === 'ai' ? 'var(--accent)' : 'var(--text-primary)' }}>
                AI Mode
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              LLM-powered replies, spelling correction, smart Alison redirects. Uses OpenRouter API credits.
            </p>
          </button>

          <button
            onClick={() => setChatbotMode('keyword')}
            style={{
              flex: 1, padding: '1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              border: chatbotMode === 'keyword' ? '2px solid var(--amber)' : '1px solid var(--border)',
              background: chatbotMode === 'keyword' ? 'rgba(245,158,11,0.08)' : 'var(--bg)',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {chatbotMode === 'keyword'
                ? <ToggleRight size={22} color="var(--amber)" />
                : <ToggleLeft size={22} color="var(--text-muted)" />
              }
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: chatbotMode === 'keyword' ? 'var(--amber)' : 'var(--text-primary)' }}>
                Keyword Mode
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Pattern-matching only. No API cost, instant responses, but no spelling correction or smart routing.
            </p>
          </button>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          Current mode: <strong style={{ color: chatbotMode === 'ai' ? 'var(--accent)' : 'var(--amber)' }}>{chatbotMode === 'ai' ? 'AI (LLM)' : 'Keyword'}</strong>. Change takes effect immediately after saving.
        </p>
      </div>

      {/* ── Cookie Consent ────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
          <Cookie size={20} color="var(--emerald)" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Cookie Consent</h2>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--emerald)', background: 'rgba(16,185,129,0.1)', padding: '0.2rem 0.6rem', borderRadius: 20 }}>
            Built-in
          </span>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.65 }}>
          BytesAI Learning has a built-in GDPR-compliant cookie consent system — no third parties required.
          A consent banner appears on first visit and lets users choose which categories to allow.
          Preferences are stored in the user&apos;s browser and can be updated via the
          <strong> Cookie Settings</strong> link in the footer.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {/* Necessary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <Shield size={16} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.125rem' }}>Necessary</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Login sessions, security tokens, cookie preference. Always enabled.</p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--emerald)' }}>Always On</span>
          </div>
          {/* Analytics */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(79,110,247,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(79,110,247,0.12)' }}>
            <BarChart2 size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.125rem' }}>Analytics</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Site usage data. User-controlled. Tracking scripts tagged &ldquo;Analytics&rdquo; only load when accepted.</p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>User-controlled</span>
          </div>
          {/* Marketing */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(245,158,11,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <Target size={16} style={{ color: 'var(--amber)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.125rem' }}>Marketing</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Pixels & ad tracking. User-controlled. Tracking scripts tagged &ldquo;Marketing&rdquo; only load when accepted.</p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber)' }}>User-controlled</span>
          </div>
        </div>
      </div>

      {/* ── Tracking Codes ─────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Code2 size={20} color="var(--teal)" />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Tracking Codes</h2>
          </div>
          <button onClick={addTrackingCode} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Plus size={14} /> Add tracking code
          </button>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.65 }}>
          Add Facebook Pixel, Google Ads (gtag), TikTok Pixel, LinkedIn Insight Tag, or any custom snippet.
          Tag each script with its <strong>consent category</strong> — it will only be injected after the visitor
          grants that category in the cookie banner.
        </p>

        {trackingCodes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No tracking codes configured. Click &quot;Add tracking code&quot; to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {trackingCodes.map((tc, idx) => (
              <div
                key={tc.id}
                style={{
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                  padding: '1rem', background: tc.enabled ? 'var(--bg)' : 'var(--bg-card)',
                  opacity: tc.enabled ? 1 : 0.65, transition: 'opacity 0.2s',
                }}
              >
                {/* Row 1: name, placement, enabled, delete */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={tc.name}
                    onChange={e => updateTrackingCode(tc.id, 'name', e.target.value)}
                    placeholder={`Tracking code #${idx + 1} (e.g. Facebook Pixel)`}
                    style={{
                      flex: 1, minWidth: 200, padding: '0.5rem 0.75rem',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                      background: 'var(--bg)', fontSize: '0.875rem', fontWeight: 600,
                    }}
                  />

                  <select
                    value={tc.category ?? 'analytics'}
                    onChange={e => updateTrackingCode(tc.id, 'category', e.target.value)}
                    style={{
                      padding: '0.5rem 0.75rem', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', background: 'var(--bg)',
                      fontSize: '0.8125rem', cursor: 'pointer',
                    }}
                  >
                    <option value="analytics">Analytics</option>
                    <option value="marketing">Marketing</option>
                  </select>

                  <button
                    onClick={() => updateTrackingCode(tc.id, 'enabled', !tc.enabled)}
                    title={tc.enabled ? 'Disable' : 'Enable'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.5rem 0.75rem', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', background: 'var(--bg)',
                      cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
                      color: tc.enabled ? 'var(--emerald)' : 'var(--text-muted)',
                    }}
                  >
                    {tc.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {tc.enabled ? 'On' : 'Off'}
                  </button>

                  <button
                    onClick={() => removeTrackingCode(tc.id)}
                    title="Remove"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 36, height: 36, border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', background: 'var(--bg)',
                      cursor: 'pointer', color: 'var(--rose)',
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Row 2: code textarea */}
                <textarea
                  value={tc.code}
                  onChange={e => updateTrackingCode(tc.id, 'code', e.target.value)}
                  placeholder={'Paste your tracking snippet here, e.g.:\n<script>!function(f,b,e,v,n,t,s){...}("script","https://connect.facebook.net/en_US/fbevents.js");</script>'}
                  rows={5}
                  style={{
                    width: '100%', padding: '0.75rem', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', background: 'var(--bg)',
                    fontSize: '0.8125rem', fontFamily: 'monospace', lineHeight: 1.5,
                    resize: 'vertical',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(79,110,247,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(79,110,247,0.12)' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong>Common tracking codes:</strong> Facebook Pixel, Google Ads (gtag.js), Google Analytics (GA4),
            TikTok Pixel, LinkedIn Insight Tag, X/Twitter Pixel, Microsoft Clarity, Hotjar.
            Paste the full <code>&lt;script&gt;</code> snippet. Scripts are injected client-side
            only after the visitor grants the matching consent category.
          </p>
        </div>
      </div>
    </div>
  );
}
