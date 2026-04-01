import Link from 'next/link';
import { ExternalLink, BookOpen, Layers } from 'lucide-react';
import type { Course } from '@/lib/db';

interface CourseCardProps {
  course: Course;
  featured?: boolean;
  compact?: boolean;
}

function getLevelColor(level: string | null): string {
  if (!level) return 'badge-level';
  const l = level.toLowerCase();
  if (l.includes('advanced')) return 'badge-level';
  if (l.includes('intermediate')) return 'badge-cert';
  return 'badge-free';
}

function getContentTypeIcon(contentType: string) {
  if (contentType === 'book') return <BookOpen size={13} />;
  return <Layers size={13} />;
}

export default function CourseCard({ course, featured = false, compact = false }: CourseCardProps) {
  const isAlison = course.is_alison === 1;
  const isAffiliate = course.is_affiliate === 1;
  const destination = course.affiliate_url ?? course.destination_url ?? course.official_link ?? '#';
  const imageBg = isAlison
    ? 'linear-gradient(135deg, #f59e0b22 0%, #fb923c22 100%)'
    : 'linear-gradient(135deg, var(--accent-soft) 0%, var(--teal-soft) 100%)';

  const cardClass = ['course-card', featured ? 'featured-card' : ''].filter(Boolean).join(' ');

  return (
    <Link href={`/courses/${course.slug}`} className={cardClass} aria-label={`View course: ${course.title}`}>
      {/* Cover */}
      {!compact && (
        <div className="course-card-img" style={{ background: imageBg }}>
          {course.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.cover_image_url}
              alt={course.cover_image_alt ?? course.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)',
            }}>
              {getContentTypeIcon(course.content_type)}
              <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {course.content_type}
              </span>
            </div>
          )}
          {isAlison && (
            <div style={{ position: 'absolute', top: 10, left: 10 }}>
              <span className="badge badge-alison">Alison</span>
            </div>
          )}
          {featured && !isAlison && (
            <div style={{ position: 'absolute', top: 10, left: 10 }}>
              <span className="badge badge-new">Featured</span>
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="course-card-body">
        <div className="course-card-badges">
          {course.level && (
            <span className={`badge ${getLevelColor(course.level)}`}>
              {course.level}
            </span>
          )}
          <span className="badge badge-free">Free</span>
          {isAffiliate && (
            <span className="badge badge-affiliate">Affiliate</span>
          )}
          {course.certification_type && course.certification_type !== 'none' && (
            <span className="badge badge-cert">Certificate</span>
          )}
        </div>

        <p className="course-card-title">{course.title}</p>

        {course.snippet && (
          <p className="course-card-snippet">{course.snippet}</p>
        )}

        <div className="course-card-footer">
          <span className="course-card-provider">{course.provider_id?.replace('prov-', '').replace(/-/g, ' ')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600 }}>
            View <ExternalLink size={11} />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Skeleton variant ──────────────────────────────────────────────────
export function CourseCardSkeleton() {
  return (
    <div className="course-card" style={{ pointerEvents: 'none' }}>
      <div className="course-card-img skeleton" />
      <div className="course-card-body" style={{ gap: '0.75rem' }}>
        <div className="skeleton" style={{ height: 20, width: '40%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 18, width: '90%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 18, width: '75%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '30%', marginTop: 'auto', borderRadius: 4 }} />
      </div>
    </div>
  );
}
