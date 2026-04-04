import { getDB, getCourseBySlug } from '@/lib/db';
import { isValidSlug } from '@/lib/security';

const PROVIDER_NAMES: Record<string, string> = {
  'prov-microsoft': 'Microsoft', 'prov-google': 'Google', 'prov-anthropic': 'Anthropic',
  'prov-nvidia': 'NVIDIA', 'prov-deeplearning-ai': 'DeepLearning.AI', 'prov-hugging-face': 'Hugging Face',
  'prov-alison': 'Alison', 'prov-aws': 'AWS', 'prov-ibm': 'IBM', 'prov-stanford': 'Stanford',
  'prov-harvard': 'Harvard', 'prov-berkeley': 'UC Berkeley', 'prov-linux-foundation': 'Linux Foundation',
  'prov-meta': 'Meta', 'prov-langchain': 'LangChain', 'prov-fast-ai': 'fast.ai',
};

function getProviderName(id: string | null): string {
  if (!id) return '';
  return PROVIDER_NAMES[id] ?? id.replace('prov-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const CATEGORY_COLORS: Record<string, string> = {
  'AI Foundations': '#4f6ef7',
  'LLMs / Generative AI': '#0ea5e9',
  'AI Agents': '#8b5cf6',
  'Prompt Engineering': '#f59e0b',
  'Governance / Responsible AI': '#10b981',
  'Data / ML': '#3b82f6',
  'Programming Foundations': '#22c55e',
};

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Wrap text into lines that fit within a max character width
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3); // max 3 lines
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug || !isValidSlug(slug)) {
    return new Response('Missing or invalid slug', { status: 400 });
  }

  let title = 'Free AI Course';
  let provider = '';
  let category = '';
  let level = '';
  let isAlison = false;
  let snippet = '';

  try {
    const db = await getDB();
    if (db) {
      const course = await getCourseBySlug(db, slug);
      if (course) {
        title = course.title;
        provider = getProviderName(course.provider_id);
        category = course.category ?? '';
        level = course.level ?? '';
        isAlison = course.is_alison === 1;
        snippet = course.snippet ?? '';
      }
    }
  } catch {
    // Fall back to defaults
  }

  const accentColor = CATEGORY_COLORS[category] ?? '#4f6ef7';
  const displaySnippet = snippet.length > 100 ? snippet.slice(0, 97) + '...' : snippet;

  // Wrap title into multiple lines
  const titleLines = wrapText(title, 38);
  const titleFontSize = titleLines.length > 2 ? 42 : title.length > 40 ? 44 : 52;
  const titleLineHeight = titleFontSize * 1.2;

  // Build badges
  const badges: string[] = [];
  let badgeX = 64;
  if (isAlison) {
    badges.push(`<rect x="${badgeX}" y="72" width="72" height="28" rx="14" fill="#f59e0b"/><text x="${badgeX + 36}" y="90" text-anchor="middle" fill="white" font-size="12" font-weight="700" font-family="Inter,system-ui,sans-serif">Alison</text>`);
    badgeX += 82;
  }
  badges.push(`<rect x="${badgeX}" y="72" width="56" height="28" rx="14" fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.5)" stroke-width="1"/><text x="${badgeX + 28}" y="90" text-anchor="middle" fill="#34d399" font-size="12" font-weight="700" font-family="Inter,system-ui,sans-serif">Free</text>`);
  badgeX += 66;
  if (level) {
    const lw = Math.max(level.length * 8 + 20, 60);
    badges.push(`<rect x="${badgeX}" y="72" width="${lw}" height="28" rx="14" fill="${accentColor}20" stroke="${accentColor}50" stroke-width="1"/><text x="${badgeX + lw / 2}" y="90" text-anchor="middle" fill="${accentColor}" font-size="12" font-weight="700" font-family="Inter,system-ui,sans-serif">${escapeXml(level)}</text>`);
  }

  // Build title tspans
  const titleY = 180;
  const titleTspans = titleLines.map((line, i) =>
    `<tspan x="64" dy="${i === 0 ? 0 : titleLineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  const snippetY = titleY + titleLines.length * titleLineHeight + 24;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accentColor}"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </linearGradient>
    <radialGradient id="glow" cx="85%" cy="15%" r="40%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Top accent bar -->
  <rect width="1200" height="4" fill="url(#accent)"/>

  <!-- Subtle grid -->
  ${Array.from({ length: 20 }, (_, i) => `<line x1="${i * 60}" y1="0" x2="${i * 60}" y2="630" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>`).join('')}
  ${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 60}" x2="1200" y2="${i * 60}" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>`).join('')}

  <!-- Logo -->
  <rect x="64" y="28" width="36" height="36" rx="8" fill="url(#accent)"/>
  <text x="66" y="52" fill="white" font-size="18" font-weight="900" font-family="Inter,system-ui,sans-serif">B</text>
  <text x="110" y="52" fill="white" font-size="20" font-weight="800" font-family="Inter,system-ui,sans-serif">BytesAI</text>
  <text x="222" y="52" fill="#4f6ef7" font-size="20" font-weight="800" font-family="Inter,system-ui,sans-serif">Learning</text>

  <!-- Badges -->
  ${badges.join('\n  ')}

  <!-- Category pill -->
  ${category ? `
  <circle cx="74" cy="140" r="4" fill="${accentColor}"/>
  <text x="86" y="144" fill="${accentColor}" font-size="14" font-weight="700" font-family="Inter,system-ui,sans-serif" text-transform="uppercase" letter-spacing="1">${escapeXml(category.toUpperCase())}</text>
  ` : ''}

  <!-- Title -->
  <text y="${titleY}" fill="white" font-size="${titleFontSize}" font-weight="800" font-family="Inter,system-ui,sans-serif" letter-spacing="-0.5">
    ${titleTspans}
  </text>

  <!-- Snippet -->
  ${displaySnippet ? `<text x="64" y="${snippetY}" fill="#94a3b8" font-size="19" font-family="Inter,system-ui,sans-serif">
    ${escapeXml(displaySnippet)}
  </text>` : ''}

  <!-- Bottom: Provider -->
  ${provider ? `
  <rect x="64" y="555" width="32" height="32" rx="8" fill="${accentColor}" opacity="0.6"/>
  <text x="106" y="576" fill="#cbd5e1" font-size="18" font-weight="600" font-family="Inter,system-ui,sans-serif">${escapeXml(provider)}</text>
  ` : ''}

  <!-- Bottom: URL -->
  <text x="1136" y="600" text-anchor="end" fill="#475569" font-size="15" font-weight="500" font-family="monospace">learn.bytesai.uk</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    },
  });
}
