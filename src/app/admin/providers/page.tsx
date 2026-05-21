import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, ExternalLink, Pencil, Plus } from 'lucide-react';
import ProviderLogo from '@/components/ui/ProviderLogo';
import ProviderActions from './ProviderActions';

export const metadata: Metadata = {
  title: 'Providers — Admin',
  robots: { index: false, follow: false },
};

interface ProviderRow {
  id: string;
  slug: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
  affiliate_enabled: number;
  course_count: number;
}

async function getProviders(): Promise<ProviderRow[]> {
  try {
    const res = await fetch('https://learn.bytesai.uk/api/admin/providers', {
      cache: 'no-store',
      headers: { cookie: '' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.providers ?? [];
  } catch {
    return [];
  }
}

export default async function AdminProvidersPage() {
  const providers = await getProviders();

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>Providers</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {providers.length} provider{providers.length !== 1 ? 's' : ''}.
          </p>
        </div>

        <ProviderActions mode="create" />
      </div>

      {providers.length === 0 ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <Building2 size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No providers found.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Logo</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Slug</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Website</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Courses</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}></th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p, i) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: i < providers.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <ProviderLogo slug={p.slug} name={p.name} size={44} />
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</p>
                    {p.affiliate_enabled === 1 && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: 'var(--amber)' }}>Affiliate</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {p.slug}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {p.website_url ? (
                      <a
                        href={p.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent)', fontSize: '0.8125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        Visit <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                    <Link href={`/courses?provider=${p.id}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      {p.course_count} {p.course_count === 1 ? 'course' : 'courses'}
                    </Link>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <ProviderActions
                      mode="edit"
                      provider={p}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
