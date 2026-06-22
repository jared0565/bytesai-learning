import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { readFileSync } from 'fs';

const TOKEN = process.env.BYTESAI_CLI_TOKEN;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://learn.bytesai.uk';
const OUT_DIR = new URL('../public/og-images/', import.meta.url);

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function wrapText(text, maxChars, maxLines = 3) {
  const words = text.split(' ');
  const lines = [];
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

function truncateAtWord(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + '…';
}

function buildArticleSvg(title, summary, callout) {
  const titleLines = wrapText(title, 42, 4);
  const titleFontSize = titleLines.length >= 3 ? 40 : title.length > 50 ? 44 : 52;
  const titleLineHeight = titleFontSize * 1.22;
  const titleY = 210;

  const titleTspans = titleLines.map((line, i) =>
    `<tspan x="64" dy="${i === 0 ? 0 : titleLineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  const snippetY = titleY + titleLines.length * titleLineHeight + 32;
  const displaySnippet = summary.length > 110 ? truncateAtWord(summary, 110) : summary;

  const calloutStartY = Math.round(snippetY + (displaySnippet ? 36 : 8) + 18);
  const availableForCallout = 548 - calloutStartY;
  const maxCalloutLines = availableForCallout >= 108 ? 3 : availableForCallout >= 82 ? 2 : 1;
  const showCallout = !!(callout && callout.length >= 50 && availableForCallout >= 56);

  let calloutSvg = '';
  if (showCallout && callout) {
    const calloutLines = wrapText(truncateAtWord(callout, 220), 85, maxCalloutLines);
    const calloutHeight = 22 + calloutLines.length * 26;
    calloutSvg = `
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

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect width="1200" height="630" fill="url(#glow2)"/>

  <rect width="1200" height="4" fill="url(#accent)"/>

  ${Array.from({ length: 20 }, (_, i) => `<line x1="${i * 60}" y1="0" x2="${i * 60}" y2="630" stroke="rgba(255,255,255,0.025)" stroke-width="1"/>`).join('')}
  ${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 60}" x2="1200" y2="${i * 60}" stroke="rgba(255,255,255,0.025)" stroke-width="1"/>`).join('')}

  <rect x="64" y="28" width="36" height="36" rx="8" fill="url(#accent)"/>
  <text x="66" y="52" fill="white" font-size="18" font-weight="900" font-family="Inter,system-ui,sans-serif">B</text>
  <text x="110" y="52" fill="white" font-size="20" font-weight="800" font-family="Inter,system-ui,sans-serif">BytesAI</text>
  <text x="222" y="52" fill="#a78bfa" font-size="20" font-weight="800" font-family="Inter,system-ui,sans-serif">Learning</text>

  <rect x="1028" y="24" width="108" height="32" rx="16" fill="rgba(139,92,246,0.2)" stroke="rgba(139,92,246,0.5)" stroke-width="1.5"/>
  <text x="1082" y="44" text-anchor="middle" fill="#c4b5fd" font-size="13" font-weight="800" font-family="Inter,system-ui,sans-serif" letter-spacing="0.5">AI INSIGHT</text>

  <circle cx="74" cy="144" r="4" fill="#14b8a6"/>
  <text x="86" y="148" fill="#14b8a6" font-size="14" font-weight="700" font-family="Inter,system-ui,sans-serif" letter-spacing="1.5">CURATED INSIGHT · BYTESAI LEARNING</text>

  <rect x="64" y="160" width="120" height="2" rx="1" fill="url(#accent)" opacity="0.5"/>

  <text y="${titleY}" fill="white" font-size="${titleFontSize}" font-weight="800" font-family="Inter,system-ui,sans-serif" letter-spacing="-0.5">
    ${titleTspans}
  </text>

  ${displaySnippet ? `<text x="64" y="${snippetY}" fill="#94a3b8" font-size="20" font-family="Inter,system-ui,sans-serif" font-weight="400">
    ${escapeXml(displaySnippet)}
  </text>` : ''}
${calloutSvg}

  <rect x="64" y="580" width="1072" height="1" fill="rgba(255,255,255,0.06)"/>

  <rect x="64" y="596" width="56" height="22" rx="11" fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.4)" stroke-width="1"/>
  <text x="92" y="611" text-anchor="middle" fill="#34d399" font-size="11" font-weight="700" font-family="Inter,system-ui,sans-serif">Free</text>

  <text x="130" y="612" fill="#475569" font-size="13" font-weight="500" font-family="Inter,system-ui,sans-serif">Insight · No signup required</text>

  <text x="1136" y="612" text-anchor="end" fill="#475569" font-size="15" font-weight="500" font-family="monospace">learn.bytesai.uk</text>
</svg>`;
}

async function renderSvgToPng(svg) {
  const wasmPath = new URL('../node_modules/@resvg/resvg-wasm/index_bg.wasm', import.meta.url);
  const wasm = readFileSync(wasmPath);
  await initWasm(wasm);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: {
      fontFiles: [],
      loadSystemFonts: true,
      defaultFontFamily: 'Inter,system-ui,sans-serif',
    },
  });
  return resvg.render().asPng();
}

async function fetchPublishedPages() {
  if (!TOKEN) {
    throw new Error('BYTESAI_CLI_TOKEN is not set. Set it to the long-lived admin token.');
  }

  const res = await fetch(`${SITE_URL}/api/admin/curated`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to list curated pages: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const pages = data?.pages ?? [];
  return pages.filter(p => p.published_status === 'published');
}

async function generateForPage(page) {
  const slug = page.slug;
  if (!slug) return { ok: false, slug, error: 'missing slug' };

  try {
    const svg = buildArticleSvg(
      page.title ?? 'AI Insight',
      page.summary ?? page.why_it_matters ?? '',
      page.summary ? (page.why_it_matters ?? '') : '',
    );
    const png = await renderSvgToPng(svg);
    const outPath = new URL(`${slug}.png`, OUT_DIR);
    writeFileSync(outPath, png);
    return { ok: true, slug, bytes: png.byteLength };
  } catch (err) {
    return { ok: false, slug, error: err.message };
  }
}

async function main() {
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  const pages = await fetchPublishedPages();
  console.log(`Generating OG PNGs for ${pages.length} published articles…`);

  const results = [];
  for (const page of pages) {
    const result = await generateForPage(page);
    results.push(result);
    if (result.ok) {
      console.log(`✓ ${result.slug} (${result.bytes} bytes)`);
    } else {
      console.error(`✗ ${result.slug}: ${result.error}`);
    }
  }

  const ok = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`\nDone: ${ok} generated, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
