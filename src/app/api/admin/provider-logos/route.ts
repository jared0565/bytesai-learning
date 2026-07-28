import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerToken } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { deriveProviderFallbackLogoUrl, deriveProviderLogoUrl } from '@/lib/provider-logo';

interface ProviderRow {
  id: string;
  slug: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  const admin = await verifyBearerToken(auth);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { dryRun?: boolean; force?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine — default to non-dry-run
  }

  const dryRun = body.dryRun ?? false;
  const force = body.force ?? false;

  try {
    const db = await getDB();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const result = await db.prepare(
      `SELECT id, slug, name, website_url, logo_url FROM providers ORDER BY name`
    ).all<ProviderRow>();

    const providers = result.results;
    const updates: { slug: string; name: string; old: string | null; new: string | null }[] = [];
    const skipped: { slug: string; reason: string }[] = [];

    for (const p of providers) {
      // Skip if already has a logo_url and force is not set
      if (p.logo_url && !force) {
        skipped.push({ slug: p.slug, reason: 'Already has logo_url (use force:true to overwrite)' });
        continue;
      }

      const logoUrl = deriveProviderLogoUrl(p.website_url);
      if (!logoUrl) {
        skipped.push({ slug: p.slug, reason: 'No website_url or unparseable URL' });
        continue;
      }

      updates.push({ slug: p.slug, name: p.name, old: p.logo_url, new: logoUrl });

      if (!dryRun) {
        await db.prepare(`UPDATE providers SET logo_url = ? WHERE id = ?`).bind(logoUrl, p.id).run();
      }
    }

    return NextResponse.json({
      dryRun,
      updated: updates.length,
      skipped: skipped.length,
      providers: updates,
      skippedProviders: skipped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to populate logos', details: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  const admin = await verifyBearerToken(auth);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDB();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const result = await db.prepare(
      `SELECT id, slug, name, website_url, logo_url FROM providers ORDER BY name`
    ).all<ProviderRow>();

    const providers = result.results.map(p => ({
      ...p,
      derived: deriveProviderLogoUrl(p.website_url),
      fallback: deriveProviderFallbackLogoUrl(p.website_url),
    }));

    return NextResponse.json({ providers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to list providers', details: message }, { status: 500 });
  }
}
