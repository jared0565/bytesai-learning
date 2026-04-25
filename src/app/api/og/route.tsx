import { ImageResponse } from 'next/og';
import { getDB, getCourseBySlug, getCuratedPageBySlug } from '@/lib/db';
import { isValidSlug } from '@/lib/security';

const PROVIDER_NAMES: Record<string, string> = {
  'prov-microsoft': 'Microsoft', 'prov-google': 'Google', 'prov-anthropic': 'Anthropic',
  'prov-nvidia': 'NVIDIA', 'prov-deeplearning-ai': 'DeepLearning.AI', 'prov-hugging-face': 'Hugging Face',
  'prov-alison': 'Alison', 'prov-aws': 'AWS', 'prov-ibm': 'IBM', 'prov-stanford': 'Stanford',
  'prov-harvard': 'Harvard', 'prov-berkeley': 'UC Berkeley', 'prov-linux-foundation': 'Linux Foundation',
  'prov-meta': 'Meta', 'prov-langchain': 'LangChain', 'prov-fast-ai': 'fast.ai',
};

function getProviderName(id: string | null): string {
  if (!id) return '';
  return PROVIDER_NAMES[id] ?? id.replace('prov-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const CATEGORY_COLORS: Record<string, string> = {
  'AI Foundations': '#4f6ef7',
  'LLMs / Generative AI': '#0ea5e9',
  'AI Agents': '#8b5cf6',
  'Prompt Engineering': '#f59e0b',
  'Governance / Responsible AI': '#10b981',
  'Data / ML': '#3b82f6',
  'Programming Foundations': '#22c55e',
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + '…';
}

// ── Article OG (1200×1200) ────────────────────────────────────────────────────
function ArticleImage({ title, summary }: { title: string; summary?: string }) {
  const len = title.length;
  const fontSize = len > 80 ? 52 : len > 60 ? 60 : len > 40 ? 68 : 76;
  const display = summary ? truncate(summary, 150) : undefined;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0f172a 0%, #1a1240 50%, #0f172a 100%)',
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 6, background: 'linear-gradient(90deg, #8b5cf6, #14b8a6)', display: 'flex', width: '100%', flexShrink: 0 }} />

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, padding: 80 }}>
        {/* Logo — upper left */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #8b5cf6, #14b8a6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginRight: 18, flexShrink: 0,
          }}>
            <span style={{ color: 'white', fontSize: 30, fontWeight: 900, fontFamily: 'sans-serif' }}>B</span>
          </div>
          <span style={{ color: 'white', fontSize: 32, fontWeight: 800, marginRight: 8, fontFamily: 'sans-serif' }}>BytesAI</span>
          <span style={{ color: '#a78bfa', fontSize: 32, fontWeight: 800, fontFamily: 'sans-serif' }}>Learning</span>
        </div>

        {/* Centre block — badge + title + summary */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          {/* Badge */}
          <div style={{
            display: 'flex', padding: '10px 28px', borderRadius: 99,
            background: 'rgba(139,92,246,0.15)',
            border: '1.5px solid rgba(139,92,246,0.4)',
            marginBottom: 52,
          }}>
            <span style={{ color: '#c4b5fd', fontSize: 17, fontWeight: 800, letterSpacing: 3, fontFamily: 'sans-serif' }}>
              AI INSIGHT
            </span>
          </div>

          {/* Title — centred */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 960 }}>
            <span style={{
              color: 'white', fontSize, fontWeight: 800, lineHeight: 1.18,
              textAlign: 'center', fontFamily: 'sans-serif',
            }}>
              {title}
            </span>

            {display && (
              <span style={{
                color: '#94a3b8', fontSize: 26, lineHeight: 1.6,
                textAlign: 'center', marginTop: 36, fontFamily: 'sans-serif',
                maxWidth: 840,
              }}>
                {display}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#475569', fontSize: 22, fontWeight: 500, fontFamily: 'sans-serif' }}>
            learn.bytesai.uk
          </span>
          <div style={{
            display: 'flex', padding: '10px 26px', borderRadius: 99,
            background: 'rgba(16,185,129,0.15)',
            border: '1.5px solid rgba(16,185,129,0.4)',
          }}>
            <span style={{ color: '#34d399', fontSize: 18, fontWeight: 700, fontFamily: 'sans-serif' }}>
              Free · No signup required
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Course OG (1200×630) ──────────────────────────────────────────────────────
function CourseImage({
  title, provider, category, level, isAlison, snippet,
}: {
  title: string; provider: string; category: string;
  level: string; isAlison: boolean; snippet: string;
}) {
  const accent = CATEGORY_COLORS[category] ?? '#4f6ef7';
  const displaySnippet = snippet ? truncate(snippet, 100) : '';
  const titleLen = title.length;
  const fontSize = titleLen > 70 ? 40 : titleLen > 50 ? 46 : titleLen > 35 ? 52 : 58;

  return (
    <div
      style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      }}
    >
      <div style={{ height: 5, background: `linear-gradient(90deg, ${accent}, #0ea5e9)`, display: 'flex', width: '100%', flexShrink: 0 }} />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 56 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 11,
            background: `linear-gradient(135deg, ${accent}, #0ea5e9)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginRight: 14, flexShrink: 0,
          }}>
            <span style={{ color: 'white', fontSize: 22, fontWeight: 900, fontFamily: 'sans-serif' }}>B</span>
          </div>
          <span style={{ color: 'white', fontSize: 24, fontWeight: 800, marginRight: 6, fontFamily: 'sans-serif' }}>BytesAI</span>
          <span style={{ color: accent, fontSize: 24, fontWeight: 800, fontFamily: 'sans-serif' }}>Learning</span>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', marginBottom: 20 }}>
          {isAlison && (
            <div style={{ display: 'flex', padding: '5px 16px', borderRadius: 99, background: '#f59e0b', marginRight: 10 }}>
              <span style={{ color: 'white', fontSize: 13, fontWeight: 700, fontFamily: 'sans-serif' }}>Alison</span>
            </div>
          )}
          <div style={{ display: 'flex', padding: '5px 16px', borderRadius: 99, background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.5)', marginRight: 10 }}>
            <span style={{ color: '#34d399', fontSize: 13, fontWeight: 700, fontFamily: 'sans-serif' }}>Free</span>
          </div>
          {level && (
            <div style={{ display: 'flex', padding: '5px 16px', borderRadius: 99, background: `rgba(79,110,247,0.15)`, border: `1px solid rgba(79,110,247,0.4)` }}>
              <span style={{ color: '#818cf8', fontSize: 13, fontWeight: 700, fontFamily: 'sans-serif' }}>{level}</span>
            </div>
          )}
        </div>

        {/* Category */}
        {category && (
          <span style={{ color: accent, fontSize: 14, fontWeight: 700, letterSpacing: 2, marginBottom: 16, fontFamily: 'sans-serif' }}>
            {category.toUpperCase()}
          </span>
        )}

        {/* Title */}
        <span style={{ color: 'white', fontSize, fontWeight: 800, lineHeight: 1.2, fontFamily: 'sans-serif', maxWidth: 900 }}>
          {title}
        </span>

        {displaySnippet && (
          <span style={{ color: '#94a3b8', fontSize: 18, marginTop: 16, lineHeight: 1.5, fontFamily: 'sans-serif', maxWidth: 860 }}>
            {displaySnippet}
          </span>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 24 }}>
          {provider && (
            <span style={{ color: '#cbd5e1', fontSize: 16, fontWeight: 600, fontFamily: 'sans-serif' }}>
              {provider}
            </span>
          )}
          <span style={{ color: '#475569', fontSize: 15, fontFamily: 'sans-serif', marginLeft: 'auto' }}>
            learn.bytesai.uk
          </span>
        </div>
      </div>
    </div>
  );
}

const CACHE = 'public, max-age=86400, s-maxage=604800';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const type = searchParams.get('type');

  if (!slug || !isValidSlug(slug)) {
    return new Response('Missing or invalid slug', { status: 400 });
  }

  try {
    const db = await getDB();
    if (!db) throw new Error('no db');

    if (type === 'article') {
      const article = await getCuratedPageBySlug(db, slug).catch(() => null);
      return new ImageResponse(
        <ArticleImage
          title={article?.title ?? 'AI Insight'}
          summary={article?.summary ?? article?.why_it_matters ?? undefined}
        />,
        { width: 1200, height: 1200, headers: { 'Cache-Control': CACHE } },
      );
    }

    const course = await getCourseBySlug(db, slug).catch(() => null);
    if (course) {
      return new ImageResponse(
        <CourseImage
          title={course.title}
          provider={getProviderName(course.provider_id)}
          category={course.category ?? ''}
          level={course.level ?? ''}
          isAlison={course.is_alison === 1}
          snippet={course.snippet ?? ''}
        />,
        { width: 1200, height: 630, headers: { 'Cache-Control': CACHE } },
      );
    }

    // Not a course — try article
    const article = await getCuratedPageBySlug(db, slug).catch(() => null);
    return new ImageResponse(
      <ArticleImage
        title={article?.title ?? 'AI Insight'}
        summary={article?.summary ?? article?.why_it_matters ?? undefined}
      />,
      { width: 1200, height: 1200, headers: { 'Cache-Control': CACHE } },
    );

  } catch {
    return new ImageResponse(
      <ArticleImage title="BytesAI Learning" summary="Free AI courses and insights curated for the modern learner." />,
      { width: 1200, height: 1200, headers: { 'Cache-Control': 'public, max-age=300' } },
    );
  }
}
