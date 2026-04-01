import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// GET /api/auth/oauth/linkedin — redirect to LinkedIn OAuth consent screen
export async function GET(req: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/auth/login?error=oauth-not-configured', req.url));
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const redirectUri = `${siteUrl}/api/auth/oauth/linkedin/callback`;
  const state = nanoid(24);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'openid profile email',
  });

  const res = NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);

  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return res;
}
