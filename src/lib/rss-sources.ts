export interface RssSource {
  id: string;
  name: string;
  feedUrl: string;
  expectedDomain: string; // article URLs must contain this domain
  tier: 1 | 2 | 3;
}

/**
 * Curated list of authoritative AI sources.
 * Tier 1 = Official AI lab / research blogs
 * Tier 2 = Reputable tech & science journalism
 */
export const RSS_SOURCES: RssSource[] = [
  // ── Tier 1 — Official AI Lab / Research Blogs ─────────────────────────────
  {
    id: 'google-ai',
    name: 'Google AI Blog',
    feedUrl: 'https://blog.google/technology/ai/rss/',
    expectedDomain: 'blog.google',
    tier: 1,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    feedUrl: 'https://openai.com/blog/rss.xml',
    expectedDomain: 'openai.com',
    tier: 1,
  },
  {
    id: 'deepmind',
    name: 'Google DeepMind',
    feedUrl: 'https://deepmind.google/blog/rss.xml',
    expectedDomain: 'deepmind.google',
    tier: 1,
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    feedUrl: 'https://huggingface.co/blog/feed.xml',
    expectedDomain: 'huggingface.co',
    tier: 1,
  },
  // NOTE: Anthropic, Microsoft AI Blog, Meta AI and Wired (AI) were removed
  // 2026-07-28 — their feed URLs returned 404/410 (confirmed via curl,
  // redirects followed) and were silently contributing zero articles. No
  // live AI-scoped replacement feed was found for any of the four; general
  // (non-AI) feeds exist for Meta and Wired but were rejected since there's
  // no per-article topic filter to keep off-topic PR/lifestyle content out.

  // ── Tier 2 — Reputable Tech & Science Journalism ──────────────────────────
  {
    id: 'mit-tech-review',
    name: 'MIT Technology Review',
    feedUrl: 'https://www.technologyreview.com/feed/',
    expectedDomain: 'technologyreview.com',
    tier: 2,
  },
  {
    id: 'ieee-spectrum',
    name: 'IEEE Spectrum (AI)',
    feedUrl: 'https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss',
    expectedDomain: 'spectrum.ieee.org',
    tier: 2,
  },
  {
    id: 'ars-technica',
    name: 'Ars Technica',
    feedUrl: 'https://feeds.arstechnica.com/arstechnica/technology-lab',
    expectedDomain: 'arstechnica.com',
    tier: 2,
  },
  {
    id: 'venturebeat-ai',
    name: 'VentureBeat AI',
    feedUrl: 'https://venturebeat.com/category/ai/feed/',
    expectedDomain: 'venturebeat.com',
    tier: 2,
  },
  {
    id: 'the-verge-ai',
    name: 'The Verge (AI)',
    feedUrl: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
    expectedDomain: 'theverge.com',
    tier: 2,
  },
  {
    id: 'aws-ml',
    name: 'AWS Machine Learning Blog',
    feedUrl: 'https://aws.amazon.com/blogs/machine-learning/feed/',
    expectedDomain: 'aws.amazon.com',
    tier: 2,
  },
  {
    id: 'bair',
    name: 'Berkeley AI Research (BAIR)',
    feedUrl: 'https://bair.berkeley.edu/blog/feed.xml',
    expectedDomain: 'bair.berkeley.edu',
    tier: 2,
  },
  {
    id: 'techcrunch-ai',
    name: 'TechCrunch AI',
    feedUrl: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    expectedDomain: 'techcrunch.com',
    tier: 2,
  },
  {
    id: 'mit-news-ai',
    name: 'MIT News (AI)',
    feedUrl: 'https://news.mit.edu/rss/topic/artificial-intelligence2',
    expectedDomain: 'news.mit.edu',
    tier: 2,
  },
];
