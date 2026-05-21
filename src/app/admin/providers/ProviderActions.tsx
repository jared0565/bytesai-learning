'use client';

import { useState, useCallback } from 'react';
import { Plus, Pencil, X } from 'lucide-react';

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

export default function ProviderActions({ mode, provider }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
            maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto',
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
                <>
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
                </>
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
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
                  Logo URL
                </label>
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
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Direct link to a PNG or SVG logo. If blank, a branded initial will display.
                </p>
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
