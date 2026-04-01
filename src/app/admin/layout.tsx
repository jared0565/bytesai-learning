import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import {
  LayoutDashboard, BookOpen, Users, BarChart2, Sparkles, FileText, MessageSquare, Download, Rss,
} from 'lucide-react';

const NAV = [
  { href: '/admin', icon: <LayoutDashboard size={18} />, label: 'Overview' },
  { href: '/admin/courses', icon: <BookOpen size={18} />, label: 'Courses' },
  { href: '/admin/alison-import', icon: <Download size={18} />, label: 'Alison Importer' },
  { href: '/admin/featured', icon: <Sparkles size={18} />, label: 'Featured Slots' },
  { href: '/admin/curated', icon: <FileText size={18} />, label: 'Curated Pages' },
  { href: '/admin/trend-engine', icon: <Rss size={18} />, label: 'Trend Engine' },
  { href: '/admin/analytics', icon: <BarChart2 size={18} />, label: 'Analytics' },
  { href: '/admin/users', icon: <Users size={18} />, label: 'Users' },
  { href: '/admin/chatbot-rules', icon: <MessageSquare size={18} />, label: 'Chatbot Conversations' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session || session.role !== 'admin') redirect('/auth/login');

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0, background: '#0a0e1a', borderRight: '1px solid #1f2937',
        display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100dvh', overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid #1f2937' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontWeight: 800, fontSize: '1rem', textDecoration: 'none' }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #4f6ef7, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={17} color="white" strokeWidth={2.5} />
            </span>
            BytesAI Admin
          </Link>
          <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.7rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Admin Panel · {session.email}
          </span>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {NAV.map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem',
              borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af',
              transition: 'background 0.18s, color 0.18s', textDecoration: 'none',
            }}>
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid #1f2937' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem', borderRadius: 8, fontSize: '0.8125rem', color: '#6b7280', textDecoration: 'none' }}>
            ← Back to site
          </Link>
          <form action="/api/auth/logout" method="POST" style={{ marginTop: '0.25rem' }}>
            <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem', borderRadius: 8, fontSize: '0.8125rem', color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
