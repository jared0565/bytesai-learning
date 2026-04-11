import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Unsubscribe — BytesAI Learning',
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ success?: string; error?: string }>;
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const params = await searchParams;
  const success = params.success === '1';
  const error = params.error;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem' }}>
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>

        {success ? (
          <>
            <CheckCircle2 size={48} color="var(--emerald)" style={{ margin: '0 auto 1rem', display: 'block' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>You&apos;ve been unsubscribed</h1>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              You won&apos;t receive any more marketing emails from BytesAI Learning.
              You can still use your account and re-enable email preferences in your settings at any time.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/settings" className="btn btn-outline btn-sm">Account Settings</Link>
              <Link href="/" className="btn btn-primary btn-sm">Back to home</Link>
            </div>
          </>
        ) : (
          <>
            <AlertCircle size={48} color="var(--rose)" style={{ margin: '0 auto 1rem', display: 'block' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Unsubscribe failed</h1>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              {error === 'invalid-token' || error === 'missing-token'
                ? 'The unsubscribe link is invalid or has expired. Links are valid for 1 year.'
                : 'Something went wrong. Please try again or manage your preferences in your account settings.'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              You can also email <a href="mailto:hello@bytesai.com" style={{ color: 'var(--accent)' }}>hello@bytesai.com</a> to unsubscribe manually.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/settings" className="btn btn-outline btn-sm">Account Settings</Link>
              <Link href="/" className="btn btn-primary btn-sm">Back to home</Link>
            </div>
          </>
        )}

        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2rem' }}>
          <Link href="/privacy-policy" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>
          {' · '}
          <Link href="/terms-of-service" style={{ color: 'var(--accent)' }}>Terms of Service</Link>
        </p>
      </div>
    </div>
  );
}
