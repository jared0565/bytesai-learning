import { getCourseBySlug, getCuratedPageBySlug, getDB } from '@/lib/db';
import { isValidSlug } from '@/lib/security';
import {
  buildArticleOgImageData,
  SOCIAL_IMAGE_HEIGHT,
  SOCIAL_IMAGE_WIDTH,
  type ArticleOgImageData,
} from '@/lib/social-meta';
import { getProviderName } from '@/lib/og-image';

const CACHE_LONG = 'public, max-age=86400, s-maxage=604800';
const CACHE_SHORT = 'public, max-age=300';

type Rgb = [number, number, number];

const PALETTES: Record<ArticleOgImageData['accent'], { a: Rgb; b: Rgb; c: Rgb }> = {
  violet: { a: [139, 92, 246], b: [20, 184, 166], c: [15, 23, 42] },
  teal: { a: [20, 184, 166], b: [56, 189, 248], c: [12, 33, 38] },
  amber: { a: [245, 158, 11], b: [139, 92, 246], c: [37, 26, 16] },
  blue: { a: [56, 189, 248], b: [139, 92, 246], c: [12, 24, 44] },
  rose: { a: [251, 113, 133], b: [245, 158, 11], c: [42, 15, 26] },
};

const FONT: Record<string, string[]> = {
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '01100', '01000'],
  '-': ['00000', '00000', '00000', '11110', '00000', '00000', '00000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '/': ['00001', '00010', '00100', '01000', '10000', '00000', '00000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  a: ['00000', '00000', '01110', '00001', '01111', '10001', '01111'],
  b: ['10000', '10000', '10110', '11001', '10001', '10001', '11110'],
  c: ['00000', '00000', '01110', '10001', '10000', '10001', '01110'],
  d: ['00001', '00001', '01101', '10011', '10001', '10001', '01111'],
  e: ['00000', '00000', '01110', '10001', '11111', '10000', '01110'],
  f: ['00110', '01001', '01000', '11100', '01000', '01000', '01000'],
  g: ['00000', '00000', '01111', '10001', '01111', '00001', '01110'],
  h: ['10000', '10000', '10110', '11001', '10001', '10001', '10001'],
  i: ['00100', '00000', '01100', '00100', '00100', '00100', '01110'],
  j: ['00010', '00000', '00110', '00010', '00010', '10010', '01100'],
  k: ['10000', '10000', '10010', '10100', '11000', '10100', '10010'],
  l: ['01100', '00100', '00100', '00100', '00100', '00100', '01110'],
  m: ['00000', '00000', '11010', '10101', '10101', '10101', '10101'],
  n: ['00000', '00000', '10110', '11001', '10001', '10001', '10001'],
  o: ['00000', '00000', '01110', '10001', '10001', '10001', '01110'],
  p: ['00000', '00000', '11110', '10001', '11110', '10000', '10000'],
  q: ['00000', '00000', '01111', '10001', '01111', '00001', '00001'],
  r: ['00000', '00000', '10110', '11001', '10000', '10000', '10000'],
  s: ['00000', '00000', '01111', '10000', '01110', '00001', '11110'],
  t: ['01000', '01000', '11100', '01000', '01000', '01001', '00110'],
  u: ['00000', '00000', '10001', '10001', '10001', '10011', '01101'],
  v: ['00000', '00000', '10001', '10001', '10001', '01010', '00100'],
  w: ['00000', '00000', '10001', '10001', '10101', '10101', '01010'],
  x: ['00000', '00000', '10001', '01010', '00100', '01010', '10001'],
  y: ['00000', '00000', '10001', '10001', '01111', '00001', '01110'],
  z: ['00000', '00000', '11111', '00010', '00100', '01000', '11111'],
};

function parseCategories(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function fallbackData(): ArticleOgImageData {
  return {
    eyebrow: 'BYTESAI LEARNING',
    headline: 'Free AI courses and insights for practical operators',
    summary: 'Curated learning paths, course picks, and applied AI analysis.',
    callout: 'Built for learners who want clear next steps, not noisy lists.',
    badge: 'AI LEARNING',
    accent: 'violet',
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    clamp(a[0] + (b[0] - a[0]) * t),
    clamp(a[1] + (b[1] - a[1]) * t),
    clamp(a[2] + (b[2] - a[2]) * t),
  ];
}

function setPixel(buffer: Uint8Array, width: number, x: number, y: number, color: Rgb, alpha = 1) {
  if (x < 0 || y < 0 || x >= width || y >= SOCIAL_IMAGE_HEIGHT) return;
  const offset = (y * width + x) * 3;
  buffer[offset] = clamp(color[0] * alpha + buffer[offset] * (1 - alpha));
  buffer[offset + 1] = clamp(color[1] * alpha + buffer[offset + 1] * (1 - alpha));
  buffer[offset + 2] = clamp(color[2] * alpha + buffer[offset + 2] * (1 - alpha));
}

function fillRect(buffer: Uint8Array, width: number, x: number, y: number, w: number, h: number, color: Rgb, alpha = 1) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(buffer, width, xx, yy, color, alpha);
  }
}

function drawCircle(buffer: Uint8Array, width: number, cx: number, cy: number, radius: number, color: Rgb, alpha = 1) {
  const r2 = radius * radius;
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      const d2 = (x - cx) ** 2 + (y - cy) ** 2;
      if (d2 <= r2) setPixel(buffer, width, x, y, color, alpha * (1 - d2 / r2));
    }
  }
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s.,:/&+-]/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateAtWord(value: string, maxLength: number): string {
  const cleaned = normalizeText(value);
  if (cleaned.length <= maxLength) return cleaned;
  const clipped = cleaned.slice(0, maxLength - 3);
  const lastSpace = clipped.lastIndexOf(' ');
  const base = lastSpace > maxLength * 0.55 ? clipped.slice(0, lastSpace) : clipped;
  return `${base.trimEnd()}...`;
}

function wrapText(value: string, maxChars: number, maxLines: number): string[] {
  const words = normalizeText(value).split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && lines.join(' ').length < words.join(' ').length) {
    lines[maxLines - 1] = truncateAtWord(lines[maxLines - 1], Math.max(10, lines[maxLines - 1].length - 2));
  }
  return lines.length ? lines : ['BYTESAI LEARNING'];
}

function drawGlyph(buffer: Uint8Array, width: number, glyph: string, x: number, y: number, scale: number, color: Rgb) {
  const rows = FONT[glyph] ?? FONT['?'];
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row].length; col++) {
      if (rows[row][col] !== '1') continue;
      fillRect(buffer, width, x + col * scale, y + row * scale, scale, scale, color);
    }
  }
}

function drawText(buffer: Uint8Array, width: number, text: string, x: number, y: number, scale: number, color: Rgb) {
  const normalized = normalizeText(text);
  let cursor = x;
  for (const char of normalized) {
    drawGlyph(buffer, width, char, cursor, y, scale, color);
    cursor += 6 * scale;
  }
}

function drawLines(buffer: Uint8Array, width: number, lines: string[], x: number, y: number, scale: number, color: Rgb) {
  const lineHeight = 9 * scale;
  lines.forEach((line, index) => drawText(buffer, width, line, x, y + index * lineHeight, scale, color));
}

function renderCard(data: ArticleOgImageData): Uint8Array {
  const width = SOCIAL_IMAGE_WIDTH;
  const height = SOCIAL_IMAGE_HEIGHT;
  const pixels = new Uint8Array(width * height * 3);
  const palette = PALETTES[data.accent] ?? PALETTES.violet;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sweep = (x / width) * 0.62 + (y / height) * 0.38;
      const glow = Math.max(0, 1 - Math.hypot((x - 980) / 560, (y - 110) / 360));
      const base = mix(palette.c, [2, 6, 23], sweep);
      const color = mix(base, palette.a, glow * 0.24);
      const offset = (y * width + x) * 3;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
    }
  }

  drawCircle(pixels, width, 1040, 90, 260, palette.a, 0.22);
  drawCircle(pixels, width, 78, 590, 250, palette.b, 0.18);
  fillRect(pixels, width, 0, 0, width, 8, palette.a);
  fillRect(pixels, width, 0, 8, width, 3, palette.b);

  fillRect(pixels, width, 64, 42, 42, 42, palette.a);
  drawText(pixels, width, 'B', 77, 52, 4, [248, 250, 252]);
  drawText(pixels, width, 'BYTESAI', 122, 54, 3, [248, 250, 252]);
  drawText(pixels, width, 'LEARNING', 276, 54, 3, palette.b);

  fillRect(pixels, width, 930, 42, 206, 36, palette.a, 0.2);
  drawText(pixels, width, truncateAtWord(data.badge || 'AI INSIGHT', 18), 958, 54, 2, [226, 232, 240]);

  fillRect(pixels, width, 64, 136, 8, 8, palette.b);
  drawText(pixels, width, truncateAtWord(data.eyebrow || 'CURATED INSIGHT', 30), 86, 130, 2, palette.b);
  fillRect(pixels, width, 64, 158, 144, 3, palette.b, 0.75);

  const titleLines = wrapText(data.headline, 24, 3);
  drawLines(pixels, width, titleLines, 64, 210, 7, [248, 250, 252]);

  const summaryLines = wrapText(data.summary || data.callout || 'Practical AI signal for operators and builders.', 34, 2);
  drawLines(pixels, width, summaryLines, 64, 456, 4, [203, 213, 225]);

  fillRect(pixels, width, 64, 536, 5, 50, palette.b);
  drawText(pixels, width, 'WHY IT MATTERS', 84, 538, 2, palette.b);
  const calloutLines = wrapText(data.callout || data.summary || '', 48, 2);
  drawLines(pixels, width, calloutLines, 84, 566, 3, [226, 232, 240]);

  for (let i = 0; i < 18; i++) {
    fillRect(pixels, width, 780 + i * 18, 170 + i * 7, 120, 10, i % 2 ? palette.b : palette.a, 0.25);
  }

  fillRect(pixels, width, 64, 608, 1072, 1, [255, 255, 255], 0.09);
  drawText(pixels, width, 'CURATED INSIGHT - NO SIGNUP REQUIRED', 64, 616, 2, [100, 116, 139]);
  drawText(pixels, width, 'LEARN.BYTESAI.UK', 954, 616, 2, [100, 116, 139]);

  return encodePngRgb(width, height, pixels);
}

function pngResponse(data: ArticleOgImageData, cacheControl = CACHE_LONG): Response {
  const png = renderCard(data);
  const body = new ArrayBuffer(png.byteLength);
  new Uint8Array(body).set(png);
  return new Response(body, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(png.byteLength),
      'Cache-Control': cacheControl,
      'Content-Disposition': 'inline; filename="bytesai-og.png"',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const type = searchParams.get('type');

  if (type === 'quiz') {
    const score = Number.parseInt(searchParams.get('score') ?? '0', 10);
    const total = Number.parseInt(searchParams.get('total') ?? '5', 10);
    return pngResponse({
      eyebrow: 'QUIZ RESULT',
      headline: `I scored ${score}/${total} on the BytesAI AI quiz`,
      summary: 'Test your AI knowledge and find what to learn next.',
      callout: 'A quick way to spot your strongest AI topics and your next learning gap.',
      badge: 'AI QUIZ',
      accent: score / Math.max(total, 1) >= 0.8 ? 'teal' : 'amber',
    });
  }

  if (!slug || !isValidSlug(slug)) return pngResponse(fallbackData(), CACHE_SHORT);

  try {
    const db = await getDB();
    if (!db) throw new Error('no db');

    if (type === 'course') {
      const course = await getCourseBySlug(db, slug).catch(() => null);
      if (!course) return pngResponse(fallbackData(), CACHE_SHORT);
      const provider = getProviderName(course.provider_id);
      return pngResponse(buildArticleOgImageData({
        title: course.og_title ?? course.title,
        summary: course.og_description ?? course.snippet,
        whyItMatters: `${provider} ${course.category ?? ''} ${course.level ?? ''}`,
        categories: course.category ? [course.category] : ['AI Course'],
      }));
    }

    const article = await getCuratedPageBySlug(db, slug).catch(() => null);
    if (!article) return pngResponse(fallbackData(), CACHE_SHORT);

    return pngResponse(buildArticleOgImageData({
      title: article.og_title ?? article.title,
      summary: article.og_description ?? article.summary,
      whyItMatters: article.why_it_matters,
      categories: parseCategories(article.categories_json),
      stored: article.og_image_data_json,
    }));
  } catch {
    return pngResponse(fallbackData(), CACHE_SHORT);
  }
}

function encodePngRgb(width: number, height: number, rgb: Uint8Array): Uint8Array {
  const stride = width * 3;
  const scanlines = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const dst = y * (stride + 1);
    scanlines[dst] = 0;
    scanlines.set(rgb.subarray(y * stride, (y + 1) * stride), dst + 1);
  }

  return concatBytes([
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr(width, height, 2)),
    pngChunk('IDAT', zlibStore(scanlines)),
    pngChunk('IEND', new Uint8Array(0)),
  ]);
}

function ihdr(width: number, height: number, colorType: number): Uint8Array {
  const data = new Uint8Array(13);
  const view = new DataView(data.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  data[8] = 8;
  data[9] = colorType;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return data;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(concatBytes([typeBytes, data])));
  return out;
}

function zlibStore(data: Uint8Array): Uint8Array {
  const blocks: Uint8Array[] = [Uint8Array.from([0x78, 0x01])];
  for (let offset = 0; offset < data.length; offset += 65535) {
    const chunk = data.subarray(offset, Math.min(offset + 65535, data.length));
    const header = new Uint8Array(5);
    header[0] = offset + chunk.length >= data.length ? 1 : 0;
    header[1] = chunk.length & 255;
    header[2] = (chunk.length >>> 8) & 255;
    const nlen = (~chunk.length) & 0xffff;
    header[3] = nlen & 255;
    header[4] = (nlen >>> 8) & 255;
    blocks.push(header, chunk);
  }
  const adler = new Uint8Array(4);
  new DataView(adler.buffer).setUint32(0, adler32(data));
  blocks.push(adler);
  return concatBytes(blocks);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const byte of data) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

const CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let c = index;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
