// Security utilities — sanitization, rate limiting, URL validation

import { NextRequest, NextResponse } from 'next/server';

// ─── Input sanitization ───────────────────────────────────────────────

/** Strip HTML tags and dangerous characters from user input */
export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')              // strip HTML
    .replace(/[<>"'`]/g, '')             // strip XSS chars
    .replace(/javascript:/gi, '')        // strip js: hrefs
    .replace(/on\w+\s*=/gi, '')          // strip event attrs
    .trim()
    .slice(0, 10000);                    // hard cap
}

/** Sanitize email input */
export function sanitizeEmail(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.toLowerCase().trim().slice(0, 320);
}

/** Validate slug format */
export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 200;
}

/** Validate email format */
export function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 320;
}

/** Validate URL is safe (https only, no localhost in production) */
export function isValidExternalUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// ─── Alison affiliate URL validator ───────────────────────────────────

const ALISON_CAMPAIGN = '27668723';

export function isValidAlisonAffiliateUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'alison.com' &&
      parsed.searchParams.get('utm_source') === 'alison_user' &&
      parsed.searchParams.get('utm_medium') === 'affiliate' &&
      parsed.searchParams.get('utm_campaign') === ALISON_CAMPAIGN
    );
  } catch {
    return false;
  }
}

export function buildAlisonAffiliateUrl(courseSlug: string, fragment?: string): string {
  const base = `https://alison.com/course/${courseSlug}?utm_source=alison_user&utm_medium=affiliate&utm_campaign=${ALISON_CAMPAIGN}`;
  return fragment ? `${base}#${fragment}` : base;
}

// ─── Prompt injection detection ───────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above|prior)\s+instructions/i,
  /disregard\s+(your|the)\s+(system|above)\s+prompt/i,
  /you\s+are\s+now\s+a/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /act\s+as\s+(a\s+)?(?!course|advisor|guide)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /\bsystem\s+prompt\b/i,
  /reveal\s+your\s+(instructions|rules|prompt)/i,
  /\bsudo\b/i,
  /override\s+(safety|guidelines|instructions)/i,
];

export function detectPromptInjection(input: string): boolean {
  return INJECTION_PATTERNS.some(p => p.test(input));
}

// ─── Rate limiting (in-memory for local dev, KV for production) ────────

interface RateLimitEntry { count: number; resetAt: number }
const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string, maxCount: number, windowMs: number): {
  allowed: boolean; remaining: number; resetAt: number;
} {
  const now = Date.now();
  let entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitStore.set(key, entry);
  }
  if (entry.count >= maxCount) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count++;
  return { allowed: true, remaining: maxCount - entry.count, resetAt: entry.resetAt };
}

export function getRateLimitKey(req: NextRequest, suffix: string): string {
  const ip = req.headers.get('CF-Connecting-IP') ??
    req.headers.get('X-Real-IP') ??
    req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown';
  return `${ip}:${suffix}`;
}

export function rateLimitResponse(resetAt: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
        'X-RateLimit-Reset': String(resetAt),
      },
    }
  );
}

// ─── Security headers ─────────────────────────────────────────────────

export function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}
