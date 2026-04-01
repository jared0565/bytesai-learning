export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

function getDB(req: NextRequest) {
  const env = (req as unknown as { env?: { DB?: import('@/lib/db').D1Database } }).env;
  return env?.DB ?? (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined ?? null;
}

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
};

function extractEnrollCount(html: string): number | null {
  // Search __NEXT_DATA__ JSON for any enrollment-related numeric field
  const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (nextMatch) {
    try {
      const json = nextMatch[1];
      // Look for enrollment-related keys with numeric values
      const patterns = [
        /"(?:enrolledCount|enrollCount|totalEnrollments|numberOfStudents|numberOfLearners|learnerCount|registrations|learnersCount|enrollments|totalLearners|userCount)"\s*:\s*(\d+)/gi,
      ];
      for (const p of patterns) {
        const m = json.match(p);
        if (m) {
          const numMatch = m[0].match(/:\s*(\d+)/);
          if (numMatch) return parseInt(numMatch[1], 10);
        }
      }
    } catch { /* ignore */ }
  }

  // HTML text patterns
  const textPatterns = [
    /(\d[\d,]+)\+?\s*(?:learners?|students?)\s+(?:already\s+)?enrolled/i,
    /enrolled\s+(?:by\s+)?(\d[\d,]+)\s*(?:learners?|students?)/i,
    /"numberOfStudents"\s*:\s*(\d+)/i,
    /"learners?"\s*:\s*(\d+)/i,
    /(\d[\d,]+)\s+Learners/,
    /(\d[\d,.]+[KkMm]?)\s+(?:learners?|students?)/i,
  ];
  for (const p of textPatterns) {
    const m = html.match(p);
    if (m) {
      const raw = m[1].replace(/,/g, '');
      if (/[km]/i.test(raw)) {
        const n = parseFloat(raw);
        return /m/i.test(raw) ? Math.round(n * 1_000_000) : Math.round(n * 1_000);
      }
      return parseInt(raw, 10);
    }
  }
  return null;
}

// GET /api/admin/alison-enroll — fetch & update enroll counts for all Alison courses
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const db = getDB(req);
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const debugSlug = searchParams.get('debug');

  // Debug mode: return raw HTML snippet for a single slug
  if (debugSlug) {
    const res = await fetch(`https://alison.com/course/${debugSlug}`, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10000) });
    const html = await res.text();
    const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    let snippet = 'No __NEXT_DATA__';
    if (nextMatch) {
      // Find any key with "enroll", "learner", "student" near a number
      const matches = [...nextMatch[1].matchAll(/"[^"]*(?:enroll|learner|student|register)[^"]*"\s*:\s*[^,}\]]{0,40}/gi)];
      snippet = matches.map(m => m[0]).join('\n') || 'No enrollment keys found in __NEXT_DATA__';
    }
    const textSnippet = [...html.matchAll(/[^<]{0,30}(?:enroll|learner|student)[^<]{0,60}/gi)].slice(0, 10).map(m => m[0]).join('\n');
    return NextResponse.json({ nextDataSnippet: snippet, textSnippet });
  }

  // Bulk mode: fetch all Alison courses and update enroll_count
  const courses = await db.prepare(
    `SELECT id, slug FROM courses WHERE is_alison = 1 AND published_status = 'published' ORDER BY slug`
  ).all<{ id: string; slug: string }>();

  const results: { slug: string; enrollCount: number | null; updated: boolean }[] = [];

  for (const course of courses.results) {
    try {
      const res = await fetch(`https://alison.com/course/${course.slug}`, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) { results.push({ slug: course.slug, enrollCount: null, updated: false }); continue; }
      const html = await res.text();
      const enrollCount = extractEnrollCount(html);
      if (enrollCount != null && enrollCount > 0) {
        await db.prepare('UPDATE courses SET enroll_count = ? WHERE id = ?').bind(enrollCount, course.id).run();
        results.push({ slug: course.slug, enrollCount, updated: true });
      } else {
        results.push({ slug: course.slug, enrollCount: null, updated: false });
      }
      // Small delay to be polite
      await new Promise(r => setTimeout(r, 400));
    } catch {
      results.push({ slug: course.slug, enrollCount: null, updated: false });
    }
  }

  return NextResponse.json({ results, updated: results.filter(r => r.updated).length });
}
