export const runtime = 'edge';

import type { Metadata } from 'next';
import FeaturedEditor from './FeaturedEditor';

export const metadata: Metadata = {
  title: 'Featured Slots — Admin',
  robots: { index: false, follow: false },
};

async function getDB() {
  return (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined ?? null;
}

interface FeaturedCourse {
  id: string;
  slug: string;
  title: string;
  featured_priority: number;
  is_alison: number;
}

export default async function AdminFeaturedPage() {
  const db = await getDB();
  let featured: FeaturedCourse[] = [];

  if (db) {
    try {
      const result = await db.prepare(
        `SELECT id, slug, title, featured_priority, is_alison
         FROM courses
         WHERE featured_priority > 0 AND published_status = 'published'
         ORDER BY featured_priority DESC LIMIT 50`
      ).all<FeaturedCourse>();
      featured = result.results;
    } catch { /* ignore */ }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 900 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>Featured Slots</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Control which courses appear in the "Featured this week" homepage section. Higher priority = ranked first.
        </p>
      </div>

      <FeaturedEditor initialCourses={featured} />
    </div>
  );
}
