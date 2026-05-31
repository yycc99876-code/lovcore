import type { Item, LovcoreSpace } from '../types';
import type { CardRow, CardInsert, CardBodyRow, SpaceRow, SpaceInsert } from '../types/database';

// ============================================================
// Card Mappers
// ============================================================

export function dbToCard(row: CardRow, cardBody?: CardBodyRow | null): Item {
  const meta = (row.meta ?? {}) as Record<string, unknown>;
  // Prefer card_bodies table data; fall back to meta.body
  const body = cardBody
    ? dbCardBodyToBody(cardBody)
    : (meta.body as Item['body'] | undefined);

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    summary: row.summary,
    sourceUrl: row.source_url ?? undefined,
    fileSize: row.file_size ?? undefined,
    fileExtension: meta.fileExtension as string | undefined,
    mimeType: meta.mimeType as string | undefined,
    pageCount: row.page_count ?? undefined,
    duration: row.duration ?? undefined,
    thumbnail: row.thumbnail ?? undefined,
    originalFileRef: meta.originalFileRef as string | undefined,
    previewPdfRef: meta.previewPdfRef as string | undefined,
    thumbnailStoragePath: meta.thumbnailStoragePath as string | undefined,
    originalStoragePath: meta.originalStoragePath as string | undefined,
    previewPdfStoragePath: meta.previewPdfStoragePath as string | undefined,
    colorPalette: row.color_palette ?? undefined,
    tags: row.tags,
    noteBgColor: row.note_bg_color ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    keyClaims: row.key_claims ?? (meta.keyClaims as string[] | undefined),
    whyItMatters: row.why_it_matters ?? (meta.whyItMatters as string | undefined),
    clipNote: meta.clipNote as string | undefined,
    assignedSpaceIds: meta.assignedSpaceIds as string[] | undefined,
    suggestedSpaceIds: meta.suggestedSpaceIds as string[] | undefined,
    embedding: meta.embedding as number[] | undefined,
    body,
  };
}

export function cardToDb(item: Item, userId: string): CardInsert {
  return {
    id: item.id,
    user_id: userId,
    type: item.type,
    title: item.title,
    content: item.content,
    summary: item.summary,
    source_url: item.sourceUrl ?? null,
    domain: item.sourceUrl ? extractDomain(item.sourceUrl) : null,
    file_size: item.fileSize ?? null,
    page_count: item.pageCount ?? null,
    duration: item.duration ?? null,
    thumbnail: item.thumbnail ?? null,
    color_palette: item.colorPalette ?? null,
    tags: item.tags,
    note_bg_color: item.noteBgColor ?? null,
    key_claims: item.keyClaims ?? null,
    why_it_matters: item.whyItMatters ?? null,
    status: item.status,
    preview: item.content?.slice(0, 200) ?? null,
    meta: {
      ...(item.clipNote ? { clipNote: item.clipNote } : {}),
      ...(item.assignedSpaceIds?.length ? { assignedSpaceIds: item.assignedSpaceIds } : {}),
      ...(item.suggestedSpaceIds?.length ? { suggestedSpaceIds: item.suggestedSpaceIds } : {}),
      ...(item.fileExtension ? { fileExtension: item.fileExtension } : {}),
      ...(item.mimeType ? { mimeType: item.mimeType } : {}),
      ...(item.originalFileRef ? { originalFileRef: item.originalFileRef } : {}),
      ...(item.previewPdfRef ? { previewPdfRef: item.previewPdfRef } : {}),
      ...(item.thumbnailStoragePath ? { thumbnailStoragePath: item.thumbnailStoragePath } : {}),
      ...(item.originalStoragePath ? { originalStoragePath: item.originalStoragePath } : {}),
      ...(item.previewPdfStoragePath ? { previewPdfStoragePath: item.previewPdfStoragePath } : {}),
      ...(item.embedding?.length ? { embedding: item.embedding } : {}),
      ...(item.body ? { body: item.body } : {}),
    },
  };
}

// ============================================================
// Space Mappers
// ============================================================

export function dbToSpace(row: SpaceRow): LovcoreSpace {
  const rules = (row.rules ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    name: row.name,
    type: row.type === 'manual' ? 'smart' : row.type,
    system: row.system,
    color: row.color ?? undefined,
    description: row.description ?? undefined,
    query: row.query ?? undefined,
    selectedType: (row.selected_type as LovcoreSpace['selectedType']) ?? undefined,
    tags: row.tags,
    ruleText: (rules.ruleText as string) ?? undefined,
    semanticQuery: (rules.semanticQuery as string) ?? undefined,
    suggestedTags: (rules.suggestedTags as string[]) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function spaceToDb(space: LovcoreSpace, userId: string): SpaceInsert {
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
    rules: {
      ...(space.ruleText ? { ruleText: space.ruleText } : {}),
      ...(space.semanticQuery ? { semanticQuery: space.semanticQuery } : {}),
      ...(space.suggestedTags?.length ? { suggestedTags: space.suggestedTags } : {}),
    },
  };
}

// ============================================================
// Helpers
// ============================================================

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// ============================================================
// Card Body Helpers
// ============================================================

export function dbCardBodyToBody(row: CardBodyRow): Item['body'] {
  return {
    kind: 'tiptap',
    json: row.tiptap_json,
    text: row.plain_text,
    html: row.html ?? undefined,
  };
}

export function bodyToCardBody(cardId: string, userId: string, body: NonNullable<Item['body']>) {
  return {
    card_id: cardId,
    user_id: userId,
    tiptap_json: body.json,
    plain_text: body.text,
    html: body.html ?? null,
  };
}
