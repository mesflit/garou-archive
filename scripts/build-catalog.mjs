import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const inputPath = path.resolve('media.txt');
const outputDir = path.resolve('public');
const outputPath = path.join(outputDir, 'media.json');

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.bmp', '.svg']);
const videoExtensions = new Set(['.mp4', '.webm', '.ogv', '.ogg', '.mov', '.m4v']);

function detectType(rawUrl) {
  try {
    const pathname = new URL(rawUrl).pathname.toLowerCase();
    const extension = path.extname(pathname);
    if (imageExtensions.has(extension)) return 'image';
    if (videoExtensions.has(extension)) return 'video';
  } catch {
    // Invalid URLs are reported by the parser below.
  }
  return 'unknown';
}

function parseLine(line, lineNumber) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  // Format: URL "Display title". Titles may contain spaces.
  const match = trimmed.match(/^(https?:\/\/\S+)\s+"([^"]+)"\s*$/);
  if (!match) {
    console.warn(`media.txt:${lineNumber}: skipped. Expected: https://... "Display title"`);
    return null;
  }

  const [, url, title] = match;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
  } catch {
    console.warn(`media.txt:${lineNumber}: skipped because the URL is invalid.`);
    return null;
  }

  const type = detectType(url);
  if (type === 'unknown') {
    console.warn(`media.txt:${lineNumber}: file type is not recognizable from its URL. Add a direct URL ending in an image/video extension.`);
    return null;
  }

  const slug = title.toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return {
    id: `${slug || 'media'}-${lineNumber}`,
    type,
    title,
    url,
    tags: title.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
    line: lineNumber
  };
}

const text = await readFile(inputPath, 'utf8').catch((error) => {
  if (error.code === 'ENOENT') {
    console.error('media.txt was not found. Create it in the repository root.');
    process.exit(1);
  }
  throw error;
});

const items = text.split(/\r?\n/).map(parseLine).filter(Boolean);
await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), items }, null, 2) + '\n');
console.log(`Catalog generated: ${items.length} media item(s) → public/media.json`);
