import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/', httpOnly: true });
  return res;
}

// Support GET for form-based signout links
export async function GET() {
  const res = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'));
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/', httpOnly: true });
  return res;
}
