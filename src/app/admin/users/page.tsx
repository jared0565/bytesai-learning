import type { Metadata } from 'next';
import { Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Users — Admin',
  robots: { index: false, follow: false },
};

async function getDB() {
  return (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined ?? null;
}

interface UserRow {
  id: string;
  email: string;
  role: 'learner' | 'admin';
  email_verified: number;
  created_at: string;
}

export default async function AdminUsersPage() {
  const db = await getDB();
  let users: UserRow[] = [];
  let total = 0;

  if (db) {
    try {
      const [result, countResult] = await Promise.all([
        db.prepare(
          `SELECT id, email, role, email_verified, created_at FROM users ORDER BY created_at DESC LIMIT 200`
        ).all<UserRow>(),
        db.prepare(`SELECT COUNT(*) AS count FROM users`).first<{ count: number }>(),
      ]);
      users = result.results;
      total = countResult?.count ?? 0;
    } catch { /* ignore */ }
  }

  const roleColor: Record<string, string> = {
    admin: 'var(--accent)',
    learner: 'var(--emerald)',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>Users</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{total.toLocaleString()} registered user{total !== 1 ? 's' : ''}.</p>
      </div>

      {users.length === 0 ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <Users size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No users yet.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                {['Email', 'Role', 'Verified', 'Joined', 'ID'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{u.email}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize',
                      color: roleColor[u.role] ?? 'var(--text-muted)',
                      background: `${roleColor[u.role] ?? 'var(--text-muted)'}18`,
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: u.email_verified ? 'var(--emerald)' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.8125rem' }}>
                    {u.email_verified ? 'Yes' : 'No'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {u.id}
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
