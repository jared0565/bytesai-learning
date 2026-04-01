export const runtime = 'edge';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';



// Protected routes
const LEARNER_ROUTES = ['/dashboard', '/my-learning', '/saved', '/profile', '/settings'];
const ADMIN_ROUTES = ['/admin'];
const AUTH_ROUTES = ['/auth/login', '/auth/register'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isLearnerRoute = LEARNER_ROUTES.some(r => pathname.startsWith(r));
  const isAdminRoute = ADMIN_ROUTES.some(r => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r));

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Learner routes — require any authenticated session
  if (isLearnerRoute) {
    if (!session) {
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Admin routes — require admin role
  if (isAdminRoute) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    if (session.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  const res = NextResponse.next();

  // Security headers
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return res;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/my-learning/:path*',
    '/saved/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/auth/login',
    '/auth/register',
  ],
};
