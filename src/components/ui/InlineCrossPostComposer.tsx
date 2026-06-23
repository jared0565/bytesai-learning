'use client';

import { useState, useCallback, useEffect } from 'react';
import { Copy, Check, ExternalLink, Loader2, AlertCircle, Download } from 'lucide-react';

interface Props {
  slug: string;
  title: string;
}

type Platform = 'twitter' | 'linkedin' | 'whatsapp' | 'facebook';

const PLATFORMS: {
  id: Platform;
  label: string;
  shortLabel: string;
  color: string;
  abbr: string;
  charRange: [number, number];
}[] = [
  { id: 'twitter', label: 'X / Twitter', shortLabel: 'X', color: '#1d9bf0', abbr: '𝕏', charRange: [240, 260] },
  { id: 'linkedin', label: 'LinkedIn', shortLabel: 'LinkedIn', color: '#0a66c2', abbr: 'in', charRange: [1800, 2400] },
  { id: 'whatsapp', label: 'WhatsApp', shortLabel: 'WhatsApp', color: '#25d366', abbr: '💬', charRange: [300, 400] },
  { id: 'facebook', label: 'Facebook', shortLabel: 'Facebook', color: '#1877f2', abbr: 'f', charRange: [180, 380] },
];

function buildShareUrl(platform: Platform, slug: string, copy: string, shareableUrl?: string): string {
  const utmMap: Record<Platform, string> = {
    twitter: 'twitter', linkedin: 'linkedin', whatsapp: 'whatsapp', facebook: 'facebook',
  };
  const articleUrl = shareableUrl ?? `https://learn.bytesai.uk/curated/${slug}?utm_source=${utmMap[platform]}&utm_medium=social&utm_campaign=share`;

  switch (platform) {
    case 'twitter':
      // Pass URL separately so Twitter's card crawler unfurls it reliably.
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(copy)}&url=${encodeURIComponent(articleUrl)}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`;
    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(copy + '\n\n' + articleUrl)}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`;
  }
}

export default function InlineCrossPostComposer({ slug, title }: Props) {
  const [selected, setSelected] = useState<Platform>('twitter');
  const [copies, setCopies] = useState<Partial<Record<Platform, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<Platform, string>>>({});
  const [loading, setLoading] = useState<Platform | null>(null);
  const [copied, setCopied] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [downloadingImage, setDownloadingImage] = useState(false);

  // Fetch short URL once
  useEffect(() => {
    const canonicalUrl = `https://learn.bytesai.uk/curated/${slug}`;
    fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: canonicalUrl }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { shortUrl?: string } | null) => { if (data?.shortUrl) setShortUrl(data.shortUrl); })
      .catch(() => {});
  }, [slug]);

  const ensureCopy = useCallback(async (p: Platform) => {
    if (copies[p] || loading === p) return;

    setLoading(p);
    setErrors(prev => ({ ...prev, [p]: undefined }));
    try {
      const res = await fetch('/api/curated/share-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, platform: p }),
      });
      const data: { copy?: string; error?: string } = await res.json();
      if (data.copy) {
        setCopies(prev => ({ ...prev, [p]: data.copy! }));
      } else {
        setErrors(prev => ({ ...prev, [p]: data.error ?? 'Generation failed — try again.' }));
      }
    } catch {
      setErrors(prev => ({ ...prev, [p]: 'Network error — please try again.' }));
    }
    setLoading(null);
  }, [copies, loading, slug]);

  const selectPlatform = useCallback((p: Platform) => {
    setSelected(p);
    setCopied(false);
    if (!copies[p] && !errors[p]) {
      ensureCopy(p);
    }
  }, [copies, errors, ensureCopy]);

  // Generate default copy on first mount
  useEffect(() => {
    if (!copies[selected] && !errors[selected] && loading !== selected) {
      ensureCopy(selected);
    }
  }, [selected, copies, errors, ensureCopy]);

  const handleCopy = useCallback(async () => {
    if (!copies[selected]) return;
    const utmMap: Record<Platform, string> = {
      twitter: 'twitter', linkedin: 'linkedin', whatsapp: 'whatsapp', facebook: 'facebook',
    };
    const shareableUrl = shortUrl ?? `https://learn.bytesai.uk/curated/${slug}?utm_source=${utmMap[selected]}&utm_medium=social&utm_campaign=share`;
    const fullText = copies[selected]! + '\n\n' + shareableUrl;
    await navigator.clipboard.writeText(fullText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [selected, copies, slug, shortUrl]);

  const handleDownloadImage = useCallback(async () => {
    setDownloadingImage(true);
    try {
      const res = await fetch(`/api/og?slug=${encodeURIComponent(slug)}&type=article`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `bytesai-${slug}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent fail
    } finally {
      setDownloadingImage(false);
    }
  }, [slug]);

  const selectedMeta = PLATFORMS.find(p => p.id === selected)!;
  const copy = copies[selected];
  const copyError = errors[selected];
  const isLoading = loading === selected;
  const [minC, maxC] = selectedMeta.charRange;
  const charCount = copy?.length ?? 0;
  const charOk = charCount >= minC && charCount <= maxC;
  const effectiveTweetLength = selected === 'twitter'
    ? (copy?.length ?? 0) + 1 + 23
    : null;
  const tweetOverLimit = effectiveTweetLength !== null && effectiveTweetLength > 280;

  return (
    <div>
      <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
        Share “{title}”
      </p>

      {/* Platform tabs */}
      <div
        role="tablist"
        aria-label="Social platforms"
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.375rem',
          padding: '0.25rem', background: 'var(--bg)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)', marginBottom: '0.875rem',
        }}
      >
        {PLATFORMS.map(plat => {
          const active = selected === plat.id;
          return (
            <button
              key={plat.id}
              role="tab"
              aria-selected={active}
              onClick={() => selectPlatform(plat.id)}
              disabled={loading !== null && loading !== plat.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                padding: '0.5rem 0.375rem',
                background: active ? 'var(--bg-card)' : 'transparent',
                border: active ? `1px solid ${plat.color}` : '1px solid transparent',
                borderRadius: 'var(--radius)',
                cursor: loading !== null && loading !== plat.id ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                fontSize: '0.75rem', fontWeight: active ? 700 : 600,
                color: active ? plat.color : 'var(--text-secondary)',
                boxShadow: active ? `0 1px 2px ${plat.color}20` : 'none',
              }}
            >
              <span style={{ fontSize: '0.85rem' }}>{plat.abbr}</span>
              <span className="hide-mobile-sm">{plat.shortLabel}</span>
              {loading === plat.id && (
                <Loader2 size={10} style={{ animation: 'spin 1s linear infinite', marginLeft: 2 }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Generated copy area — tall and readable */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <p style={{
            fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {selectedMeta.label} copy
          </p>
          {copy && (
            <span style={{
              fontSize: '0.68rem', fontWeight: 700, padding: '0.125rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              color: selected === 'twitter'
                ? (tweetOverLimit ? 'var(--rose)' : effectiveTweetLength! >= 270 ? 'var(--amber)' : 'var(--emerald)')
                : charOk ? 'var(--emerald)' : charCount > maxC ? 'var(--rose)' : 'var(--amber)',
              background: selected === 'twitter'
                ? (tweetOverLimit ? 'rgba(239,68,68,0.1)' : effectiveTweetLength! >= 270 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)')
                : charOk ? 'rgba(16,185,129,0.1)' : charCount > maxC ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            }}>
              {selected === 'twitter'
                ? `${effectiveTweetLength}/280 (post + link)`
                : `${charCount.toLocaleString()} chars${selected !== 'linkedin' ? ` · target ${minC}–${maxC}` : ''}`}
            </span>
          )}
        </div>

        {isLoading ? (
          <div style={{
            minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
          }}>
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)', marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Writing {selectedMeta.label} copy…
            </p>
          </div>
        ) : copyError ? (
          <div style={{
            minHeight: 120, padding: '1rem',
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
          }}>
            <AlertCircle size={15} color="var(--rose)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--rose)', fontWeight: 600 }}>{copyError}</p>
              <button
                onClick={() => { setCopies(prev => ({ ...prev, [selected]: undefined })); setErrors(prev => ({ ...prev, [selected]: undefined })); ensureCopy(selected); }}
                style={{ fontSize: '0.72rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '0.5rem', textDecoration: 'underline' }}
              >
                Retry
              </button>
            </div>
          </div>
        ) : copy ? (
          <>
            <textarea
              value={copy}
              onChange={e => setCopies(prev => ({ ...prev, [selected]: e.target.value }))}
              rows={8}
              style={{
                width: '100%', minHeight: 160, padding: '0.875rem',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', resize: 'vertical',
                fontSize: '0.9rem', lineHeight: 1.7,
                color: 'var(--text-primary)', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />

            {selected === 'linkedin' && (
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                💡 LinkedIn share links don&apos;t accept pre-filled text — copy the post then click Share to paste it.
              </p>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleCopy}
                className="btn btn-primary btn-sm"
                disabled={tweetOverLimit}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : tweetOverLimit ? 'Too long for X' : 'Copy text + link'}
              </button>
              <a
                href={buildShareUrl(selected, slug, copy, shortUrl ?? undefined)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  opacity: tweetOverLimit ? 0.5 : 1,
                  pointerEvents: tweetOverLimit ? 'none' : 'auto',
                }}
                onClick={selected === 'linkedin' || selected === 'facebook' ? handleCopy : undefined}
              >
                <ExternalLink size={13} />
                {tweetOverLimit ? 'Over X limit' : `Open ${selectedMeta.shortLabel}`}
                {selected === 'linkedin' && ' ↗'}
              </a>
              <button
                onClick={() => { setCopies(prev => ({ ...prev, [selected]: undefined })); ensureCopy(selected); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.375rem 0.625rem', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text-muted)',
                }}
              >
                ↺ Regenerate
              </button>
            </div>

            {selected === 'facebook' && (
              <div style={{
                marginTop: '0.875rem', padding: '0.75rem 1rem',
                background: 'rgba(24,119,242,0.04)',
                border: '1px solid rgba(24,119,242,0.15)',
                borderRadius: 'var(--radius-md)',
              }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1877f2', marginBottom: '0.25rem' }}>
                  📸 Native image post — 2–3× more reach
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '0.5rem' }}>
                  Facebook suppresses link posts. Download the branded card and post it as a native image with the copy + link in the caption.
                </p>
                <button
                  onClick={handleDownloadImage}
                  disabled={downloadingImage}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                >
                  {downloadingImage
                    ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Download size={13} />}
                  {downloadingImage ? 'Generating…' : 'Download image card'}
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* OG card preview */}
      {copy && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{
            fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem',
          }}>
            Link preview card
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/og?slug=${encodeURIComponent(slug)}&type=article`}
            alt="Article share card"
            style={{ width: '100%', maxWidth: 360, borderRadius: 'var(--radius-md)', display: 'block', border: '1px solid var(--border)' }}
          />
        </div>
      )}
    </div>
  );
}
