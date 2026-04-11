import Link from 'next/link';
import { ExternalLink, BookOpen, Layers, Brain, Cpu, MessageSquare, Shield, Database, Code, Rss, Users } from 'lucide-react';
import type { Course } from '@/lib/db';

function formatEnrollCount(n: number): string {
  return n.toLocaleString('en-US');
}

interface CourseCardProps {
  course: Course;
  featured?: boolean;
  compact?: boolean;
}

// Category → gradient + icon
const CATEGORY_STYLE: Record<string, { gradient: string; icon: React.ReactNode }> = {
  'AI Foundations':              { gradient: 'linear-gradient(135deg,#4f6ef7,#818cf8)', icon: <Brain size={20} color="white" /> },
  'LLMs / Generative AI':        { gradient: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', icon: <Cpu size={20} color="white" /> },
  'AI Agents':                   { gradient: 'linear-gradient(135deg,#8b5cf6,#c084fc)', icon: <Rss size={20} color="white" /> },
  'Prompt Engineering':          { gradient: 'linear-gradient(135deg,#f59e0b,#fb923c)', icon: <MessageSquare size={20} color="white" /> },
  'Governance / Responsible AI': { gradient: 'linear-gradient(135deg,#10b981,#34d399)', icon: <Shield size={20} color="white" /> },
  'Data / ML':                   { gradient: 'linear-gradient(135deg,#3b82f6,#60a5fa)', icon: <Database size={20} color="white" /> },
  'Programming Foundations':     { gradient: 'linear-gradient(135deg,#22c55e,#4ade80)', icon: <Code size={20} color="white" /> },
  'Books / Reading Sources':     { gradient: 'linear-gradient(135deg,#64748b,#94a3b8)', icon: <BookOpen size={20} color="white" /> },
};
const DEFAULT_STYLE = { gradient: 'linear-gradient(135deg,#4f6ef7,#0ea5e9)', icon: <Layers size={20} color="white" /> };

function getCategoryStyle(category: string | null) {
  if (!category) return DEFAULT_STYLE;
  return CATEGORY_STYLE[category] ?? DEFAULT_STYLE;
}

function formatProvider(providerId: string | null): string {
  if (!providerId) return '';
  const map: Record<string, string> = {
    'prov-microsoft': 'Microsoft', 'prov-google': 'Google', 'prov-anthropic': 'Anthropic',
    'prov-nvidia': 'NVIDIA', 'prov-deeplearning-ai': 'DeepLearning.AI', 'prov-hugging-face': 'Hugging Face',
    'prov-alison': 'Alison', 'prov-aws': 'AWS', 'prov-ibm': 'IBM', 'prov-stanford': 'Stanford',
    'prov-harvard': 'Harvard', 'prov-berkeley': 'UC Berkeley', 'prov-linux-foundation': 'Linux Foundation',
    'prov-meta': 'Meta', 'prov-langchain': 'LangChain', 'prov-fast-ai': 'fast.ai',
    'prov-goodfellow': 'Goodfellow et al.', 'prov-prince': 'Simon Prince', 'prov-sutton-barto': 'Sutton & Barto',
    'prov-murphy': 'Kevin Murphy', 'prov-sra-mit': 'MIT SRA',
  };
  return map[providerId] ?? providerId.replace('prov-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getLevelColor(level: string | null): string {
  if (!level) return 'badge-level';
  const l = level.toLowerCase();
  if (l.includes('advanced')) return 'badge-level';
  if (l.includes('intermediate')) return 'badge-cert';
  return 'badge-free';
}

export default function CourseCard({ course, featured = false, compact = false }: CourseCardProps) {
  const isAlison = course.is_alison === 1;
  const isAffiliate = course.is_affiliate === 1;
  const { gradient, icon } = getCategoryStyle(course.category);
  const providerName = formatProvider(course.provider_id);

  const cardClass = ['course-card', featured ? 'featured-card' : ''].filter(Boolean).join(' ');

  // Shared inner content
  const inner = (
    <>
      {/* Header band */}
      {!compact && (
        <div style={{
          height: 80, background: gradient, position: 'relative',
          display: 'flex', alignItems: 'center', padding: '0 1.25rem', gap: '0.875rem',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(4px)' }}>
            {icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {course.category ?? 'Course'}
            </p>
            <p style={{ color: 'white', fontSize: '0.8125rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {providerName}
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
            {isAlison && <span className="badge badge-alison" style={{ fontSize: '0.65rem' }}>Alison</span>}
            {featured && !isAlison && <span className="badge badge-new" style={{ fontSize: '0.65rem' }}>Featured</span>}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="course-card-body">
        <div className="course-card-badges">
          {course.level && <span className={`badge ${getLevelColor(course.level)}`}>{course.level}</span>}
          <span className="badge badge-free">Free</span>
          {isAffiliate && <span className="badge badge-affiliate">Affiliate</span>}
          {course.certification_type && course.certification_type !== 'none' && (
            <span className="badge badge-cert">Certificate</span>
          )}
        </div>
        <p className="course-card-title">{course.title}</p>
        {course.snippet && <p className="course-card-snippet">{course.snippet}</p>}
        {course.enroll_count != null && course.enroll_count > 0 && (
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '-0.125rem' }}>
            <Users size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span>{formatEnrollCount(course.enroll_count)}<span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> enrolled</span></span>
          </p>
        )}
        <div className="course-card-footer">
          <span className="course-card-provider">{providerName}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600 }}>
            {isAlison ? 'Open on Alison' : 'View'} <ExternalLink size={11} />
          </span>
        </div>
      </div>
    </>
  );

  // Alison courses → open affiliate URL directly in a new tab
  if (isAlison) {
    const href = course.affiliate_url ?? course.official_link ?? 'https://alison.com/?utm_source=alison_user&utm_medium=affiliate&utm_campaign=27668723';
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cardClass} aria-label={`Open on Alison: ${course.title}`}>
        {inner}
      </a>
    );
  }

  // All other courses → internal detail page
  return (
    <Link href={`/courses/${course.slug}`} className={cardClass} aria-label={`View course: ${course.title}`}>
      {inner}
    </Link>
  );
}

// ── Skeleton variant ──────────────────────────────────────────────────
export function CourseCardSkeleton() {
  return (
    <div className="course-card" style={{ pointerEvents: 'none' }}>
      <div style={{ height: 80 }} className="skeleton" />
      <div className="course-card-body" style={{ gap: '0.75rem' }}>
        <div className="skeleton" style={{ height: 20, width: '40%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 18, width: '90%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 18, width: '75%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '30%', marginTop: 'auto', borderRadius: 4 }} />
      </div>
    </div>
  );
}
