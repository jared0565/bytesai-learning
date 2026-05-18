'use client';

import Link from 'next/link';
import { Brain, Cpu, Shield, Database } from 'lucide-react';

interface FloatingCard {
  icon: React.ReactNode;
  title: string;
  provider: string;
  category: string;
  rotation: number;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
}

const CARDS: FloatingCard[] = [
  {
    icon: <Brain size={18} color="white" />,
    title: 'AI Foundations',
    provider: 'Google',
    category: 'Beginner',
    rotation: -6,
    x: 20,
    y: 0,
    scale: 1,
    zIndex: 3,
  },
  {
    icon: <Cpu size={18} color="white" />,
    title: 'Generative AI',
    provider: 'DeepLearning.AI',
    category: 'Intermediate',
    rotation: 4,
    x: 140,
    y: 90,
    scale: 0.95,
    zIndex: 2,
  },
  {
    icon: <Shield size={18} color="white" />,
    title: 'Responsible AI',
    provider: 'Microsoft',
    category: 'Advanced',
    rotation: -2,
    x: 40,
    y: 190,
    scale: 0.88,
    zIndex: 1,
  },
];

export default function HeroCardGrid() {
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
      {CARDS.map((card, i) => (
        <Link
          key={i}
          href="/courses"
          style={{
            position: 'absolute',
            left: card.x,
            top: card.y,
            zIndex: card.zIndex,
            transform: `rotate(${card.rotation}deg) scale(${card.scale})`,
            transition: 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
            textDecoration: 'none',
          }}
          className="hero-float-card"
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.transform = `rotate(${card.rotation * 0.3}deg) scale(${card.scale * 1.04}) translateY(-4px)`;
            el.style.zIndex = '10';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.transform = `rotate(${card.rotation}deg) scale(${card.scale})`;
            el.style.zIndex = String(card.zIndex);
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
                {card.icon}
              </div>
              <div>
                <p
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                  }}
                >
                  {card.category}
                </p>
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
              {card.title}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              {card.provider}
            </p>
          </div>
        </Link>
      ))}

      {/* Decorative dots / connection lines */}
      <svg
        width="420"
        height="380"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.25 }}
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
