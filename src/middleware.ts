import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

// Protected routes
const LEARNER_ROUTES = ['/dashboard', '/my-learning', '/saved', '/profile', '/settings'];
const ADMIN_ROUTES = ['/admin'];
const AUTH_ROUTES = ['/auth/login', '/auth/register'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isLearnerRoute = LEARNER_ROUTES.some(r => pathname.startsWith(r));
  const isAdminRoute = ADMIN_ROUTES.some(r => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r));
  const isVerifyPending = pathname === '/auth/verify-pending';

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  // Verify-pending page: only accessible to logged-in unverified users
  if (isVerifyPending) {
    if (!session) return NextResponse.redirect(new URL('/auth/login', req.url));
    if (session.emailVerified) return NextResponse.redirect(new URL('/dashboard', req.url));
    // Allow through — unverified user viewing verify-pending
  }

  // Redirect authenticated users away from login/register pages
  if (isAuthRoute && session) {
    if (!session.emailVerified && session.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/verify-pending', req.url));
    }
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Learner routes — require authenticated + verified session
  if (isLearnerRoute) {
    if (!session) {
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!session.emailVerified && session.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/verify-pending', req.url));
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
    '/auth/verify-pending',
  ],
};
