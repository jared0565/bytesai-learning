import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getCourseBySlug, getDB } from '@/lib/db';
import { isValidSlug } from '@/lib/security';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import LearnEnvironment from './LearnEnvironment';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDB();
  if (!db || !isValidSlug(slug)) return { title: 'Study Mode' };
  const course = await getCourseBySlug(db, slug).catch(() => null);
  if (!course) return { title: 'Study Mode' };
  return {
    title: `Study: ${course.title} — BytesAI Learning`,
    description: course.snippet ?? undefined,
    robots: { index: false }, // study pages are private / not for indexing
  };
}

export default async function LearnPage({ params }: PageProps) {
  const { slug } = await params;

  if (!isValidSlug(slug)) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  // Must be logged in
  if (!session) {
    redirect(`/auth/login?from=/learn/${slug}`);
  }

  const db = await getDB();
  if (!db) {
    return (
      <>
        <Header userRole={session.role} displayName={session.displayName} />
        <main className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Database unavailable — please try again.</p>
        </main>
        <Footer />
      </>
    );
  }

  const course = await getCourseBySlug(db, slug).catch(() => null);
  if (!course) notFound();

  // Alison courses belong on Alison — redirect to their destination
  if (course.is_alison === 1) {
    const dest = course.affiliate_url ?? course.destination_url ?? course.official_link;
    if (dest) redirect(dest);
    redirect(`/courses/${slug}`);
  }

  // Find the best matching Alison course in the same category for the certification suggestion
  let alisonMatch: import('@/lib/db').Course | null = null;
  try {
    if (course.category) {
      const res = await db.prepare(`
        SELECT * FROM courses
        WHERE is_alison = 1
          AND published_status = 'published'
          AND category = ?
          AND id != ?
        ORDER BY
          CASE WHEN certification_type IS NOT NULL AND certification_type != 'none' THEN 0 ELSE 1 END,
          popularity_score DESC
        LIMIT 1
      `).bind(course.category, course.id).first<import('@/lib/db').Course>();
      alisonMatch = res ?? null;
    }

    // Fallback: any popular Alison course
    if (!alisonMatch) {
      const res = await db.prepare(`
        SELECT * FROM courses
        WHERE is_alison = 1 AND published_status = 'published'
        ORDER BY popularity_score DESC
        LIMIT 1
      `).first<import('@/lib/db').Course>();
      alisonMatch = res ?? null;
    }
  } catch {
    // no match — that's fine
  }

  const destination = course.destination_url ?? course.official_link ?? null;

  return (
    <>
      <Header userRole={session.role} displayName={session.displayName} />
      <main>
        <LearnEnvironment
          course={course}
          destination={destination}
          alisonMatch={alisonMatch}
          userId={session.userId}
        />
      </main>
      <Footer />
    </>
  );
}
