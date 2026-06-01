export type LovcoreCardType = 'image' | 'link' | 'article' | 'note' | 'pdf' | 'video' | 'quote' | 'code' | 'audio';

export type LovcoreCardStatus = 'uploading' | 'analyzing' | 'ready' | 'failed';

export interface LovcoreDocumentBody {
  kind: 'tiptap';
  json: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  text: string;
  html?: string;
}

export interface LovcoreCard {
  id: string;
  type: LovcoreCardType;
  title: string;
  content: string; // The primary searchable body text
  body?: LovcoreDocumentBody; // Rich editor content
  summary: string; // AI generated summary
  sourceUrl?: string; // Original URL if scraped from web
  originalFileName?: string; // User-visible original filename
  fileSize?: string; // Display file size (e.g. "1.2 MB")
  fileSizeBytes?: number; // Raw original file size in bytes
  fileExtension?: string; // Original uploaded extension (e.g. "pdf", "docx")
  mimeType?: string; // Original uploaded MIME type
  pageCount?: number; // Page count for PDFs
  duration?: string; // Duration for videos (e.g. "05:14")
  thumbnail?: string; // Image src url (can be unsplash URLs or fallback screenshots)
  originalFileRef?: string; // IndexedDB reference for the original uploaded file
  previewPdfRef?: string; // IndexedDB reference for a converted PDF preview
  thumbnailStoragePath?: string; // Supabase Storage path for cross-refresh/device thumbnail recovery
  originalStoragePath?: string; // Supabase Storage path for the original uploaded file
  previewPdfStoragePath?: string; // Supabase Storage path for a converted PDF preview
  fileSyncStatus?: 'failed'; // Cloud original-file sync status
  fileSyncError?: string; // Human-readable file sync failure
  colorPalette?: string[]; // Array of hex strings (e.g. ["#1A1A18", "#E6E6E3"])
  tags: string[]; // List of tags associated with item
  status: IngestionStatus;
  createdAt: string; // ISO timestamp
  noteBgColor?: string; // Color palette for custom note backgrounds (e.g. "#F0EAE1")
  keyClaims?: string[]; // Key claims parsed by AI
  whyItMatters?: string; // Why it matters section for AI/business context
  suggestedSpaceIds?: string[]; // AI-suggested space associations
  assignedSpaceIds?: string[]; // Explicit space assignments (manual)
  embedding?: number[]; // Semantic embedding vector for search
  clipNote?: string; // User note from browser extension clip
}

export type ItemType = LovcoreCardType;
export type IngestionStatus = LovcoreCardStatus;
export type Item = LovcoreCard;

export type CardTypeFilter = LovcoreCardType | 'all';

export interface SearchFilters {
  query: string;
  selectedType: CardTypeFilter;
  activeTags: string[];
}

export interface LovcoreSpace {
  id: string;
  name: string;
  type: 'default' | 'smart';
  system?: boolean;
  color?: string;
  description?: string;
  query?: string;
  selectedType?: CardTypeFilter;
  tags?: string[];
  ruleText?: string;       // Natural language rule for smart spaces
  semanticQuery?: string;  // Embedding-ready query for semantic matching
  suggestedTags?: string[]; // AI-suggested tags from rule parsing
  createdAt: string;
  updatedAt: string;
}
