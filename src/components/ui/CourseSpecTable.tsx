import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { Course } from '@/lib/db';

function fmt(s: string | null | undefined): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}

export default function CourseSpecTable({ course }: { course: Course }) {
  const tags = course.tags_json ? (JSON.parse(course.tags_json) as string[]).slice(0, 5) : [];
  const enrollUrl = course.affiliate_url || course.destination_url || course.official_link || `/courses/${course.slug}`;
  const isExternal = enrollUrl.startsWith('http');

  const credential = (() => {
    const free = course.free_status === 'free' || course.access_model === 'free';
    const cert = course.certification_type;
    if (free && cert) return `Free / ${fmt(cert)}`;
    if (free) return 'Free';
    if (cert) return fmt(cert);
    return fmt(course.access_model) || 'See course';
  })();

  const rows: [string, string][] = [
    ['Course Title', course.title],
    ['Provider', fmt(course.provider_id)],
    course.level ? ['Difficulty Level', fmt(course.level)] : null,
    ['Cost / Credential', credential],
    course.snippet ? ['Primary Objective', course.snippet] : null,
    tags.length > 0 ? ['Curriculum Focus', tags.join(', ')] : null,
    course.focus_area ? ['Focus Area', course.focus_area] : null,
    course.duration_text ? ['Duration', course.duration_text] : null,
  ].filter(Boolean) as [string, string][];

  return (
    <div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <tbody>
            {rows.map(([label, value], i) => (
              <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{
                  padding: '0.625rem 0.875rem',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted)',
                  width: '38%',
                  background: 'var(--bg)',
                  whiteSpace: 'nowrap',
                  verticalAlign: 'top',
                }}>
                  {label}
                </td>
                <td style={{
                  padding: '0.625rem 0.875rem',
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

      {isExternal ? (
        <a
          href={enrollUrl}
          target="_blank"
          rel={`noopener noreferrer${course.is_affiliate ? ' sponsored' : ''}`}
          className="btn btn-primary btn-sm"
          style={{ marginTop: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <ExternalLink size={13} />
          {course.free_status === 'free' || course.access_model === 'free' ? 'Enroll Free' : 'View Course'}
        </a>
      ) : (
        <Link
          href={enrollUrl}
          className="btn btn-primary btn-sm"
          style={{ marginTop: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
        >
          View Course
        </Link>
      )}
    </div>
  );
}
