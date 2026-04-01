'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  initialDisplayName: string;
  initialBio: string;
  initialLearningGoal: string;
  initialPreferredFormat: string;
  initialDarkMode: boolean;
  email: string;
  role: string;
  memberSince: string;
}

const FORMATS = [
  { value: '', label: '— no preference —' },
  { value: 'video', label: 'Video' },
  { value: 'article', label: 'Articles & Reading' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'interactive', label: 'Interactive' },
];

export default function ProfileForm({
  initialDisplayName, initialBio, initialLearningGoal,
  initialPreferredFormat, initialDarkMode,
  email, role, memberSince,
}: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [learningGoal, setLearningGoal] = useState(initialLearningGoal);
  const [preferredFormat, setPreferredFormat] = useState(initialPreferredFormat);
  const [darkMode, setDarkMode] = useState(initialDarkMode);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch('/api/learner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          bio: bio.trim(),
          learning_goal: learningGoal.trim(),
          preferred_format: preferredFormat || null,
          dark_mode: darkMode,
        }),
      });
      const data: { ok?: boolean; error?: string } = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save.');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Personal information */}
      <section className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Personal Information
        </h2>

        <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: '1fr 1fr' }}>
          <div className="form-group">
            <label className="label">Display Name</label>
            <input
              type="text"
              className="input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Email Address</label>
            <input type="email" className="input" value={email} readOnly disabled style={{ background: 'var(--bg)', cursor: 'not-allowed' }} />
          </div>

          <div className="form-group">
            <label className="label">Role</label>
            <input type="text" className="input" value={role} readOnly disabled style={{ textTransform: 'capitalize', background: 'var(--bg)', cursor: 'not-allowed' }} />
          </div>

          <div className="form-group">
            <label className="label">Member Since</label>
            <input type="text" className="input" value={memberSince} readOnly disabled style={{ background: 'var(--bg)', cursor: 'not-allowed' }} />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Bio <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              className="input"
              rows={3}
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={500}
              placeholder="A short bio visible on your profile"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
      </section>

      {/* Learning preferences */}
      <section className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Learning Preferences</h2>

        <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: '1fr 1fr' }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Learning Goal <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input
              type="text"
              className="input"
              value={learningGoal}
              onChange={e => setLearningGoal(e.target.value)}
              maxLength={300}
              placeholder="e.g. Build AI-powered products, transition to ML engineer"
            />
          </div>

          <div className="form-group">
            <label className="label">Preferred Format</label>
            <select className="input" value={preferredFormat} onChange={e => setPreferredFormat(e.target.value)}>
              {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Dark Mode</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>Save your theme preference</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={darkMode}
              onClick={() => setDarkMode(d => !d)}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: darkMode ? 'var(--accent)' : 'var(--border)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <span style={{
                display: 'block', width: 20, height: 20, background: 'white', borderRadius: 10,
                position: 'absolute', top: 2,
                left: darkMode ? 22 : 2,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        </div>
      </section>

      {/* Save */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: '#991b1b' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving
            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
            : 'Save changes'}
        </button>
        {saved && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--emerald)', fontWeight: 600 }}>
            <CheckCircle2 size={16} /> Saved
          </span>
        )}
      </div>
    </form>
  );
}
