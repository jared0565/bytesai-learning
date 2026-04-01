// Course ranking — weighted popularity score
// ranking_score = (recent_views_30d * 0.45) + (unique_learners_30d * 0.30) + (starts_30d * 0.15) + (completion_rate * 0.10)

export interface RankableItem {
  recent_views_30d: number;
  unique_learners_30d: number;
  starts_30d: number;
  completion_rate: number;
  featured_priority: number;
  is_alison: number;
  published_status: string;
}

export function computeRankingScore(item: RankableItem): number {
  return (
    item.recent_views_30d * 0.45 +
    item.unique_learners_30d * 0.30 +
    item.starts_30d * 0.15 +
    item.completion_rate * 0.10
  );
}

/** Sort courses by ranking score descending */
export function sortByRankingScore<T extends RankableItem>(items: T[]): T[] {
  return [...items].sort((a, b) => computeRankingScore(b) - computeRankingScore(a));
}

/** Featured sort: editorial priority first, then ranking score */
export function sortByFeaturedPriority<T extends RankableItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (b.featured_priority !== a.featured_priority) return b.featured_priority - a.featured_priority;
    return computeRankingScore(b) - computeRankingScore(a);
  });
}

/** Categories with display labels */
export const CATEGORIES = [
  { slug: 'ai-foundations', label: 'AI Foundations', db: 'AI Foundations' },
  { slug: 'llms-generative-ai', label: 'LLMs & Generative AI', db: 'LLMs / Generative AI' },
  { slug: 'agents', label: 'Agents', db: 'Agents' },
  { slug: 'data-ml', label: 'Data & ML', db: 'Data / ML' },
  { slug: 'prompt-engineering', label: 'Prompt Engineering', db: 'Prompt Engineering' },
  { slug: 'governance-responsible-ai', label: 'Governance & Responsible AI', db: 'Governance / Responsible AI' },
  { slug: 'programming-foundations', label: 'Programming Foundations', db: 'Programming Foundations' },
  { slug: 'books', label: 'Books & Reading', db: 'Books / Reading Sources' },
  { slug: 'lectures', label: 'Lectures & Talks', db: 'Other Sources / Lectures' },
] as const;

export type CategorySlug = typeof CATEGORIES[number]['slug'];

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find(c => c.slug === slug) ?? null;
}

export function getCategoryByDb(dbValue: string) {
  return CATEGORIES.find(c => c.db === dbValue) ?? null;
}

export const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Beginner to intermediate', 'Intermediate to advanced', 'Beginner to advanced'] as const;

export const FORMATS = ['video', 'article', 'mixed', 'interactive'] as const;

export const ACCESS_MODELS = ['free to learn', 'free to audit', 'public materials'] as const;
