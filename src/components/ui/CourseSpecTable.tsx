import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { Course } from '@/lib/db';

function fmt(s: string | null | undefined): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}

interface Props {
  course: Course;
  rationale?: string; // AI-generated curator paragraph
}

export default function CourseSpecTable({ course, rationale }: Props) {
  const tags = course.tags_json ? (JSON.parse(course.tags_json) as string[]).slice(0, 5) : [];
  const enrollUrl = course.affiliate_url || course.destination_url || course.official_link || `/courses/${course.slug}`;
  const isExternal = enrollUrl.startsWith('http');
  const isFree = course.free_status === 'free' || course.access_model === 'free';

  const credential = (() => {
    const cert = course.certification_type;
    if (cert && cert.toLowerCase().includes('optional')) return 'Free to learn, optional paid certificate';
    if (isFree && cert) return `Free / ${fmt(cert)}`;
    if (isFree) return 'Free';
    if (cert) return fmt(cert);
    return fmt(course.access_model) || 'See course';
  })();

  // Compact key-facts rows — shown below the rationale paragraph
  const rows: [string, string][] = [
    ['Course', course.title],
    ['Provider', fmt(course.provider_id)],
    course.level ? ['Level', fmt(course.level)] : null,
    ['Cost', credential],
    tags.length > 0 ? ['Topics', tags.join(', ')] : null,
    course.duration_text ? ['Duration', course.duration_text] : null,
  ].filter(Boolean) as [string, string][];

  const ctaLabel = isFree ? 'Explore the course' : 'View the course';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Curator rationale paragraph — shown when available */}
      {rationale && (
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          {rationale}
        </p>
      )}

      {/* Compact key-facts table */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <tbody>
            {rows.map(([label, value], i) => (
              <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{
                  padding: '0.5rem 0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  width: '30%',
                  background: 'var(--bg)',
                  whiteSpace: 'nowrap',
                  verticalAlign: 'top',
                }}>
                  {label}
                </td>
                <td style={{
                  padding: '0.5rem 0.75rem',
                  color: 'var(--text-primary)',
                  lineHeight: 1.5,
                  verticalAlign: 'top',
                }}>
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CTA */}
      {isExternal ? (
        <div>
          <a
            href={enrollUrl}
            target="_blank"
            rel={`noopener noreferrer${course.is_affiliate ? ' sponsored' : ''}`}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <ExternalLink size={13} />
            {ctaLabel}
          </a>
          {course.is_affiliate === 1 && (
            <p className="course-affiliate-disclosure">
              Affiliate link — if you enrol through this link, BytesAI Learning may earn a small commission at no extra cost to you.
            </p>
          )}
        </div>
      ) : (
        <Link
          href={enrollUrl}
          className="btn btn-primary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
