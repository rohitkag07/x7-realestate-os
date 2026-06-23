/**
 * Batch-render every entry in content-calendar.json into MP4 files.
 * Run: npx tsx src/utils/renderBatch.ts
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import calendar from '../data/content-calendar.json' assert { type: 'json' };
import projects from '../data/projects.json' assert { type: 'json' };

interface Entry { id: string; composition: string; projectKey?: string; props?: Record<string, unknown>; }
const OUTPUT_DIR = path.resolve('./out');

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const bundled = await bundle({ entryPoint: path.resolve('./src/index.ts') });
  for (const entry of calendar as Entry[]) {
    const projectData = (projects as Record<string, Record<string, unknown>>)[entry.projectKey ?? 'krishna-greens'] ?? {};
    const props = { ...projectData, ...(entry.props ?? {}) };
    const composition = await selectComposition({ serveUrl: bundled, id: entry.composition, inputProps: props });
    const outPath = path.join(OUTPUT_DIR, `${entry.id}_${entry.composition}.mp4`);
    console.log(`→ ${entry.id} (${entry.composition})`);
    await renderMedia({ composition, serveUrl: bundled, codec: 'h264', outputLocation: outPath, inputProps: props });
    console.log(`  ✓ ${outPath}`);
  }
  console.log('done.');
}
main().catch((e) => { console.error(e); process.exit(1); });
