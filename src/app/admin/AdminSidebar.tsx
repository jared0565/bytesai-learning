'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, BookOpen, Users, BarChart2, Sparkles, FileText,
  MessageSquare, Download, Rss, ChevronLeft, ChevronRight, Settings, ThumbsUp,
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
  { href: '/admin/feedback', icon: <ThumbsUp size={18} />, label: 'Feedback' },
  { href: '/admin/settings', icon: <Settings size={18} />, label: 'Settings' },
];

interface Props {
  email: string;
}

export default function AdminSidebar({ email }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const w = collapsed ? 64 : 240;

  return (
    <aside style={{
      width: w, flexShrink: 0, background: '#0a0e1a', borderRight: '1px solid #1f2937',
      display: 'flex', flexDirection: 'column', position: 'sticky', top: 0,
      height: '100dvh', overflowY: 'auto', overflowX: 'hidden',
      transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
    }}>
      {/* Logo + collapse toggle */}
      <div style={{
        padding: collapsed ? '1.25rem 0' : '1.25rem',
        borderBottom: '1px solid #1f2937',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: '0.5rem', flexShrink: 0,
      }}>
        {!collapsed && (
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontWeight: 800, fontSize: '1rem', textDecoration: 'none', minWidth: 0 }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #4f6ef7, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={17} color="white" strokeWidth={2.5} />
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>BytesAI Admin</span>
          </Link>
        )}

        {collapsed && (
          <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #4f6ef7, #0ea5e9)', flexShrink: 0 }}>
            <BookOpen size={17} color="white" strokeWidth={2.5} />
          </Link>
        )}

        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: 26, height: 26, borderRadius: 6, border: '1px solid #1f2937',
            background: '#111827', color: '#6b7280', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'white'; (e.currentTarget as HTMLButtonElement).style.background = '#1f2937'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; (e.currentTarget as HTMLButtonElement).style.background = '#111827'; }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Email label (expanded only) */}
      {!collapsed && (
        <div style={{ padding: '0.5rem 1.25rem 0.25rem', flexShrink: 0 }}>
          <span style={{ display: 'block', fontSize: '0.7rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Admin Panel · {email}
          </span>
        </div>
      )}

      {/* Nav links */}
      <nav style={{ flex: 1, padding: collapsed ? '1rem 0' : '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            style={{
              display: 'flex', alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: collapsed ? 0 : '0.75rem',
              padding: collapsed ? '0.625rem 0' : '0.625rem 0.875rem',
              borderRadius: collapsed ? 0 : 8,
              fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af',
              transition: 'background 0.18s, color 0.18s', textDecoration: 'none',
            }}
          >
            <span style={{ flexShrink: 0 }}>{item.icon}</span>
            {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: collapsed ? '1rem 0' : '1rem 0.75rem', borderTop: '1px solid #1f2937', flexShrink: 0 }}>
        {collapsed ? (
          <>
            <Link
              href="/"
              title="Back to site"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.625rem 0', fontSize: '0.8125rem', color: '#6b7280', textDecoration: 'none' }}
            >
              ←
            </Link>
            <form action="/api/auth/logout" method="POST" style={{ marginTop: '0.25rem' }}>
              <button
                type="submit"
                title="Sign out"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.625rem 0', fontSize: '0.8125rem', color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
              >
                ✕
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem', borderRadius: 8, fontSize: '0.8125rem', color: '#6b7280', textDecoration: 'none' }}>
              ← Back to site
            </Link>
            <form action="/api/auth/logout" method="POST" style={{ marginTop: '0.25rem' }}>
              <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem', borderRadius: 8, fontSize: '0.8125rem', color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
                Sign out
              </button>
            </form>
          </>
        )}
      </div>
    </aside>
  );
}
