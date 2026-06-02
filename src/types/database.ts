/**
 * Lovcore Supabase Database Types (Draft)
 *
 * These types mirror the PostgreSQL schema defined in docs/supabase/schema.sql.
 * They are NOT auto-generated — hand-maintained until Supabase CLI is integrated.
 *
 * Naming convention:
 *   - Database columns: snake_case (PostgreSQL convention)
 *   - Row/Insert/Update types use snake_case to match DB
 *   - Convenience aliases provided for common patterns
 */

// ============================================================
// ENUM TYPES
// ============================================================

export type CardType =
  | 'image'
  | 'link'
  | 'article'
  | 'note'
  | 'pdf'
  | 'video'
  | 'quote'
  | 'code'
  | 'audio'
  | 'file';

export type CardStatus = 'uploading' | 'analyzing' | 'ready' | 'failed';

export type SpaceType = 'default' | 'smart' | 'manual';

export type AiEventType =
  | 'autocomplete'
  | 'ghost_correct'
  | 'rewrite'
  | 'transcribe'
  | 'summarize'
  | 'analyze_card'
  | 'scrape_url';

export type IngestionJobType = 'url_scrape' | 'file_upload' | 'ai_analyze' | 'search_index';

export type IngestionJobStatus = 'pending' | 'running' | 'completed' | 'failed';

// ============================================================
// DOCUMENT BODY (stored as JSONB in card_bodies.tiptap_json)
// ============================================================

export interface TiptapDocumentBody {
  kind: 'tiptap';
  json: Record<string, unknown>;
  text: string;
  html?: string;
}

// ============================================================
// TABLE ROW TYPES (matches DB columns exactly)
// ============================================================

export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardRow {
  id: string;
  user_id: string;
  type: CardType;
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
  status: CardStatus;
  // embedding: number[]; // future: pgvector
  created_at: string;
  updated_at: string;
}

export interface CardBodyRow {
  card_id: string;
  user_id: string;
  tiptap_json: Record<string, unknown>;
  plain_text: string;
  html: string | null;
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
  rules: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SpaceCardRow {
  space_id: string;
  card_id: string;
  user_id: string;
  position: number;
  added_at: string;
}

export interface FileRow {
  id: string;
  user_id: string;
  card_id: string | null;
  storage_path: string;
  original_name: string | null;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  kind: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiEventRow {
  id: string;
  user_id: string;
  card_id: string | null;
  event_type: AiEventType;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  latency_ms: number | null;
  error: string | null;
  created_at: string;
}

export interface IngestionJobRow {
  id: string;
  user_id: string;
  card_id: string | null;
  job_type: IngestionJobType;
  status: IngestionJobStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsRow {
  user_id: string;
  theme: string;
  language: string;
  ai_model: string | null;
  editor_config: Record<string, unknown>;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// INSERT TYPES (omit auto-generated fields)
// ============================================================

export type ProfileInsert = Omit<ProfileRow, 'created_at' | 'updated_at'>;

export type CardInsert = Omit<CardRow, 'created_at' | 'updated_at'>;

export type CardBodyInsert = Omit<CardBodyRow, 'created_at' | 'updated_at'>;

export type SpaceInsert = Omit<SpaceRow, 'created_at' | 'updated_at'>;

export type SpaceCardInsert = Omit<SpaceCardRow, 'added_at'>;

export type FileInsert = Omit<FileRow, 'id' | 'created_at' | 'updated_at'>;

export type AiEventInsert = Omit<AiEventRow, 'id' | 'created_at'>;

export type IngestionJobInsert = Omit<IngestionJobRow, 'id' | 'created_at' | 'updated_at'>;

export type UserSettingsInsert = Omit<UserSettingsRow, 'created_at' | 'updated_at'>;

// ============================================================
// UPDATE TYPES (all fields optional except user_id)
// ============================================================

export type CardUpdate = Partial<Omit<CardRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type CardBodyUpdate = Partial<Omit<CardBodyRow, 'card_id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type SpaceUpdate = Partial<Omit<SpaceRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type FileUpdate = Partial<Omit<FileRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type IngestionJobUpdate = Partial<Omit<IngestionJobRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type UserSettingsUpdate = Partial<Omit<UserSettingsRow, 'user_id' | 'created_at' | 'updated_at'>>;

// ============================================================
// DATABASE INTERFACE (Supabase client generic shape)
// ============================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
      };
      cards: {
        Row: CardRow;
        Insert: CardInsert;
        Update: CardUpdate;
      };
      card_bodies: {
        Row: CardBodyRow;
        Insert: CardBodyInsert;
        Update: CardBodyUpdate;
      };
      spaces: {
        Row: SpaceRow;
        Insert: SpaceInsert;
        Update: SpaceUpdate;
      };
      space_cards: {
        Row: SpaceCardRow;
        Insert: SpaceCardInsert;
        Update: Partial<SpaceCardInsert>;
      };
      files: {
        Row: FileRow;
        Insert: FileInsert;
        Update: FileUpdate;
      };
      ai_events: {
        Row: AiEventRow;
        Insert: AiEventInsert;
        Update: Partial<AiEventInsert>;
      };
      ingestion_jobs: {
        Row: IngestionJobRow;
        Insert: IngestionJobInsert;
        Update: IngestionJobUpdate;
      };
      user_settings: {
        Row: UserSettingsRow;
        Insert: UserSettingsInsert;
        Update: UserSettingsUpdate;
      };
    };
  };
}
