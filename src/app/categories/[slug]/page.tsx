import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/ui/CourseCard';
import { getCoursesByCategory, getDB} from '@/lib/db';
import { getCategoryBySlug, CATEGORIES } from '@/lib/ranking';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

const CATEGORY_META: Record<string, { tagline: string; description: string }> = {
  'ai-foundations': {
    tagline: 'Build a solid base in artificial intelligence.',
    description: 'Start your AI journey with core concepts — machine learning fundamentals, neural network basics, and the principles behind modern AI systems.',
  },
  'llms-generative-ai': {
    tagline: 'Master large language models and generative AI.',
    description: 'Explore how LLMs work, how to fine-tune and prompt them, and how to build applications powered by tools like ChatGPT, Claude, and Gemini.',
  },
  'agents': {
    tagline: 'Build autonomous AI agents that take action.',
    description: 'Learn how to design, build, and deploy AI agents — systems that plan, reason, and execute multi-step tasks using tools and APIs.',
  },
  'data-ml': {
    tagline: 'Data science and classical machine learning.',
    description: 'The full ML pipeline — data wrangling, feature engineering, model training, evaluation, and deployment using Python, scikit-learn, and more.',
  },
  'prompt-engineering': {
    tagline: 'Get better results from any AI model.',
    description: 'Practical techniques for writing effective prompts — few-shot learning, chain-of-thought reasoning, structured outputs, and system prompt design.',
  },
  'governance-responsible-ai': {
    tagline: 'Understand AI ethics, risk, and policy.',
    description: 'Critical frameworks for responsible AI — bias, fairness, explainability, regulation, and building systems that earn public trust.',
  },
  'programming-foundations': {
    tagline: 'The coding skills every AI practitioner needs.',
    description: 'Python, algorithms, data structures, and software engineering fundamentals that underpin every real-world AI project.',
  },
  'books': {
    tagline: 'Essential books and reading lists.',
    description: 'Curated books, reading guides, and written resources from leading AI researchers and practitioners.',
  },
  'lectures': {
    tagline: 'Lectures, talks, and curated video series.',
    description: 'University lectures, conference talks, and video series from world-class AI researchers and engineers.',
  },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) return {};
  const meta = CATEGORY_META[slug];
  const description = meta?.description ?? `Browse free ${cat.label} courses. Hand-curated from top AI providers.`;
  return {
    title: `${cat.label} — Free AI Courses | BytesAI Learning`,
    description,
    openGraph: {
      title: `${cat.label} — Free AI Courses`,
      description,
      type: 'website',
    },
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) notFound();

  const meta = CATEGORY_META[slug] ?? { tagline: `Free ${cat.label} courses.`, description: '' };

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  const db = await getDB();
  const courses = db ? await getCoursesByCategory(db, cat.db, 48).catch(() => []) : [];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${cat.label} — Free AI Courses`,
    description: meta.description || meta.tagline,
    url: `https://bytesai.com/categories/${slug}`,
    hasPart: courses.slice(0, 10).map(c => ({
      '@type': 'Course',
      name: c.title,
      url: `https://bytesai.com/courses/${c.slug}`,
      isAccessibleForFree: true,
    })),
  };

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <main>
        {/* Hero */}
        <section style={{ background: 'transparent', padding: '3.5rem 0 2.5rem', color: 'white' }}>
          <div className="container">
            <div style={{ marginBottom: '1rem' }}>
              <Link href="/categories" style={{ color: '#94a3b8', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                <ArrowLeft size={14} /> All categories
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #4f6ef720, #0ea5e920)', border: '1px solid #4f6ef730', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LayoutGrid size={26} color="#4f6ef7" />
              </div>
              <div style={{ flex: 1 }}>
                <h1 className="text-display" style={{ color: 'white', marginBottom: '0.625rem' }}>{cat.label}</h1>
                <p style={{ color: '#cbd5e1', fontSize: '1.0625rem', maxWidth: 580, lineHeight: 1.65 }}>
                  {meta.description || meta.tagline}
                </p>
                {courses.length > 0 && (
                  <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.75rem' }}>
                    {courses.length} course{courses.length !== 1 ? 's' : ''} · all free to start
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Courses */}
        <section className="section" style={{ background: 'var(--bg)', minHeight: '50vh' }}>
          <div className="container">
            {courses.length === 0 ? (
              <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <p style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>No courses yet</p>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: 360, margin: '0 auto 1.5rem' }}>
                  We&apos;re actively sourcing {cat.label} courses. Check back soon.
                </p>
                <Link href="/courses" className="btn btn-primary" style={{ display: 'inline-flex' }}>
                  Browse all courses
                </Link>
              </div>
            ) : (
              <>
                <div className="grid-3">
                  {courses.map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>

                {/* Cross-links to other categories */}
                <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    Explore other categories
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
                    {CATEGORIES.filter(c => c.slug !== slug).map(c => (
                      <Link key={c.slug} href={`/categories/${c.slug}`} className="btn btn-outline btn-sm">
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
