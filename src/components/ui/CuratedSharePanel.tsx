'use client';

import { useState, useCallback, useEffect } from 'react';
import { Share2, X, Copy, Check, ExternalLink, Loader2, AlertCircle, Download } from 'lucide-react';

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
  const fullText = copy + '\n\n' + articleUrl;

  switch (platform) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`;
    case 'linkedin':
      // LinkedIn share-offsite only supports URL — we'll copy the text separately
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`;
    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(fullText)}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`;
  }
}

export default function CuratedSharePanel({ slug, title }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Platform | null>(null);
  const [copies, setCopies] = useState<Partial<Record<Platform, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<Platform, string>>>({});
  const [loading, setLoading] = useState<Platform | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || shortUrl) return;
    const canonicalUrl = `https://learn.bytesai.uk/curated/${slug}`;
    fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: canonicalUrl }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { shortUrl?: string } | null) => { if (data?.shortUrl) setShortUrl(data.shortUrl); })
      .catch(() => {});
  }, [open, slug, shortUrl]);

  const selectPlatform = useCallback(async (p: Platform) => {
    setSelected(p);
    setCopied(false);
    if (copies[p] || loading) return; // already generated or in-flight

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

  const handleCopy = useCallback(async () => {
    if (!selected || !copies[selected]) return;
    const utmMap: Record<Platform, string> = {
      twitter: 'twitter', linkedin: 'linkedin', whatsapp: 'whatsapp', facebook: 'facebook',
    };
    const shareableUrl = shortUrl ?? `https://learn.bytesai.uk/curated/${slug}?utm_source=${utmMap[selected]}&utm_medium=social&utm_campaign=share`;
    const fullText = copies[selected]! + '\n\n' + shareableUrl;
    await navigator.clipboard.writeText(fullText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [selected, copies, slug, shortUrl]);

  const selectedMeta = PLATFORMS.find(p => p.id === selected);
  const copy = selected ? copies[selected] : undefined;
  const copyError = selected ? errors[selected] : undefined;
  const [minC, maxC] = selectedMeta?.charRange ?? [0, 0];
  const charCount = copy?.length ?? 0;
  const charOk = charCount >= minC && charCount <= maxC;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.625rem 1.25rem',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', cursor: 'pointer',
          fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
      >
        <Share2 size={15} />
        Share this insight
      </button>

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Share this insight"
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)', width: '100%', maxWidth: 560,
            maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}>

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1.125rem 1.5rem', borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <div style={{ overflow: 'hidden' }}>
                <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.125rem' }}>Share this insight</h3>
                <p style={{
                  fontSize: '0.75rem', color: 'var(--text-muted)',
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 380,
                }}>
                  {title}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: '0.375rem', flexShrink: 0,
                  borderRadius: 'var(--radius)',
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>

              {/* Platform grid */}
              <div>
                <p style={{
                  fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem',
                }}>
                  Choose platform — AI writes optimised copy for each
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {PLATFORMS.map(plat => (
                    <button
                      key={plat.id}
                      onClick={() => selectPlatform(plat.id)}
                      disabled={loading !== null}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.625rem',
                        padding: '0.75rem 0.875rem',
                        background: selected === plat.id ? `${plat.color}15` : 'var(--bg)',
                        border: `2px solid ${selected === plat.id ? plat.color : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)', cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s', textAlign: 'left', opacity: loading && loading !== plat.id ? 0.6 : 1,
                      }}
                    >
                      {/* Platform icon */}
                      <span style={{
                        width: 30, height: 30, borderRadius: 7,
                        background: plat.color, color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: plat.abbr.length <= 2 ? '0.9rem' : '0.8rem',
                        fontWeight: 900, flexShrink: 0, fontFamily: 'serif',
                        userSelect: 'none',
                      }}>
                        {plat.abbr}
                      </span>

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.25, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {plat.label}
                        </p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
                          {plat.charRange[0].toLocaleString()}–{plat.charRange[1].toLocaleString()} chars
                        </p>
                      </div>

                      {/* Status icon */}
                      {loading === plat.id && (
                        <Loader2 size={13} style={{ flexShrink: 0, color: plat.color, animation: 'spin 1s linear infinite' }} />
                      )}
                      {copies[plat.id] && loading !== plat.id && (
                        <Check size={13} style={{ flexShrink: 0, color: 'var(--emerald)' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* OG card preview — shown once a platform is selected */}
              {selected && (
                <div>
                  <p style={{
                    fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem',
                  }}>
                    Link preview card
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/og?slug=${encodeURIComponent(slug)}&type=article`}
                    alt="Article share card"
                    style={{ width: '100%', borderRadius: 'var(--radius-md)', display: 'block', border: '1px solid var(--border)' }}
                  />
                </div>
              )}

              {/* Generated copy area */}
              {selected && (
                <div>
                  {loading === selected ? (
                    <div style={{
                      padding: '2.5rem 1rem', textAlign: 'center',
                      background: 'var(--bg)', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                    }}>
                      <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)', margin: '0 auto 0.625rem', display: 'block' }} />
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Writing {selectedMeta?.label} copy…
                      </p>
                    </div>
                  ) : copyError ? (
                    <div style={{
                      padding: '1.25rem', background: 'rgba(239,68,68,0.06)',
                      border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)',
                      display: 'flex', gap: '0.625rem', alignItems: 'flex-start',
                    }}>
                      <AlertCircle size={15} color="var(--rose)" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--rose)', fontWeight: 600 }}>{copyError}</p>
                        <button
                          onClick={() => { setCopies(prev => ({ ...prev, [selected]: undefined })); setErrors(prev => ({ ...prev, [selected]: undefined })); selectPlatform(selected); }}
                          style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '0.25rem', textDecoration: 'underline' }}
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  ) : copy ? (
                    <div>
                      {/* Char count header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {selectedMeta?.label} copy
                        </p>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, padding: '0.125rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          color: charOk ? 'var(--emerald)' : charCount > maxC ? 'var(--rose)' : 'var(--amber)',
                          background: charOk ? 'rgba(16,185,129,0.1)' : charCount > maxC ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        }}>
                          {charCount.toLocaleString()} chars
                          {selected !== 'linkedin' && ` · target ${minC}–${maxC}`}
                        </span>
                      </div>

                      {/* Editable textarea */}
                      <textarea
                        value={copy}
                        onChange={e => {
                          const val = e.target.value;
                          setCopies(prev => ({ ...prev, [selected]: val }));
                        }}
                        rows={selected === 'linkedin' ? 14 : 5}
                        style={{
                          width: '100%', padding: '0.875rem',
                          background: 'var(--bg)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)', resize: 'vertical',
                          fontSize: '0.875rem', lineHeight: 1.65,
                          color: 'var(--text-primary)', fontFamily: 'inherit',
                          boxSizing: 'border-box',
                        }}
                      />

                      {selected === 'linkedin' && (
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.375rem', lineHeight: 1.5 }}>
                          💡 LinkedIn share links don&apos;t accept pre-filled text — copy the post then click Share to paste it.
                        </p>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={handleCopy}
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                        >
                          {copied ? <Check size={13} /> : <Copy size={13} />}
                          {copied ? 'Copied!' : 'Copy text + link'}
                        </button>
                        <a
                          href={buildShareUrl(selected, slug, copy, shortUrl ?? undefined)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                          onClick={selected === 'linkedin' || selected === 'facebook' ? handleCopy : undefined}
                        >
                          <ExternalLink size={13} />
                          Open {selectedMeta?.shortLabel}
                          {selected === 'linkedin' && ' ↗'}
                        </a>
                        <button
                          onClick={() => { setCopies(prev => ({ ...prev, [selected]: undefined })); selectPlatform(selected); }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            padding: '0.375rem 0.625rem', background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)',
                          }}
                        >
                          ↺ Regenerate
                        </button>
                      </div>

                      {/* Native image post tip — Facebook only */}
                      {selected === 'facebook' && (
                        <div style={{
                          marginTop: '0.875rem', padding: '0.875rem 1rem',
                          background: 'rgba(24,119,242,0.04)',
                          border: '1px solid rgba(24,119,242,0.15)',
                          borderRadius: 'var(--radius-md)',
                        }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1877f2', marginBottom: '0.375rem' }}>
                            📸 Native image post — 2–3× more reach
                          </p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '0.625rem' }}>
                            Facebook suppresses link posts. Download the branded card, post it as a native image, and paste the copy + link in the caption for full organic reach.
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
                    </div>
                  ) : null}
                </div>
              )}

              {/* Growth tips */}
              <div style={{
                padding: '0.875rem 1rem',
                background: 'rgba(79,110,247,0.04)',
                border: '1px solid rgba(79,110,247,0.12)',
                borderRadius: 'var(--radius-md)',
              }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.5rem' }}>
                  🚀 Fastest path to meaningful views
                </p>
                <ul style={{ margin: 0, padding: '0 0 0 1.125rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                  <li><strong>Share within 1 hour</strong> of publishing — algorithms reward recency heavily</li>
                  <li>Post on <strong>X first</strong>, then cross-post to LinkedIn 2–3 hours later for double reach</li>
                  <li>Submit to <a href="https://news.ycombinator.com/submit" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Hacker News</a> and <a href="https://www.reddit.com/r/artificial/submit" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>r/artificial</a> — community traffic compounds</li>
                  <li><strong>Internal links</strong> from your homepage and other articles boost SEO crawl depth</li>
                  <li>Engage every reply within <strong>3 hours</strong> to extend algorithmic reach</li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
