import { getDB, getCourseBySlug, getCuratedPageBySlug } from '@/lib/db';
import { isValidSlug } from '@/lib/security';
import { buildArticleSvg, buildCourseSvg, buildQuizSvg, getProviderName } from '@/lib/og-image';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const type = searchParams.get('type');
  const requestedFormat = searchParams.get('format');
  const forcePng = requestedFormat !== 'svg';

  // Quiz result image: ?type=quiz&score=4&total=5&difficulty=advanced
  if (type === 'quiz') {
    const score = parseInt(searchParams.get('score') ?? '0', 10);
    const total = parseInt(searchParams.get('total') ?? '5', 10);
    const difficulty = searchParams.get('difficulty') ?? 'beginner';
    const svg = buildQuizSvg(score, total, difficulty);
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    });
  }

  if (!slug || !isValidSlug(slug)) {
    return new Response('Missing or invalid slug', { status: 400 });
  }

  // Static OG PNGs are generated at build time and served as assets.
  // If a PNG exists for this slug, redirect to it so social crawlers get a real raster image.
  if (forcePng) {
    const pngUrl = `/og-images/${slug}.png`;
    return new Response(null, {
      status: 302,
      headers: {
        'Location': pngUrl,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  }

  try {
    const db = await getDB();
    if (!db) throw new Error('no db');

    if (type === 'article') {
      const article = await getCuratedPageBySlug(db, slug).catch(() => null);
      const snippet = article?.summary ?? '';
      const why = article?.why_it_matters ?? '';
      const svg = buildArticleSvg(
        article?.title ?? 'AI Insight',
        snippet || why,
        snippet ? why : '',
      );
      return new Response(svg, {
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
      });
    }

    const course = await getCourseBySlug(db, slug).catch(() => null);
    if (course) {
      const svg = buildCourseSvg(
        course.title,
        getProviderName(course.provider_id),
        course.category ?? '',
        course.level ?? '',
        course.is_alison === 1,
        course.snippet ?? ''
      );
      return new Response(svg, {
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
      });
    }

    const article = await getCuratedPageBySlug(db, slug).catch(() => null);
    const snippet = article?.summary ?? '';
    const why = article?.why_it_matters ?? '';
    const svg = buildArticleSvg(
      article?.title ?? 'AI Insight',
      snippet || why,
      snippet ? why : '',
    );
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    });

  } catch {
    const svg = buildArticleSvg('BytesAI Learning', 'Free AI courses and insights curated for the modern learner.');
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=300' },
    });
  }
}
