/**
 * Lovcore Supabase Database Types
 *
 * These types mirror the PostgreSQL schema and provide type-safe
 * interfaces for Supabase client operations.
 *
 * Naming convention:
 *   - Database columns: snake_case (PostgreSQL convention)
 *   - App-level types: camelCase (TypeScript convention)
 *   - Mapping functions convert between the two
 */

// ============================================================
// DATABASE ROW TYPES (snake_case, matches PostgreSQL columns)
// ============================================================

export interface CardRow {
  id: string;
  user_id: string;
  type: CardType;
  title: string;
  content: string;
  body: DocumentBody | null;
  summary: string;
  source_url: string | null;
  file_size: string | null;
  page_count: number | null;
  duration: string | null;
  thumbnail: string | null;
  color_palette: string[] | null;
  tags: string[];
  note_bg_color: string | null;
  key_claims: string[] | null;
  why_it_matters: string | null;
  status: CardStatus;
  created_at: string;
  updated_at: string;
}

export interface SpaceRow {
  id: string;
  user_id: string;
  name: string;
  type: SpaceType;
  system: boolean;
  color: string | null;
  description: string | null;
  query: string | null;
  selected_type: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// ============================================================
// ENUM TYPES
// ============================================================

export type CardType = 'image' | 'link' | 'article' | 'note' | 'pdf' | 'video';

export type CardStatus = 'uploading' | 'analyzing' | 'ready' | 'failed';

export type SpaceType = 'default' | 'smart';

// ============================================================
// DOCUMENT BODY (stored as JSONB)
// ============================================================

export interface DocumentBody {
  kind: 'tiptap';
  json: Record<string, unknown>; // Tiptap JSON document
  text: string;
  html?: string;
}

// ============================================================
// APP-LEVEL TYPES (camelCase, for use in React components)
// These match the existing LovcoreCard / LovcoreSpace interfaces.
// ============================================================

export interface Card {
  id: string;
  type: CardType;
  title: string;
  content: string;
  body?: DocumentBody;
  summary: string;
  sourceUrl?: string;
  fileSize?: string;
  pageCount?: number;
  duration?: string;
  thumbnail?: string;
  colorPalette?: string[];
  tags: string[];
  noteBgColor?: string;
  keyClaims?: string[];
  whyItMatters?: string;
  status: CardStatus;
  createdAt: string;
}

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  system?: boolean;
  color?: string;
  description?: string;
  query?: string;
  selectedType?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// MAPPING FUNCTIONS
// Convert between DB rows (snake_case) and app types (camelCase)
// ============================================================

export function mapCardRowToCard(row: CardRow): Card {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    body: row.body ?? undefined,
    summary: row.summary,
    sourceUrl: row.source_url ?? undefined,
    fileSize: row.file_size ?? undefined,
    pageCount: row.page_count ?? undefined,
    duration: row.duration ?? undefined,
    thumbnail: row.thumbnail ?? undefined,
    colorPalette: row.color_palette ?? undefined,
    tags: row.tags,
    noteBgColor: row.note_bg_color ?? undefined,
    keyClaims: row.key_claims ?? undefined,
    whyItMatters: row.why_it_matters ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapCardToCardRow(card: Card, userId: string): Omit<CardRow, 'created_at' | 'updated_at'> {
  return {
    id: card.id,
    user_id: userId,
    type: card.type,
    title: card.title,
    content: card.content,
    body: card.body ?? null,
    summary: card.summary,
    source_url: card.sourceUrl ?? null,
    file_size: card.fileSize ?? null,
    page_count: card.pageCount ?? null,
    duration: card.duration ?? null,
    thumbnail: card.thumbnail ?? null,
    color_palette: card.colorPalette ?? null,
    tags: card.tags,
    note_bg_color: card.noteBgColor ?? null,
    key_claims: card.keyClaims ?? null,
    why_it_matters: card.whyItMatters ?? null,
    status: card.status,
  };
}

export function mapSpaceRowToSpace(row: SpaceRow): Space {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    system: row.system,
    color: row.color ?? undefined,
    description: row.description ?? undefined,
    query: row.query ?? undefined,
    selectedType: row.selected_type ?? undefined,
    tags: row.tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSpaceToSpaceRow(space: Space, userId: string): Omit<SpaceRow, 'created_at' | 'updated_at'> {
  return {
    id: space.id,
    user_id: userId,
    name: space.name,
    type: space.type,
    system: space.system ?? false,
    color: space.color ?? null,
    description: space.description ?? null,
    query: space.query ?? null,
    selected_type: space.selectedType ?? null,
    tags: space.tags ?? [],
  };
}
