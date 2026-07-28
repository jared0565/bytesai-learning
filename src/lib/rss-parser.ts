/**
 * RSS/Atom feed parser + article content fetcher.
 * No external dependencies — uses Node.js built-in fetch.
 */

import type { RssSource } from './rss-sources';

export interface ParsedArticle {
  sourceId: string;
  sourceName: string;
  sourceTier: 1 | 2 | 3;
  title: string;
  url: string;
  publishedAt: string;
  contentText: string;
  contentLength: number;
  isComplete: boolean; // >= 800 chars of clean text
  score: number;
}

export interface AutoFilledPage {
  title: string;
  slug: string;
  summary: string;
  whyItMatters: string;
  whatChanged: string;
  executiveImplications: string;
  sourceReferences: Array<{ title: string; url: string }>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FEED_TIMEOUT = 10_000;
const ARTICLE_TIMEOUT = 8_000;
const MIN_COMPLETE_CHARS = 800;
const MIN_ACCEPTABLE_CHARS = 300;
const MAX_AGE_DAYS = 14; // Hard cutoff — articles older than this are never surfaced

const AI_KEYWORDS =
  /\b(ai|artificial intelligence|machine learning|deep learning|llm|large language model|neural network|gpt|claude|gemini|llama|transformer|generative ai|chatbot|nlp|computer vision|reinforcement learning|foundation model|agent|agi|openai|anthropic|deepmind|mistral|copilot|diffusion model)\b/i;

const FEED_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; BytesAI-TrendBot/1.0)',
  'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
};

const ARTICLE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ── XML helpers ───────────────────────────────────────────────────────────────

function extractCdata(s: string): string {
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1] : s;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // Preserve paragraph structure: block-level boundaries become newlines
    // BEFORE any whitespace collapsing, so downstream paragraph splits work.
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote|section|article|figure|figcaption|ul|ol|table|tr)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    // Collapse horizontal whitespace only — never newlines
    .replace(/[^\S\n]{2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getFirstTag(xml: string, tag: string): string {
  // Handles both <tag>...</tag> and <ns:tag>...</ns:tag>
  const patterns = [
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'),
    new RegExp(`<[a-z]+:${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/[a-z]+:${tag}>`, 'i'),
  ];
  for (const re of patterns) {
    const m = xml.match(re);
    if (m) return extractCdata(m[1].trim());
  }
  return '';
}

function getLinkAttr(xml: string): string {
  // Atom: <link href="..."/>
  const m = xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  return m ? m[1] : '';
}

function parseDate(s: string): string {
  if (!s) return new Date().toISOString();
  try { return new Date(s).toISOString(); } catch { return new Date().toISOString(); }
}

function splitSegments(xml: string, tag: string): string[] {
  const segments: string[] = [];
  const close = `</${tag}>`;
  let pos = 0;
  while (pos < xml.length) {
    const start = xml.indexOf(`<${tag}`, pos);
    if (start === -1) break;
    const end = xml.indexOf(close, start);
    if (end === -1) break;
    segments.push(xml.slice(start, end + close.length));
    pos = end + close.length;
  }
  return segments;
}

// ── Article full-text extraction ──────────────────────────────────────────────

/**
 * Remove site chrome that gets pulled in alongside the article body:
 * - "Follow" / topic pill sections
 * - Author bio blocks
 * - Newsletter sign-up CTAs
 * - "Most Popular" / related articles lists
 * - Advertiser / native ad labels
 */
const BOILERPLATE_PATTERNS: RegExp[] = [
  // "Posts from this topic/author will be added to your daily email digest…"
  /Posts from this (?:topic|author) will be added to your[^.]+\./gi,
  // "Follow Follow See All [Topic]"
  /Follow\s+Follow\s+See All[^\n]*/gi,
  // "Close [Topic] Close [Topic]" pill dismissals
  /Close\s+\w[\w\s]{0,40}?\s+Close\s+\w[\w\s]{0,40}?Posts from/gi,
  // "Follow topics and authors from this story to see more…"
  /Follow topics and authors from this story[\s\S]{0,300}?(?=\n\n|\. )/gi,
  // Newsletter sign-up blocks
  /(?:A free daily digest|Sign Up By submitting your email|By submitting your email)[^]*?(?:apply\.|Notice\.)/gi,
  // "Most Popular" heading and its trailing items
  /Most Popular[\s\S]{0,800}?(?=\n\n[A-Z]|\n\nAdvertiser|$)/g,
  // "Advertiser Content From …"
  /Advertiser Content From[\s\S]*/gi,
  // "More in: …" section headers
  /More in:\s*[\w\s:,]+\n/gi,
  // Byline repeated ("by Jay Peters Apr 3, 2026…")
  /by [\w\s]+ (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}[^.\n]*/gi,
  // "Part Of …" labels
  /Part Of\s+[\s\S]{0,120}?see all updates/gi,
  // Whitespace normalisation handled separately
];

/**
 * Strip exact duplicate sentences from extracted text.
 * Works per-paragraph so paragraph breaks survive; dedupe scope is the
 * paragraph, and sentences are kept regardless of length (only exact
 * duplicates are removed).
 */
function deduplicateSentences(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(para => {
      const sentences = para.split(/(?<=[.!?])\s+/);
      const seen = new Set<string>();
      return sentences
        .filter(s => {
          const key = s.trim().toLowerCase().replace(/\s+/g, ' ');
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .join(' ')
        .trim();
    })
    .filter(p => p.length > 0)
    .join('\n\n');
}

export function cleanArticleText(raw: string): string {
  let text = stripHtml(raw);
  for (const pattern of BOILERPLATE_PATTERNS) {
    text = text.replace(pattern, ' ');
  }
  // Tidy whitespace introduced by removals — horizontal runs collapse to a
  // single space, newline runs cap at one blank line (paragraph break)
  text = text
    .replace(/[^\S\n]{2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // Deduplicate sentences
  return deduplicateSentences(text);
}

async function fetchArticleText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: ARTICLE_HEADERS,
      signal: AbortSignal.timeout(ARTICLE_TIMEOUT),
      cache: 'no-store',
    });
    if (!res.ok) return '';
    const html = await res.text();

    // Priority order: specific content body classes first, then semantic tags.
    // We stop at the FIRST match that yields enough text to avoid grabbing
    // sidebars / related-article lists that follow the main body.
    const candidates: (string | undefined)[] = [
      // The Verge, Vox Media: c-entry-content, article__body
      html.match(/class="[^"]*(?:c-entry-content|article__body|entry-content__body)[^"]*"[^>]*>([\s\S]+?)<\/(?:div|section)>/i)?.[1],
      // Medium, Substack, Ghost: post-content, article-content
      html.match(/class="[^"]*(?:post-content|article-content|gh-content|entry-content)[^"]*"[^>]*>([\s\S]+?)<\/(?:div|section|article)>/i)?.[1],
      // Ars Technica, Wired: article-body, story-body
      html.match(/class="[^"]*(?:article-body|story-body|article__content)[^"]*"[^>]*>([\s\S]+?)<\/(?:div|section)>/i)?.[1],
      // Generic: first <article> tag — but stop before any <aside>, <footer>, or nav inside it
      (() => {
        const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1];
        if (!articleMatch) return undefined;
        // Trim everything from the first <aside>, <footer>, or nav-ish section
        return articleMatch
          .replace(/<aside[\s\S]*?<\/aside>/gi, '')
          .replace(/<footer[\s\S]*?<\/footer>/gi, '')
          .replace(/<nav[\s\S]*?<\/nav>/gi, '');
      })(),
      // Last resort: <main>
      html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1],
    ];

    for (const raw of candidates) {
      if (!raw) continue;
      const text = cleanArticleText(raw);
      if (text.length >= MIN_ACCEPTABLE_CHARS) return text;
    }
    return '';
  } catch {
    return '';
  }
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreArticle(
  tier: 1 | 2 | 3,
  isComplete: boolean,
  publishedAt: string,
  title: string,
): number {
  let s = tier === 1 ? 30 : tier === 2 ? 20 : 10;
  if (isComplete) s += 20;
  const ageDays = (Date.now() - new Date(publishedAt).getTime()) / 86_400_000;
  if (ageDays <= 1) s += 15;
  else if (ageDays <= 3) s += 10;
  else if (ageDays <= 7) s += 5;
  if (AI_KEYWORDS.test(title)) s += 10;
  return s;
}

// ── Feed parser ───────────────────────────────────────────────────────────────

async function parseFeed(source: RssSource): Promise<ParsedArticle[]> {
  let xml: string;
  try {
    const res = await fetch(source.feedUrl, {
      headers: FEED_HEADERS,
      signal: AbortSignal.timeout(FEED_TIMEOUT),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    xml = await res.text();
  } catch {
    return [];
  }

  const isAtom = xml.includes('<feed') && xml.includes('<entry');
  const segments = splitSegments(xml, isAtom ? 'entry' : 'item').slice(0, 12);

  const articles: ParsedArticle[] = [];
  const articleFetches: Array<{ article: ParsedArticle; promise: Promise<string> }> = [];

  for (const seg of segments) {
    const title = stripHtml(getFirstTag(seg, 'title'));
    if (!title || title.length < 10) continue;

    let url = isAtom
      ? (getLinkAttr(seg) || getFirstTag(seg, 'id'))
      : (getFirstTag(seg, 'link') || seg.match(/<link>([^<]+)<\/link>/i)?.[1]?.trim() || '');
    url = url.trim();

    // Validate URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) continue;
    try { new URL(url); } catch { continue; }
    // Verify it belongs to this source's domain
    if (!url.includes(source.expectedDomain)) continue;

    const pubRaw = isAtom
      ? (getFirstTag(seg, 'published') || getFirstTag(seg, 'updated'))
      : (getFirstTag(seg, 'pubDate') || getFirstTag(seg, 'date'));
    const publishedAt = parseDate(pubRaw);

    // Hard age cutoff — skip anything older than MAX_AGE_DAYS
    const ageDays = (Date.now() - new Date(publishedAt).getTime()) / 86_400_000;
    if (ageDays > MAX_AGE_DAYS) continue;

    // Get whatever content the feed provides
    const rawContent =
      getFirstTag(seg, 'content:encoded') ||
      getFirstTag(seg, 'content') ||
      getFirstTag(seg, 'description') ||
      getFirstTag(seg, 'summary');
    const contentText = rawContent ? cleanArticleText(rawContent) : '';

    const article: ParsedArticle = {
      sourceId: source.id,
      sourceName: source.name,
      sourceTier: source.tier,
      title,
      url,
      publishedAt,
      contentText,
      contentLength: contentText.length,
      isComplete: contentText.length >= MIN_COMPLETE_CHARS,
      score: 0,
    };

    articles.push(article);

    // Queue full-article fetch for incomplete content
    if (!article.isComplete) {
      articleFetches.push({ article, promise: fetchArticleText(url) });
    }
  }

  // Fetch full articles in parallel
  const settled = await Promise.allSettled(articleFetches.map(f => f.promise));
  settled.forEach((result, i) => {
    if (result.status !== 'fulfilled') return;
    const fullText = result.value;
    const { article } = articleFetches[i];
    if (fullText.length > article.contentText.length) {
      article.contentText = fullText;
      article.contentLength = fullText.length;
      article.isComplete = fullText.length >= MIN_COMPLETE_CHARS;
    }
  });

  // Filter out articles with too little content, score the rest
  return articles
    .filter(a => a.contentLength >= MIN_ACCEPTABLE_CHARS)
    .map(a => ({
      ...a,
      score: scoreArticle(a.sourceTier, a.isComplete, a.publishedAt, a.title),
    }));
}

// ── Auto-fill helper ──────────────────────────────────────────────────────────

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

/**
 * Distribute article content across all curated page fields.
 * Splits into paragraphs and assigns them proportionally.
 */
export function autoFillPageFromArticle(article: ParsedArticle): AutoFilledPage {
  const text = article.contentText;

  // Split into meaningful paragraphs (≥ 60 chars)
  const paras = text
    .split(/\n{2,}|\.\s{2,}/)
    .map(p => p.trim())
    .filter(p => p.length >= 60);

  const fill = (start: number, end: number): string =>
    paras.slice(start, end).join('\n\n').trim();

  let summary = '';
  let whyItMatters = '';
  let whatChanged = '';
  let executiveImplications = '';

  if (paras.length === 0) {
    // Fallback: split by character count
    const q = Math.floor(text.length / 4);
    summary = text.slice(0, q);
    whyItMatters = text.slice(q, q * 2);
    whatChanged = text.slice(q * 2, q * 3);
    executiveImplications = text.slice(q * 3);
  } else if (paras.length <= 2) {
    summary = fill(0, 1);
    whyItMatters = fill(1, 2);
  } else if (paras.length <= 4) {
    summary = fill(0, 1);
    whyItMatters = fill(1, 2);
    whatChanged = fill(2, 3);
    executiveImplications = fill(3, paras.length);
  } else {
    const n = paras.length;
    const p1 = Math.max(1, Math.round(n * 0.20));
    const p2 = Math.max(p1 + 1, Math.round(n * 0.50));
    const p3 = Math.max(p2 + 1, Math.round(n * 0.78));
    summary = fill(0, p1);
    whyItMatters = fill(p1, p2);
    whatChanged = fill(p2, p3);
    executiveImplications = fill(p3, n);
  }

  return {
    title: article.title,
    slug: toSlug(article.title),
    summary,
    whyItMatters,
    whatChanged,
    executiveImplications,
    sourceReferences: [{ title: `${article.sourceName}: ${article.title}`, url: article.url }],
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fetchTrendingArticles(sources: RssSource[]): Promise<ParsedArticle[]> {
  const results = await Promise.allSettled(sources.map(s => parseFeed(s)));

  const all: ParsedArticle[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const deduped = all.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  return deduped.sort((a, b) => b.score - a.score);
}
