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

const PALETTES: Record<ArticleOgImageData['accent'], { a: Rgb; b: Rgb; c: Rgb }> = {
  violet: { a: [139, 92, 246], b: [20, 184, 166], c: [15, 23, 42] },
  teal: { a: [20, 184, 166], b: [56, 189, 248], c: [12, 33, 38] },
  amber: { a: [245, 158, 11], b: [139, 92, 246], c: [37, 26, 16] },
  blue: { a: [56, 189, 248], b: [139, 92, 246], c: [12, 24, 44] },
  rose: { a: [251, 113, 133], b: [245, 158, 11], c: [42, 15, 26] },
};

type Rgb = [number, number, number];

function parseCategories(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function blend(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function setPixel(buffer: Uint8Array, width: number, x: number, y: number, color: Rgb, alpha = 255) {
  if (x < 0 || y < 0 || x >= width || y >= SOCIAL_IMAGE_HEIGHT) return;
  const offset = (y * width + x) * 4;
  const inv = 255 - alpha;
  buffer[offset] = Math.round((color[0] * alpha + buffer[offset] * inv) / 255);
  buffer[offset + 1] = Math.round((color[1] * alpha + buffer[offset + 1] * inv) / 255);
  buffer[offset + 2] = Math.round((color[2] * alpha + buffer[offset + 2] * inv) / 255);
  buffer[offset + 3] = 255;
}

function fillRect(buffer: Uint8Array, width: number, x: number, y: number, w: number, h: number, color: Rgb, alpha = 255) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      setPixel(buffer, width, xx, yy, color, alpha);
    }
  }
}

function drawPattern(buffer: Uint8Array, width: number, seed: number, palette: { a: Rgb; b: Rgb; c: Rgb }) {
  for (let i = 0; i < 34; i++) {
    const x = 690 + ((seed >>> (i % 16)) + i * 47) % 420;
    const y = 110 + ((seed >>> ((i + 5) % 16)) + i * 31) % 360;
    const w = 16 + ((seed >>> (i % 12)) % 72);
    const h = 4 + ((seed >>> ((i + 3) % 12)) % 22);
    fillRect(buffer, width, x, y, w, h, i % 2 === 0 ? palette.a : palette.b, 58);
  }
}

function drawBrandMarks(buffer: Uint8Array, width: number, palette: { a: Rgb; b: Rgb }) {
  fillRect(buffer, width, 64, 48, 42, 42, palette.a, 255);
  fillRect(buffer, width, 116, 58, 132, 9, [248, 250, 252], 235);
  fillRect(buffer, width, 116, 76, 104, 8, palette.b, 225);
  fillRect(buffer, width, 64, 144, 132, 4, palette.b, 230);
  fillRect(buffer, width, 64, 580, 1072, 2, [148, 163, 184], 44);
  fillRect(buffer, width, 64, 598, 78, 20, palette.b, 190);
  fillRect(buffer, width, 1030, 44, 106, 26, palette.a, 150);
}

function renderCard(data: ArticleOgImageData): Uint8Array {
  const width = SOCIAL_IMAGE_WIDTH;
  const height = SOCIAL_IMAGE_HEIGHT;
  const palette = PALETTES[data.accent] ?? PALETTES.violet;
  const pixels = new Uint8Array(width * height * 4);
  const seed = hashString(`${data.headline}|${data.summary}|${data.badge}`);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const radial = Math.max(0, 1 - Math.hypot((x - 940) / 620, (y - 130) / 430));
      const sweep = (x / width) * 0.55 + (y / height) * 0.45;
      const base = blend(palette.c, [11, 16, 32], sweep);
      const glow = blend(base, palette.a, radial * 0.34);
      const noise = ((x * 13 + y * 7 + seed) % 19) - 9;
      const offset = (y * width + x) * 4;
      pixels[offset] = Math.max(0, Math.min(255, glow[0] + noise));
      pixels[offset + 1] = Math.max(0, Math.min(255, glow[1] + noise));
      pixels[offset + 2] = Math.max(0, Math.min(255, glow[2] + noise));
      pixels[offset + 3] = 255;
    }
  }

  fillRect(pixels, width, 0, 0, width, 6, palette.a, 255);
  fillRect(pixels, width, 0, 6, width, 2, palette.b, 255);
  drawBrandMarks(pixels, width, palette);
  drawPattern(pixels, width, seed, palette);

  const blocks = Math.min(18, Math.max(8, Math.ceil(data.headline.length / 6)));
  for (let i = 0; i < blocks; i++) {
    const blockWidth = 52 + ((seed >>> (i % 15)) % 128);
    const y = 214 + Math.floor(i / 4) * 54;
    const x = 64 + (i % 4) * 202;
    fillRect(pixels, width, x, y, blockWidth, 28, [248, 250, 252], 215);
  }

  const summaryBlocks = Math.min(7, Math.max(3, Math.ceil(data.summary.length / 24)));
  for (let i = 0; i < summaryBlocks; i++) {
    fillRect(pixels, width, 64 + i * 126, 452, 82 + ((seed >>> (i % 13)) % 64), 12, [203, 213, 225], 130);
  }

  fillRect(pixels, width, 64, 506, 4, 52, palette.b, 230);
  fillRect(pixels, width, 84, 512, 620, 10, [226, 232, 240], 140);
  fillRect(pixels, width, 84, 536, 460, 10, [226, 232, 240], 100);

  return encodePng(width, height, pixels);
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
      return pngResponse(buildArticleOgImageData({
        title: course.og_title ?? course.title,
        summary: course.og_description ?? course.snippet,
        whyItMatters: `${getProviderName(course.provider_id)} ${course.category ?? ''} ${course.level ?? ''}`,
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

function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const scanlines = new Uint8Array((width + 1) * height);
  for (let y = 0; y < height; y++) {
    const dst = y * (width + 1);
    scanlines[dst] = 0;
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      scanlines[dst + 1 + x] = paletteIndex(rgba[src], rgba[src + 1], rgba[src + 2]);
    }
  }

  const idat = zlibStore(scanlines);
  const palette = buildPalette();
  return concatBytes([
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr(width, height, 3)),
    pngChunk('PLTE', palette),
    pngChunk('IDAT', idat),
    pngChunk('IEND', new Uint8Array(0)),
  ]);
}

function paletteIndex(r: number, g: number, b: number): number {
  const ri = Math.min(5, Math.round(r / 51));
  const gi = Math.min(5, Math.round(g / 51));
  const bi = Math.min(5, Math.round(b / 51));
  return ri * 36 + gi * 6 + bi;
}

function buildPalette(): Uint8Array {
  const palette = new Uint8Array(216 * 3);
  let offset = 0;
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        palette[offset++] = r * 51;
        palette[offset++] = g * 51;
        palette[offset++] = b * 51;
      }
    }
  }
  return palette;
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
