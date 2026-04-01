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
    id: 'anthropic',
    name: 'Anthropic',
    feedUrl: 'https://www.anthropic.com/rss.xml',
    expectedDomain: 'anthropic.com',
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
  {
    id: 'microsoft-ai',
    name: 'Microsoft AI Blog',
    feedUrl: 'https://blogs.microsoft.com/ai/feed/',
    expectedDomain: 'blogs.microsoft.com',
    tier: 1,
  },
  {
    id: 'meta-ai',
    name: 'Meta AI',
    feedUrl: 'https://ai.meta.com/blog/feed/',
    expectedDomain: 'ai.meta.com',
    tier: 1,
  },

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
    id: 'wired-ai',
    name: 'Wired (AI)',
    feedUrl: 'https://www.wired.com/feed/tag/artificial-intelligence/latest/rss',
    expectedDomain: 'wired.com',
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
];
