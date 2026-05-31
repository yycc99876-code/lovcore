/**
 * export-local-vault.ts
 *
 * Converts a browser localStorage JSON export into Supabase-importable
 * NDJSON files. This script does NOT read localStorage directly -
 * you must first export it from the browser console:
 *
 *   const data = {
 *     items: JSON.parse(localStorage.getItem('lovcore_items') || '[]'),
 *     itemVersion: localStorage.getItem('lovcore_items_version'),
 *     spaces: JSON.parse(localStorage.getItem('lovcore_spaces') || '[]'),
 *     spaceVersion: localStorage.getItem('lovcore_spaces_version'),
 *   };
 *   copy(JSON.stringify(data, null, 2));
 *
 * Then paste into a file and pass it as the first argument:
 *
 *   npx tsx scripts/export-local-vault.ts <input.json> <output-dir> --user-id <uuid>
 *
 * Output files are written to the specified output directory.
 *
 * localStorage keys used by Lovcore:
 *   - lovcore_items:       Item[] (LovcoreCard[])       - src/lib/storage.ts
 *   - lovcore_items_version: string (e.g. "phase7-resume-fix") - src/lib/storage.ts
 *   - lovcore_spaces:      LovcoreSpace[]               - src/hooks/useSpaces.ts
 *   - lovcore_spaces_version: string (e.g. "phase2-main-views") - src/hooks/useSpaces.ts
 *   IndexedDB "lovcore-files" store "files": key=itemId, value=Blob - src/lib/fileStore.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// Types (matching src/types.ts LovcoreCard / LovcoreSpace)
// ============================================================

interface LovcoreDocumentBody {
  kind: 'tiptap';
  json: unknown;
  text: string;
  html?: string;
}

interface LovcoreCard {
  id: string;
  type: string;
  title: string;
  content: string;
  body?: LovcoreDocumentBody;
  summary?: string;
  sourceUrl?: string;
  fileSize?: string;
  pageCount?: number;
  duration?: string;
  thumbnail?: string;
  colorPalette?: string[];
  tags?: string[];
  status?: string;
  createdAt?: string;
  noteBgColor?: string;
  keyClaims?: string[];
  whyItMatters?: string;
}

interface LovcoreSpace {
  id: string;
  name: string;
  type: 'default' | 'smart';
  system?: boolean;
  color?: string;
  description?: string;
  query?: string;
  selectedType?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface VaultExport {
  items: LovcoreCard[];
  itemVersion?: string;
  spaces: LovcoreSpace[];
  spaceVersion?: string;
}

// ============================================================
// Output types (matching Supabase schema)
// ============================================================

interface CardRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  preview: string | null;
  content: string;
  summary: string;
  source_url: string | null;
  domain: string | null;
  file_size: string | null;
  page_count: number | null;
  duration: string | null;
  thumbnail: string | null;
  color_palette: string[] | null;
  tags: string[];
  note_bg_color: string | null;
  meta: Record<string, unknown>;
  key_claims: string[] | null;
  why_it_matters: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CardBodyRow {
  card_id: string;
  user_id: string;
  tiptap_json: Record<string, unknown>;
  plain_text: string;
  html: string | null;
}

interface SpaceRow {
  id: string;
  user_id: string;
  name: string;
  type: string;
  system: boolean;
  color: string | null;
  description: string | null;
  query: string | null;
  selected_type: string | null;
  tags: string[];
  rules: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface SpaceCardRow {
  space_id: string;
  card_id: string;
  user_id: string;
  position: number;
}

interface FileManifestRow {
  card_id: string;
  user_id: string;
  original_ref: string;
  mime_type: string;
}

// ============================================================
// Helpers
// ============================================================

function extractDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function deriveMimeType(thumbnail: string | undefined, type: string): string {
  if (thumbnail && thumbnail.startsWith('indexeddb://')) {
    const typeMap: Record<string, string> = {
      image: 'image/jpeg',
      pdf: 'application/pdf',
      video: 'video/mp4',
    };
    return typeMap[type] || 'application/octet-stream';
  }
  return 'application/octet-stream';
}

function writeNdjson(filePath: string, rows: unknown[]): void {
  const content = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  Wrote ${rows.length} rows -> ${filePath}`);
}

// ============================================================
// CLI argument parsing
// ============================================================

function parseArgs(): { inputPath: string; outputDir: string; userId: string } {
  const args = process.argv.slice(2);
  let inputPath: string | undefined;
  let outputDir: string | undefined;
  let userId: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--user-id' && i + 1 < args.length) {
      userId = args[++i];
    } else if (!inputPath) {
      inputPath = args[i];
    } else if (!outputDir) {
      outputDir = args[i];
    }
  }

  if (!inputPath || !userId) {
    console.error(
      'Usage: npx tsx scripts/export-local-vault.ts <input.json> <output-dir> --user-id <uuid>'
    );
    console.error('');
    console.error('  input.json   - JSON file exported from browser localStorage');
    console.error('  output-dir   - Output directory (default: ./exported-vault/)');
    console.error('  --user-id    - Supabase auth user UUID (REQUIRED)');
    process.exit(1);
  }

  // Basic UUID format check
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(userId)) {
    console.error(`Invalid UUID format for --user-id: ${userId}`);
    console.error('Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    process.exit(1);
  }

  return {
    inputPath: path.resolve(inputPath),
    outputDir: path.resolve(outputDir || './exported-vault'),
    userId,
  };
}

// ============================================================
// Main
// ============================================================

function main(): void {
  const { inputPath, outputDir, userId } = parseArgs();

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  // Read and parse input
  const raw = fs.readFileSync(inputPath, 'utf-8');
  let vault: VaultExport;
  try {
    vault = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to parse input JSON: ${err}`);
    process.exit(1);
  }

  console.log(`User ID: ${userId}`);
  console.log(`Loaded ${vault.items?.length ?? 0} items, ${vault.spaces?.length ?? 0} spaces`);
  console.log(`Item version: ${vault.itemVersion ?? 'unknown'}`);
  console.log(`Space version: ${vault.spaceVersion ?? 'unknown'}`);

  const now = new Date().toISOString();

  // ---- cards.json ----
  const cards: CardRow[] = (vault.items || []).map((item) => ({
    id: item.id,
    user_id: userId,
    type: item.type,
    title: item.title || '',
    preview: (item.content || '').slice(0, 200) || null,
    content: item.content || '',
    summary: item.summary || '',
    source_url: item.sourceUrl || null,
    domain: extractDomain(item.sourceUrl),
    file_size: item.fileSize || null,
    page_count: item.pageCount ?? null,
    duration: item.duration || null,
    thumbnail: item.thumbnail || null,
    color_palette: item.colorPalette || null,
    tags: item.tags || [],
    note_bg_color: item.noteBgColor || null,
    meta: {
      ...(item.keyClaims ? { keyClaims: item.keyClaims } : {}),
      ...(item.whyItMatters ? { whyItMatters: item.whyItMatters } : {}),
    },
    key_claims: item.keyClaims || null,
    why_it_matters: item.whyItMatters || null,
    status: item.status || 'ready',
    created_at: item.createdAt || now,
    updated_at: now,
  }));

  // ---- card_bodies.json ----
  const cardBodies: CardBodyRow[] = (vault.items || [])
    .filter((item) => item.body)
    .map((item) => ({
      card_id: item.id,
      user_id: userId,
      tiptap_json: (item.body!.json as Record<string, unknown>) || {},
      plain_text: item.body!.text || '',
      html: item.body!.html || null,
    }));

  // ---- spaces.json ----
  const spaces: SpaceRow[] = (vault.spaces || []).map((space) => ({
    id: space.id,
    user_id: userId,
    name: space.name,
    type: space.type,
    system: space.system || false,
    color: space.color || null,
    description: space.description || null,
    query: space.query || null,
    selected_type: space.selectedType || null,
    tags: space.tags || [],
    rules: {},
    created_at: space.createdAt || now,
    updated_at: space.updatedAt || now,
  }));

  // ---- space_cards.json ----
  // Auto-generated smart spaces: cards are matched by tags at query time,
  // so we only export manually-added cards (not yet supported in current UI).
  // For now, this is empty - smart spaces filter dynamically.
  const spaceCards: SpaceCardRow[] = [];

  // ---- files_manifest.json ----
  // Cards with indexeddb:// thumbnails need their blobs exported separately.
  // This manifest tracks what needs migration.
  const fileManifest: FileManifestRow[] = (vault.items || [])
    .filter((item) => item.thumbnail && item.thumbnail.startsWith('indexeddb://'))
    .map((item) => ({
      card_id: item.id,
      user_id: userId,
      original_ref: item.thumbnail!,
      mime_type: deriveMimeType(item.thumbnail, item.type),
    }));

  // Write output files
  console.log('\nWriting output files:');
  writeNdjson(path.join(outputDir, 'cards.json'), cards);
  writeNdjson(path.join(outputDir, 'card_bodies.json'), cardBodies);
  writeNdjson(path.join(outputDir, 'spaces.json'), spaces);
  writeNdjson(path.join(outputDir, 'space_cards.json'), spaceCards);
  writeNdjson(path.join(outputDir, 'files_manifest.json'), fileManifest);

  console.log(`\nDone! Output in: ${outputDir}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Import cards.json via Supabase Dashboard > Table Editor > cards > Import CSV/JSON');
  console.log('  2. Import card_bodies.json similarly');
  console.log('  3. Import spaces.json');
  console.log(
    '  4. For files: export IndexedDB blobs using browser DevTools, then upload to Supabase Storage'
  );
  console.log('  5. Update card.thumbnail from indexeddb:// refs to Supabase Storage paths');
}

main();
