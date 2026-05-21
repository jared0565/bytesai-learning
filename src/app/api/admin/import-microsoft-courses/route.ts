import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME, verifyBearerToken } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { sanitizeText, isValidSlug, isValidExternalUrl } from '@/lib/security';

async function requireAdmin(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  const bearer = auth ? await verifyBearerToken(auth) : null;
  if (bearer) return bearer;

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

const MICROSOFT_PROVIDER_ID = 'prov-microsoft-learn';

interface MicrosoftCourse {
  title: string;
  slug: string;
  officialLink: string;
  duration: string | null;
  level: string | null;
}

/**
 * Hard-coded courses extracted from:
 * https://learn.microsoft.com/en-gb/training/browse/
 * ?levels=beginner%2Cintermediate
 * &subjects=artificial-intelligence%2Cdata-management
 * &roles=ai-edge-engineer%2Cai-engineer
 * &resource_type=course
 *
 * These were verified via headless browser on 2026-05-21.
 */
const COURSES: MicrosoftCourse[] = [
  {
    title: 'Develop AI agents on Azure',
    slug: 'develop-ai-agents-on-azure',
    officialLink: 'https://learn.microsoft.com/en-gb/training/courses/ai-3026/',
    duration: '1 Day',
    level: 'Intermediate',
  },
  {
    title: 'Develop AI apps and agents on Azure',
    slug: 'develop-ai-apps-and-agents-on-azure',
    officialLink: 'https://learn.microsoft.com/en-gb/training/courses/ai-103t00/',
    duration: '4 Days',
    level: 'Intermediate',
  },
  {
    title: 'Extract insights from visual data on Azure',
    slug: 'extract-insights-from-visual-data-on-azure',
    officialLink: 'https://learn.microsoft.com/en-gb/training/courses/ai-3008/',
    duration: '1 Day',
    level: 'Intermediate',
  },
  {
    title: 'Introduction to AI in Azure',
    slug: 'introduction-to-ai-in-azure',
    officialLink: 'https://learn.microsoft.com/en-gb/training/courses/ai-901t00/',
    duration: '1 Day',
    level: 'Beginner',
  },
  {
    title: 'Operationalize machine learning and generative AI solutions',
    slug: 'operationalize-ml-and-generative-ai-solutions',
    officialLink: 'https://learn.microsoft.com/en-gb/training/courses/ai-300t00/',
    duration: '4 Days',
    level: 'Intermediate',
  },
  {
    title: 'Implement a data science and machine learning solution for AI with Microsoft Fabric',
    slug: 'implement-data-science-and-ml-for-ai-with-microsoft-fabric',
    officialLink: 'https://learn.microsoft.com/en-gb/training/courses/dp-604t00/',
    duration: '1 Day',
    level: 'Beginner',
  },
  {
    title: 'Implement Generative AI engineering with Azure Databricks',
    slug: 'implement-generative-ai-engineering-with-azure-databricks',
    officialLink: 'https://learn.microsoft.com/en-gb/training/courses/dp-3028/',
    duration: '1 Day',
    level: 'Intermediate',
  },
];

// POST /api/admin/import-microsoft-courses
// One-off endpoint that imports the 7 Microsoft Learn AI courses found
// at the filtered browse URL above.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });
  }

  const db = await getDB();
  if (!db) {
    return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });
  }

  const results: Array<{ title: string; slug: string; status: 'imported' | 'skipped' | 'error'; reason?: string }> = [];

  for (const course of COURSES) {
    try {
      // Deduplicate by official_link or slug
      const existingByUrl = await db.prepare('SELECT slug FROM courses WHERE official_link = ?').bind(course.officialLink).first<{ slug: string }>();
      if (existingByUrl) {
        results.push({ title: course.title, slug: existingByUrl.slug, status: 'skipped', reason: 'Already exists by URL' });
        continue;
      }

      const existingBySlug = await db.prepare('SELECT slug FROM courses WHERE slug = ?').bind(course.slug).first<{ slug: string }>();
      if (existingBySlug) {
        results.push({ title: course.title, slug: existingBySlug.slug, status: 'skipped', reason: 'Already exists by slug' });
        continue;
      }

      const { nanoid } = await import('nanoid');
      const id = `crs-${nanoid(12)}`;
      const now = new Date().toISOString();

      await db.prepare(
        `INSERT INTO courses (
          id, slug, provider_id, title, content_type, category, level,
          duration_text, official_link, published_status,
          is_alison, is_affiliate, popularity_score,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        course.slug,
        MICROSOFT_PROVIDER_ID,
        course.title,
        'course',
        'Artificial Intelligence',
        course.level,
        course.duration,
        course.officialLink,
        'published',
        0,
        0,
        50,
        now,
        now
      ).run();

      results.push({ title: course.title, slug: course.slug, status: 'imported' });
    } catch (err) {
      results.push({ title: course.title, slug: course.slug, status: 'error', reason: String(err) });
    }
  }

  const imported = results.filter(r => r.status === 'imported').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const errors = results.filter(r => r.status === 'error').length;

  return NextResponse.json({
    imported,
    skipped,
    errors,
    courses: results,
  });
}
