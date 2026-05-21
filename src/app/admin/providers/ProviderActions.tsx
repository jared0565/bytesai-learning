'use client';

import { useState, useCallback } from 'react';
import { Plus, Pencil, X, Upload, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';

interface Provider {
  id: string;
  slug: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
  affiliate_enabled: number;
}

interface Props {
  mode: 'create' | 'edit';
  provider?: Provider;
}

type LogoMode = 'url' | 'upload';

export default function ProviderActions({ mode, provider }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [logoMode, setLogoMode] = useState<LogoMode>('url');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    slug: provider?.slug ?? '',
    name: provider?.name ?? '',
    website_url: provider?.website_url ?? '',
    logo_url: provider?.logo_url ?? '',
    affiliate_enabled: provider?.affiliate_enabled ?? 0,
  });

  const updateField = useCallback((field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !provider?.id) return;

    setUploadingLogo(true);
    setError('');

    const formData = new FormData();
    formData.append('logo', file);
    formData.append('providerId', provider.id);

    try {
      const res = await fetch('/api/admin/provider-logo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to upload logo.');
        return;
      }
      updateField('logo_url', data.logoUrl);
      setPreviewUrl(data.logoUrl);
    } catch {
      setError('Network error uploading logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (mode === 'create') {
        const res = await fetch('/api/admin/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to create provider.');
          return;
        }
      } else {
        const res = await fetch(`/api/admin/providers?id=${provider!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            website_url: form.website_url,
            logo_url: form.logo_url,
            affiliate_enabled: form.affiliate_enabled,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to update provider.');
          return;
        }
      }

      window.location.reload();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const currentLogo = previewUrl || form.logo_url;

  return (
    <>
      {mode === 'create' ? (
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={15} /> Add provider
        </button>
      ) : (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setOpen(true)}
          style={{ padding: '0.4rem' }}
          aria-label="Edit provider"
        >
          <Pencil size={15} />
        </button>
      )}

      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }} onClick={() => setOpen(false)}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '1.5rem',
            maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>
                {mode === 'create' ? 'New Provider' : `Edit ${provider?.name}`}
              </h2>
              <button
                onClick={() => setOpen(false)}
                style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{
                padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {mode === 'create' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
                    Slug
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={e => updateField('slug', e.target.value)}
                    placeholder="e.g. google, microsoft"
                    required
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                      background: 'var(--bg)', color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    URL-friendly identifier. Cannot be changed later.
                  </p>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="Provider name"
                  required
                  style={{
                    width: '100%', padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
                  Website URL
                </label>
                <input
                  type="url"
                  value={form.website_url}
                  onChange={e => updateField('website_url', e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: '100%', padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                  Logo
                </label>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setLogoMode('url')}
                    style={{
                      flex: 1, padding: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: logoMode === 'url' ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: logoMode === 'url' ? 'var(--accent-soft)' : 'var(--bg)',
                      color: logoMode === 'url' ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '0.8125rem', fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                    }}
                  >
                    <LinkIcon size={14} /> URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoMode('upload')}
                    style={{
                      flex: 1, padding: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: logoMode === 'upload' ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: logoMode === 'upload' ? 'var(--accent-soft)' : 'var(--bg)',
                      color: logoMode === 'upload' ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '0.8125rem', fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                    }}
                  >
                    <Upload size={14} /> Upload
                  </button>
                </div>

                {logoMode === 'url' ? (
                  <input
                    type="url"
                    value={form.logo_url}
                    onChange={e => updateField('logo_url', e.target.value)}
                    placeholder="https://..."
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                      background: 'var(--bg)', color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                ) : (
                  <div>
                    <label
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '0.5rem', padding: '1rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '2px dashed var(--border)',
                        background: 'var(--bg)',
                        cursor: 'pointer',
                        color: uploadingLogo ? 'var(--text-muted)' : 'var(--text-secondary)',
                        fontSize: '0.875rem', fontWeight: 600,
                      }}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleFileChange}
                        disabled={uploadingLogo || !provider?.id}
                        style={{ display: 'none' }}
                      />
                      {uploadingLogo ? 'Uploading...' : (
                        <>
                          <ImageIcon size={18} /> Choose file (PNG, JPG, WebP, SVG)
                        </>
                      )}
                    </label>
                    {mode === 'create' && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Create the provider first, then edit to upload a logo.
                      </p>
                    )}
                  </div>
                )}

                {currentLogo && (
                  <div style={{
                    marginTop: '0.75rem', padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                  }}>
                    <img
                      src={currentLogo}
                      alt="Logo preview"
                      style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8, background: 'white' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentLogo}
                      </p>
                      <button
                        type="button"
                        onClick={() => { updateField('logo_url', ''); setPreviewUrl(null); }}
                        style={{
                          fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        }}
                      >
                        Remove logo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {mode === 'edit' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id={`affiliate-${provider?.id}`}
                    checked={form.affiliate_enabled === 1}
                    onChange={e => updateField('affiliate_enabled', e.target.checked ? 1 : 0)}
                  />
                  <label htmlFor={`affiliate-${provider?.id}`} style={{ fontSize: '0.875rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Affiliate partner
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
