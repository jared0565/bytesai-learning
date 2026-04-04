import { getDB } from '@/lib/db';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://learn.bytesai.uk';

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/courses`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/providers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/curated`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/books`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/lectures`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/privacy-policy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/terms-of-service`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/affiliate-disclosure`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/accessibility`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const db = await getDB();
  if (!db) return staticPages;

  try {
    const [courses, providers, curated] = await Promise.all([
      db.prepare("SELECT slug, updated_at FROM courses WHERE published_status = 'published' ORDER BY updated_at DESC LIMIT 500").all<{ slug: string; updated_at: string }>(),
      db.prepare("SELECT slug, updated_at FROM providers ORDER BY name ASC").all<{ slug: string; updated_at: string }>(),
      db.prepare("SELECT slug, updated_at FROM curated_pages WHERE published_status = 'published' ORDER BY updated_at DESC").all<{ slug: string; updated_at: string }>(),
    ]);

    const coursePages: MetadataRoute.Sitemap = courses.results.map(c => ({
      url: `${base}/courses/${c.slug}`,
      lastModified: new Date(c.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const providerPages: MetadataRoute.Sitemap = providers.results.map(p => ({
      url: `${base}/providers/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    const curatedPages: MetadataRoute.Sitemap = curated.results.map(c => ({
      url: `${base}/curated/${c.slug}`,
      lastModified: new Date(c.updated_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [...staticPages, ...coursePages, ...providerPages, ...curatedPages];
  } catch {
    return staticPages;
  }
}
