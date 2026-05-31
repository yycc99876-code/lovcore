export type LovcoreCardType = 'image' | 'link' | 'article' | 'note' | 'pdf' | 'video';

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
  fileSize?: string; // Display file size (e.g. "1.2 MB")
  pageCount?: number; // Page count for PDFs
  duration?: string; // Duration for videos (e.g. "05:14")
  thumbnail?: string; // Image src url (can be unsplash URLs or fallback screenshots)
  colorPalette?: string[]; // Array of hex strings (e.g. ["#1A1A18", "#E6E6E3"])
  tags: string[]; // List of tags associated with item
  status: IngestionStatus;
  createdAt: string; // ISO timestamp
  noteBgColor?: string; // Color palette for custom note backgrounds (e.g. "#F0EAE1")
  keyClaims?: string[]; // Key claims parsed by AI
  whyItMatters?: string; // Why it matters section for AI/business context
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
  createdAt: string;
  updatedAt: string;
}
