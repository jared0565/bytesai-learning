import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerToken, verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB } from '@/lib/db';
import {
  ingestCourseBatch,
  parseCourseBatchText,
  type BatchIngestResult,
} from '@/lib/admin/course-batch-ingest';

const MAX_BATCH_FILE_BYTES = 256 * 1024;

async function requireAdmin(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  const bearer = auth ? await verifyBearerToken(auth) : null;
  if (bearer) return bearer;

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

function parseBoolean(value: FormDataEntryValue | string | boolean | null | undefined, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

async function readBatchPayload(req: NextRequest): Promise<{
  text: string;
  filename: string;
  dryRun: boolean;
  defaultStatus: 'draft' | 'published' | 'archived';
}> {
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      throw new Error('Upload a .json or .md file using the file field.');
    }
    if (file.size > MAX_BATCH_FILE_BYTES) {
      throw new Error('Batch file is too large. Keep uploads under 256 KB.');
    }

    const defaultStatus = form.get('defaultStatus') === 'published' ? 'published' : 'draft';
    return {
      text: await file.text(),
      filename: file.name || 'courses.json',
      dryRun: parseBoolean(form.get('dryRun'), true),
      defaultStatus,
    };
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    throw new Error('Invalid JSON body.');
  }

  const defaultStatus = body.defaultStatus === 'published' || body.defaultStatus === 'archived'
    ? body.defaultStatus
    : 'draft';

  if (typeof body.content === 'string') {
    return {
      text: body.content,
      filename: typeof body.filename === 'string' ? body.filename : 'courses.json',
      dryRun: parseBoolean(body.dryRun as boolean | string | undefined, true),
      defaultStatus,
    };
  }

  if (Array.isArray(body.courses)) {
    return {
      text: JSON.stringify({ courses: body.courses }),
      filename: 'courses.json',
      dryRun: parseBoolean(body.dryRun as boolean | string | undefined, true),
      defaultStatus,
    };
  }

  throw new Error('Body must include a courses array or content string.');
}

// POST /api/admin/courses/batch-ingest
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let payload: Awaited<ReturnType<typeof readBatchPayload>>;
  try {
    payload = await readBatchPayload(req);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid batch upload.' }, { status: 400 });
  }

  const parsed = parseCourseBatchText(payload.text, payload.filename, { publishedStatus: payload.defaultStatus });
  if (parsed.courses.length === 0) {
    const emptyResult: BatchIngestResult = {
      ok: false,
      dryRun: payload.dryRun,
      summary: {
        total: parsed.issues.length,
        created: 0,
        existing: 0,
        failed: parsed.issues.length,
        validated: 0,
      },
      results: parsed.issues.map(issue => ({
        row: issue.row,
        title: issue.title ?? `Row ${issue.row}`,
        status: 'failed',
        error: issue.error,
      })),
      parseIssues: parsed.issues,
    };
    return NextResponse.json(emptyResult, { status: 422 });
  }

  const db = await getDB().catch(() => null);
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    const result = await ingestCourseBatch({
      db,
      adminUserId: session.userId,
      courses: parsed.courses,
      parseIssues: parsed.issues,
      dryRun: payload.dryRun,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (err) {
    console.error('Course batch ingest error:', err);
    return NextResponse.json({ error: 'Failed to import course batch.' }, { status: 500 });
  }
}
