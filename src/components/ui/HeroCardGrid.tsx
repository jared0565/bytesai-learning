'use client';

import Link from 'next/link';
import {
  Brain, Cpu, Shield, Database, Code, BookOpen, Layers,
  MessageSquare, Rss, Sparkles,
} from 'lucide-react';
import type { Course } from '@/lib/db';

const ICON_MAP: Record<string, React.ReactNode> = {
  'AI Foundations':              <Brain size={18} color="white" />,
  'LLMs / Generative AI':        <Cpu size={18} color="white" />,
  'AI Agents':                   <Rss size={18} color="white" />,
  'Prompt Engineering':          <MessageSquare size={18} color="white" />,
  'Governance / Responsible AI': <Shield size={18} color="white" />,
  'Data / ML':                   <Database size={18} color="white" />,
  'Programming Foundations':     <Code size={18} color="white" />,
  'Books / Reading Sources':     <BookOpen size={18} color="white" />,
};

const DEFAULT_ICON = <Sparkles size={18} color="white" />;

const POSITIONS = [
  { rotation: -6, x: 20,  y: 0,   scale: 1,    zIndex: 3 },
  { rotation: 4,  x: 140, y: 90,  scale: 0.95, zIndex: 2 },
  { rotation: -2, x: 40,  y: 190, scale: 0.88, zIndex: 1 },
];

function formatProvider(providerId: string | null): string {
  if (!providerId) return 'Unknown provider';
  return providerId
    .replace(/^prov-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function truncateTitle(title: string, max = 34): string {
  if (title.length <= max) return title;
  const cut = title.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + '\u2026';
}

interface HeroCardGridProps {
  courses: Course[];
}

export default function HeroCardGrid({ courses }: HeroCardGridProps) {
  const cards = courses.slice(0, 3);
  if (cards.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: 420,
        height: 380,
        flexShrink: 0,
      }}
    >
      {cards.map((course, i) => {
        const pos = POSITIONS[i] ?? POSITIONS[0];
        const icon = ICON_MAP[course.category ?? ''] ?? DEFAULT_ICON;
        const level = course.level ?? 'All levels';

        return (
          <Link
            key={course.id}
            href={`/courses/${course.slug}`}
            className="hero-float-card"
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              zIndex: pos.zIndex,
              transform: `rotate(${pos.rotation}deg) scale(${pos.scale})`,
              transition: 'transform 0.4s var(--ease-out-quart), box-shadow 0.4s var(--ease-out-quart), z-index 0s',
              textDecoration: 'none',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget;
              el.style.transform = `rotate(${pos.rotation * 0.25}deg) scale(${pos.scale * 1.05}) translateY(-6px)`;
              el.style.zIndex = '10';
              el.style.boxShadow = '0 20px 40px oklch(0.52 0.20 258 / 0.15), 0 0 0 1px var(--border-hover)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.style.transform = `rotate(${pos.rotation}deg) scale(${pos.scale})`;
              el.style.zIndex = String(pos.zIndex);
              el.style.boxShadow = 'var(--shadow-md)';
            }}
          >
            <div
              style={{
                width: 260,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.125rem',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem',
                transition: 'box-shadow 0.4s var(--ease-out-quart)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {course.category ?? 'Course'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--emerald)',
                      background: 'var(--emerald-soft)',
                      padding: '0.125rem 0.5rem',
                      borderRadius: 999,
                    }}
                  >
                    Free
                  </span>
                </div>
              </div>
              <p
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.35,
                }}
              >
                {truncateTitle(course.title)}
              </p>              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {formatProvider(course.provider_id)}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.125rem' }}>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    background: 'var(--bg-input)',
                    padding: '0.125rem 0.5rem',
                    borderRadius: 6,
                  }}
                >
                  {level}
                </span>
              </div>
            </div>
          </Link>
        );
      })}

      {/* Decorative dots / connection lines */}
      <svg
        width="420"
        height="380"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.2 }}
      >
        <circle cx="200" cy="60" r="3" fill="var(--accent)" />
        <circle cx="340" cy="140" r="2.5" fill="var(--teal)" />
        <circle cx="120" cy="260" r="2" fill="var(--accent)" />
        <line x1="200" y1="60" x2="340" y2="140" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="340" y1="140" x2="120" y2="260" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
      </svg>
    </div>
  );
}
