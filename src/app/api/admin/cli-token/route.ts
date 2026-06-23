import { NextRequest, NextResponse } from 'next/server';
import { verifySession, signCliToken, COOKIE_NAME } from '@/lib/auth';

// ── POST /api/admin/cli-token ─────────────────────────────────────────────────
// One-time endpoint: call while logged in as admin to generate a short-lived
// CLI token. Store the result as the BYTESAI_CLI_TOKEN Worker secret.

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorised. Must be logged in as admin.' }, { status: 401 });
  }

  const cliToken = await signCliToken(session.userId, session.email);

  return NextResponse.json({
    ok: true,
    token: cliToken,
    expiresIn: '90d',
    instructions: [
      '1. Copy the token value above.',
      '2. Run: npx wrangler secret put BYTESAI_CLI_TOKEN',
      '3. Paste the token when prompted.',
      '4. The CLI can now call admin APIs using: Authorization: Bearer <token>',
    ],
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
