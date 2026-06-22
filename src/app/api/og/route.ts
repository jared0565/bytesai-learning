import { getDB, getCourseBySlug, getCuratedPageBySlug } from '@/lib/db';
import { isValidSlug } from '@/lib/security';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { RESVG_WASM_BASE64 } from '@/lib/resvg-wasm-inline';

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

function wrapText(text: string, maxChars: number, maxLines = 3): string[] {
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
  return lines.slice(0, maxLines);
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + '…';
}

// ── Article OG image ──────────────────────────────────────────────────────────
function buildArticleSvg(title: string, summary: string, callout?: string): string {
  const titleLines = wrapText(title, 42, 4);
  const titleFontSize = titleLines.length >= 3 ? 40 : title.length > 50 ? 44 : 52;
  const titleLineHeight = titleFontSize * 1.22;
  const titleY = 210;

  const titleTspans = titleLines.map((line, i) =>
    `<tspan x="64" dy="${i === 0 ? 0 : titleLineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  const snippetY = titleY + titleLines.length * titleLineHeight + 32;
  const displaySnippet = summary.length > 110 ? truncateAtWord(summary, 110) : summary;

  // "Why it matters" callout — positioned dynamically below the snippet
  const calloutStartY = Math.round(snippetY + (displaySnippet ? 36 : 8) + 18);
  const availableForCallout = 548 - calloutStartY;
  const maxCalloutLines = availableForCallout >= 108 ? 3 : availableForCallout >= 82 ? 2 : 1;
  const showCallout = !!(callout && callout.length >= 50 && availableForCallout >= 56);

  let calloutSvg = '';
  if (showCallout && callout) {
    const calloutLines = wrapText(truncateAtWord(callout, 220), 85, maxCalloutLines);
    const calloutHeight = 22 + calloutLines.length * 26;
    calloutSvg = `
  <!-- Why it matters callout -->
  <rect x="64" y="${calloutStartY}" width="3" height="${calloutHeight}" rx="1.5" fill="url(#accent)"/>
  <text x="82" y="${calloutStartY + 14}" fill="#a78bfa" font-size="11" font-weight="700" font-family="Inter,system-ui,sans-serif" letter-spacing="1.5">WHY IT MATTERS</text>
  ${calloutLines.map((line, i) => `<text x="82" y="${calloutStartY + 38 + i * 26}" fill="#e2e8f0" font-size="17" font-family="Inter,system-ui,sans-serif">${escapeXml(line)}</text>`).join('\n  ')}`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="45%" stop-color="#1a1240"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#14b8a6"/>
    </linearGradient>
    <radialGradient id="glow" cx="80%" cy="20%" r="45%">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="15%" cy="80%" r="35%">
      <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect width="1200" height="630" fill="url(#glow2)"/>

  <!-- Top accent bar -->
  <rect width="1200" height="4" fill="url(#accent)"/>

  <!-- Subtle grid -->
  ${Array.from({ length: 20 }, (_, i) => `<line x1="${i * 60}" y1="0" x2="${i * 60}" y2="630" stroke="rgba(255,255,255,0.025)" stroke-width="1"/>`).join('')}
  ${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 60}" x2="1200" y2="${i * 60}" stroke="rgba(255,255,255,0.025)" stroke-width="1"/>`).join('')}

  <!-- Logo — top left -->
  <rect x="64" y="28" width="36" height="36" rx="8" fill="url(#accent)"/>
  <text x="66" y="52" fill="white" font-size="18" font-weight="900" font-family="Inter,system-ui,sans-serif">B</text>
  <text x="110" y="52" fill="white" font-size="20" font-weight="800" font-family="Inter,system-ui,sans-serif">BytesAI</text>
  <text x="222" y="52" fill="#a78bfa" font-size="20" font-weight="800" font-family="Inter,system-ui,sans-serif">Learning</text>

  <!-- AI Insight badge — top right -->
  <rect x="1028" y="24" width="108" height="32" rx="16" fill="rgba(139,92,246,0.2)" stroke="rgba(139,92,246,0.5)" stroke-width="1.5"/>
  <text x="1082" y="44" text-anchor="middle" fill="#c4b5fd" font-size="13" font-weight="800" font-family="Inter,system-ui,sans-serif" letter-spacing="0.5">AI INSIGHT</text>

  <!-- Category line -->
  <circle cx="74" cy="144" r="4" fill="#14b8a6"/>
  <text x="86" y="148" fill="#14b8a6" font-size="14" font-weight="700" font-family="Inter,system-ui,sans-serif" letter-spacing="1.5">CURATED INSIGHT · BYTESAI LEARNING</text>

  <!-- Decorative accent line under category -->
  <rect x="64" y="160" width="120" height="2" rx="1" fill="url(#accent)" opacity="0.5"/>

  <!-- Title -->
  <text y="${titleY}" fill="white" font-size="${titleFontSize}" font-weight="800" font-family="Inter,system-ui,sans-serif" letter-spacing="-0.5">
    ${titleTspans}
  </text>

  <!-- Summary snippet -->
  ${displaySnippet ? `<text x="64" y="${snippetY}" fill="#94a3b8" font-size="20" font-family="Inter,system-ui,sans-serif" font-weight="400">
    ${escapeXml(displaySnippet)}
  </text>` : ''}
${calloutSvg}

  <!-- Bottom decoration -->
  <rect x="64" y="580" width="1072" height="1" fill="rgba(255,255,255,0.06)"/>

  <!-- Bottom: free label -->
  <rect x="64" y="596" width="56" height="22" rx="11" fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.4)" stroke-width="1"/>
  <text x="92" y="611" text-anchor="middle" fill="#34d399" font-size="11" font-weight="700" font-family="Inter,system-ui,sans-serif">Free</text>

  <text x="130" y="612" fill="#475569" font-size="13" font-weight="500" font-family="Inter,system-ui,sans-serif">Insight · No signup required</text>

  <!-- Bottom: URL -->
  <text x="1136" y="612" text-anchor="end" fill="#475569" font-size="15" font-weight="500" font-family="monospace">learn.bytesai.uk</text>
</svg>`;
}

// ── Course OG image (original) ────────────────────────────────────────────────
function buildCourseSvg(
  title: string, provider: string, category: string,
  level: string, isAlison: boolean, snippet: string
): string {
  const accentColor = CATEGORY_COLORS[category] ?? '#4f6ef7';
  const displaySnippet = snippet.length > 100 ? snippet.slice(0, 97) + '...' : snippet;
  const titleLines = wrapText(title, 38);
  const titleFontSize = titleLines.length > 2 ? 42 : title.length > 40 ? 44 : 52;
  const titleLineHeight = titleFontSize * 1.2;

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

  const titleY = 180;
  const titleTspans = titleLines.map((line, i) =>
    `<tspan x="64" dy="${i === 0 ? 0 : titleLineHeight}">${escapeXml(line)}</tspan>`
  ).join('');
  const snippetY = titleY + titleLines.length * titleLineHeight + 24;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
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
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect width="1200" height="4" fill="url(#accent)"/>
  ${Array.from({ length: 20 }, (_, i) => `<line x1="${i * 60}" y1="0" x2="${i * 60}" y2="630" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>`).join('')}
  ${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 60}" x2="1200" y2="${i * 60}" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>`).join('')}
  <rect x="64" y="28" width="36" height="36" rx="8" fill="url(#accent)"/>
  <text x="66" y="52" fill="white" font-size="18" font-weight="900" font-family="Inter,system-ui,sans-serif">B</text>
  <text x="110" y="52" fill="white" font-size="20" font-weight="800" font-family="Inter,system-ui,sans-serif">BytesAI</text>
  <text x="222" y="52" fill="#4f6ef7" font-size="20" font-weight="800" font-family="Inter,system-ui,sans-serif">Learning</text>
  ${badges.join('\n  ')}
  ${category ? `<circle cx="74" cy="140" r="4" fill="${accentColor}"/><text x="86" y="144" fill="${accentColor}" font-size="14" font-weight="700" font-family="Inter,system-ui,sans-serif" text-transform="uppercase" letter-spacing="1">${escapeXml(category.toUpperCase())}</text>` : ''}
  <text y="${titleY}" fill="white" font-size="${titleFontSize}" font-weight="800" font-family="Inter,system-ui,sans-serif" letter-spacing="-0.5">
    ${titleTspans}
  </text>
  ${displaySnippet ? `<text x="64" y="${snippetY}" fill="#94a3b8" font-size="19" font-family="Inter,system-ui,sans-serif">${escapeXml(displaySnippet)}</text>` : ''}
  ${provider ? `<rect x="64" y="555" width="32" height="32" rx="8" fill="${accentColor}" opacity="0.6"/><text x="106" y="576" fill="#cbd5e1" font-size="18" font-weight="600" font-family="Inter,system-ui,sans-serif">${escapeXml(provider)}</text>` : ''}
  <text x="1136" y="600" text-anchor="end" fill="#475569" font-size="15" font-weight="500" font-family="monospace">learn.bytesai.uk</text>
</svg>`;
}

// ── Quiz OG image ────────────────────────────────────────────────────────────
function buildQuizSvg(score: number, total: number, difficulty: string): string {
  const DIFFICULTY_COLORS: Record<string, string> = {
    beginner: '#22c55e',
    intermediate: '#f59e0b',
    advanced: '#ef4444',
  };
  const accent = DIFFICULTY_COLORS[difficulty.toLowerCase()] ?? '#4f6ef7';
  const label = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  const percentage = Math.round((score / total) * 100);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </linearGradient>
    <radialGradient id="glow" cx="85%" cy="15%" r="40%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect width="1200" height="4" fill="url(#accent)"/>
  ${Array.from({ length: 20 }, (_, i) => `<line x1="${i * 60}" y1="0" x2="${i * 60}" y2="630" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>`).join('')}
  ${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 60}" x2="1200" y2="${i * 60}" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>`).join('')}

  <rect x="64" y="28" width="36" height="36" rx="8" fill="url(#accent)"/>
  <text x="66" y="52" fill="white" font-size="18" font-weight="900" font-family="Inter,system-ui,sans-serif">B</text>
  <text x="110" y="52" fill="white" font-size="20" font-weight="800" font-family="Inter,system-ui,sans-serif">BytesAI</text>
  <text x="222" y="52" fill="#4f6ef7" font-size="20" font-weight="800" font-family="Inter,system-ui,sans-serif">Learning</text>

  <rect x="64" y="72" width="120" height="28" rx="14" fill="${accent}20" stroke="${accent}60" stroke-width="1"/>
  <text x="124" y="90" text-anchor="middle" fill="${accent}" font-size="12" font-weight="700" font-family="Inter,system-ui,sans-serif">${label}</text>

  <circle cx="74" cy="160" r="4" fill="${accent}"/>
  <text x="86" y="164" fill="${accent}" font-size="14" font-weight="700" font-family="Inter,system-ui,sans-serif" letter-spacing="1">AI KNOWLEDGE QUIZ</text>

  <text x="64" y="240" fill="white" font-size="72" font-weight="800" font-family="Inter,system-ui,sans-serif" letter-spacing="-1">
    ${score}/${total}
  </text>

  <text x="64" y="290" fill="#94a3b8" font-size="22" font-family="Inter,system-ui,sans-serif">
    ${percentage}% — Test your knowledge at learn.bytesai.uk/quiz
  </text>

  <rect x="64" y="580" width="1072" height="1" fill="rgba(255,255,255,0.06)"/>
  <text x="64" y="612" fill="#475569" font-size="15" font-weight="500" font-family="monospace">learn.bytesai.uk/quiz</text>
</svg>`;
}

async function renderSvgToPng(svg: string): Promise<Response> {
  try {
    const wasmBytes = Uint8Array.from(atob(RESVG_WASM_BASE64), c => c.charCodeAt(0));
    await initWasm(wasmBytes);
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1200 },
      font: {
        fontFiles: [],
        loadSystemFonts: true,
        defaultFontFamily: 'Inter,system-ui,sans-serif',
      },
    });
    const png = resvg.render().asPng();
    return new Response(png.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  } catch (err) {
    // Fallback to SVG if WASM rasterisation fails in any environment
    console.error('resvg render failed:', err);
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const type = searchParams.get('type');
  const requestedFormat = searchParams.get('format');
  const forcePng = requestedFormat !== 'svg';

  // Quiz result image: ?type=quiz&score=4&total=5&difficulty=advanced
  if (type === 'quiz') {
    const score = parseInt(searchParams.get('score') ?? '0', 10);
    const total = parseInt(searchParams.get('total') ?? '5', 10);
    const difficulty = searchParams.get('difficulty') ?? 'beginner';
    const svg = buildQuizSvg(score, total, difficulty);
    if (forcePng) return renderSvgToPng(svg);
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    });
  }

  if (!slug || !isValidSlug(slug)) {
    return new Response('Missing or invalid slug', { status: 400 });
  }

  try {
    const db = await getDB();
    if (!db) throw new Error('no db');

    if (type === 'article') {
      const article = await getCuratedPageBySlug(db, slug).catch(() => null);
      const snippet = article?.summary ?? '';
      const why = article?.why_it_matters ?? '';
      const svg = buildArticleSvg(
        article?.title ?? 'AI Insight',
        snippet || why,
        snippet ? why : '',
      );
      if (forcePng) return renderSvgToPng(svg);
      return new Response(svg, {
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
      });
    }

    const course = await getCourseBySlug(db, slug).catch(() => null);
    if (course) {
      const svg = buildCourseSvg(
        course.title,
        getProviderName(course.provider_id),
        course.category ?? '',
        course.level ?? '',
        course.is_alison === 1,
        course.snippet ?? ''
      );
      if (forcePng) return renderSvgToPng(svg);
      return new Response(svg, {
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
      });
    }

    const article = await getCuratedPageBySlug(db, slug).catch(() => null);
    const snippet = article?.summary ?? '';
    const why = article?.why_it_matters ?? '';
    const svg = buildArticleSvg(
      article?.title ?? 'AI Insight',
      snippet || why,
      snippet ? why : '',
    );
    if (forcePng) return renderSvgToPng(svg);
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    });

  } catch {
    const svg = buildArticleSvg('BytesAI Learning', 'Free AI courses and insights curated for the modern learner.');
    if (forcePng) return renderSvgToPng(svg);
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=300' },
    });
  }
}
