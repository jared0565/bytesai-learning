import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

function homeUrl(req: NextRequest): string {
  // NEXT_PUBLIC_* vars are statically replaced at build time by Next.js using .env files.
  // .env.production is the authoritative source so this will be https://learn.bytesai.uk
  // in production builds (provided .env.local does NOT define NEXT_PUBLIC_SITE_URL).
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && !configured.includes('localhost')) return configured;

  // Fallback: reconstruct origin from request headers.
  // Do NOT use req.url — OpenNext rewrites it to http://localhost:3000 internally.
  // The host header carries the actual external hostname Cloudflare received.
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  if (host && !host.includes('localhost')) return `${proto}://${host}`;

  // Hard fallback — never serve localhost to a real user.
  return 'https://learn.bytesai.uk';
}

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/', homeUrl(req)), { status: 303 });
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/', httpOnly: true });
  return res;
}

// Support GET for form-based sign-out links
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/', homeUrl(req)), { status: 303 });
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/', httpOnly: true });
  return res;
}
