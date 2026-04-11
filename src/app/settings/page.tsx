'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Download, AlertTriangle, CheckCircle2, Loader2, Shield, User, FileJson, Camera, X } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName]           = useState('');
  const [bio, setBio]                           = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [avatarUrl, setAvatarUrl]               = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview]       = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading]   = useState(false);
  const [avatarError, setAvatarError]           = useState('');

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved]   = useState(false);
  const [profileError, setProfileError]   = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState('');

  const [exporting, setExporting] = useState(false);

  // Load current profile
  useEffect(() => {
    fetch('/api/learner/profile')
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          setDisplayName(d.profile.display_name ?? '');
          setBio(d.profile.bio ?? '');
          setMarketingConsent(d.profile.marketing_consent === 1);
          setAvatarUrl(d.profile.avatar_url ?? null);
        }
      })
      .catch(() => null);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError('');

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setAvatarError('Only JPEG, PNG, WebP, or GIF images are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image must be under 2 MB.');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    uploadAvatar(file);
  }

  async function uploadAvatar(file: File) {
    setAvatarUploading(true);
    setAvatarError('');
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch('/api/learner/avatar', { method: 'POST', body: form });
      const d = await res.json() as { ok?: boolean; avatarUrl?: string; error?: string };
      if (d.ok && d.avatarUrl) {
        setAvatarUrl(d.avatarUrl);
      } else {
        setAvatarError(d.error ?? 'Upload failed. Please try again.');
        setAvatarPreview(null);
      }
    } catch {
      setAvatarError('Network error. Please try again.');
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveAvatar() {
    setAvatarUploading(true);
    setAvatarError('');
    try {
      await fetch('/api/learner/avatar', { method: 'DELETE' });
      setAvatarUrl(null);
      setAvatarPreview(null);
    } catch {
      setAvatarError('Failed to remove avatar.');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSaved(false);
    setProfileError('');
    try {
      const res = await fetch('/api/learner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, bio, marketing_consent: marketingConsent }),
      });
      const d = await res.json();
      if (d.ok) { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 3000); }
      else setProfileError(d.error ?? 'Failed to save. Please try again.');
    } catch { setProfileError('Network error. Please try again.'); }
    finally { setProfileSaving(false); }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/learner/account', { method: 'DELETE' });
      const d = await res.json();
      if (d.ok) { router.push('/?deleted=1'); }
      else setDeleteError(d.error ?? 'Failed to delete account. Please try again.');
    } catch { setDeleteError('Network error. Please try again.'); }
    finally { setDeleting(false); }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/learner/export');
      if (!res.ok) { setExporting(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bytesai-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
    finally { setExporting(false); }
  }

  const currentAvatar = avatarPreview ?? avatarUrl;
  const initials = displayName.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.75rem',
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', fontSize: '0.9375rem',
    color: 'var(--text-primary)', fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100dvh', padding: '2rem 1.25rem' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        <div style={{ marginBottom: '2rem' }}>
          <Link href="/dashboard" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            ← Back to dashboard
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.75rem', marginBottom: '0.25rem' }}>
            Account Settings
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Manage your profile and data.
          </p>
        </div>

        {/* ── Profile ── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16} color="var(--accent)" /> Profile
          </h2>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {currentAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentAvatar}
                  alt="Avatar"
                  style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }}
                />
              ) : (
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), var(--teal))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.25rem', fontWeight: 800, color: 'white',
                  border: '2px solid var(--border)',
                }}>
                  {initials}
                </div>
              )}
              {avatarUploading && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Loader2 size={20} color="white" style={{ animation: 'spin 0.7s linear infinite' }} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <Camera size={14} /> {currentAvatar ? 'Change photo' : 'Upload photo'}
              </button>
              {currentAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={avatarUploading}
                  className="btn btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--rose)', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  <X size={14} /> Remove
                </button>
              )}
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                JPEG, PNG, WebP or GIF · Max 2 MB
              </p>
              {avatarError && <p style={{ fontSize: '0.8rem', color: 'var(--rose)', margin: 0 }}>{avatarError}</p>}
            </div>
          </div>

          <form onSubmit={handleProfileSave}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={100}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                Bio <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                maxLength={500}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', marginBottom: '1.25rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={e => setMarketingConsent(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0, width: 15, height: 15 }}
              />
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Email me weekly AI course recommendations and learning tips. You can unsubscribe at any time.
              </span>
            </label>
            {profileError && <p style={{ fontSize: '0.8125rem', color: 'var(--rose)', marginBottom: '0.75rem' }}>{profileError}</p>}
            <button
              type="submit"
              disabled={profileSaving}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            >
              {profileSaving
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                : profileSaved
                ? <><CheckCircle2 size={14} /> Saved!</>
                : 'Save changes'
              }
            </button>
          </form>
        </div>

        {/* ── Data & Privacy ── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={16} color="var(--accent)" /> Data &amp; Privacy
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Under UK GDPR you have the right to access and download all personal data we hold about you.{' '}
            <Link href="/privacy-policy" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>
          </p>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            {exporting
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Preparing export…</>
              : <><FileJson size={14} /> Download my data (JSON)</>
            }
          </button>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Includes your account info, profile, course progress, and chatbot history.
          </p>
        </div>

        {/* ── Delete account ── */}
        <div style={{ ...cardStyle, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.03)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--rose)' }}>
            <Trash2 size={16} /> Delete account
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Permanently deletes your account, profile, course progress, and chatbot history. This action cannot be undone. Your data will be removed within 30 days in accordance with our{' '}
            <Link href="/privacy-policy" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder='Type DELETE to confirm'
              style={{ ...inputStyle, maxWidth: 240, fontSize: '0.875rem' }}
            />
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deleting}
              className="btn btn-sm"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                background: deleteConfirm === 'DELETE' ? 'var(--rose)' : 'var(--bg-card)',
                color: deleteConfirm === 'DELETE' ? 'white' : 'var(--text-muted)',
                border: '1px solid',
                borderColor: deleteConfirm === 'DELETE' ? 'var(--rose)' : 'var(--border)',
                cursor: deleteConfirm !== 'DELETE' || deleting ? 'not-allowed' : 'pointer',
                opacity: deleteConfirm !== 'DELETE' ? 0.5 : 1,
              }}
            >
              {deleting
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Deleting…</>
                : <><AlertTriangle size={14} /> Delete my account</>
              }
            </button>
          </div>
          {deleteError && <p style={{ fontSize: '0.8125rem', color: 'var(--rose)' }}>{deleteError}</p>}
        </div>

      </div>
    </div>
  );
}
