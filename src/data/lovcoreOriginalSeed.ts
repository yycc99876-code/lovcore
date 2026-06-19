import type { Item, LovcoreSpace } from '../types';

export const LOVCORE_ORIGINAL_SPACE_SLUG = 'lovcore-original';

const ASSET_BASE = '/seed/lovcore-original';

interface SeedImage {
  slug: string;
  file: string;
  title: string;
  summary: string;
  tags: string[];
  palette: string[];
}

const folioImages: SeedImage[] = [
  {
    slug: 'chatgpt-original-01',
    file: 'chatgpt-original-01-v2.webp',
    title: 'Citrus wall study',
    summary: 'A warm visual reference of citrus branches, terracotta wall texture, and late-afternoon shadow.',
    tags: ['lovcore-original', 'image', 'chatgpt', 'citrus', 'light-study'],
    palette: ['#2D2116', '#B75D31', '#E0A246', '#6F6B2D'],
  },
  {
    slug: 'chatgpt-original-02',
    file: 'chatgpt-original-02-v2.webp',
    title: 'Porcelain pear still life',
    summary: 'A quiet still-life image of a pear on porcelain, soft cloth folds, and window-cast light.',
    tags: ['lovcore-original', 'image', 'chatgpt', 'still-life', 'soft-light'],
    palette: ['#2B251E', '#D6BC79', '#EEE8D8', '#8A7E68'],
  },
  {
    slug: 'chatgpt-original-03',
    file: 'chatgpt-original-03.webp',
    title: 'Nocturne specimen plate',
    summary: 'A quiet specimen-style composition with moth forms, shadow, and archival warmth.',
    tags: ['lovcore-original', 'image', 'chatgpt', 'moth', 'archive'],
    palette: ['#14120F', '#8E7655', '#D8C29C', '#5B574C'],
  },
  {
    slug: 'chatgpt-original-04',
    file: 'chatgpt-original-04.webp',
    title: 'Soft wing archive',
    summary: 'A soft natural-history image built around wing silhouettes and muted paper tones.',
    tags: ['lovcore-original', 'image', 'chatgpt', 'archive', 'wings'],
    palette: ['#1C1916', '#B28F60', '#E2CFAB', '#6F705F'],
  },
  {
    slug: 'chatgpt-original-05',
    file: 'chatgpt-original-05.webp',
    title: 'Natural paper collage',
    summary: 'A handmade collage feeling: pressed forms, warm paper grain, and quiet organic detail.',
    tags: ['lovcore-original', 'image', 'chatgpt', 'collage', 'paper'],
    palette: ['#221B15', '#C29E69', '#E8D8B8', '#81684A'],
  },
  {
    slug: 'chatgpt-original-06',
    file: 'chatgpt-original-06.webp',
    title: 'Amber field notes',
    summary: 'A compact visual note with amber tones, specimen fragments, and tactile texture.',
    tags: ['lovcore-original', 'image', 'chatgpt', 'field-notes', 'amber'],
    palette: ['#1A1713', '#C78D42', '#E2C187', '#635647'],
  },
  {
    slug: 'chatgpt-original-07',
    file: 'chatgpt-original-07.webp',
    title: 'Collected wing fragments',
    summary: 'An archival arrangement of wing fragments and organic marks for visual reference.',
    tags: ['lovcore-original', 'image', 'chatgpt', 'specimen', 'reference'],
    palette: ['#171511', '#A56E3C', '#D6B783', '#71614E'],
  },
];

const stackOnlyImages: SeedImage[] = [
  {
    slug: 'butterfly-wing-detail',
    file: 'butterfly-wing-detail.webp',
    title: 'Butterfly wing detail texture',
    summary: 'A macro reference for wing structure, color gradients, and fragile natural geometry.',
    tags: ['lovcore-original', 'image', 'butterfly', 'texture'],
    palette: ['#111716', '#E0A24C', '#2C6B83', '#EEDCB9'],
  },
  {
    slug: 'handmade-paper-nature-collage',
    file: 'handmade-paper-nature-collage.webp',
    title: 'Handmade paper nature collage',
    summary: 'A warm paper collage reference with layered botanical forms and handmade texture.',
    tags: ['lovcore-original', 'image', 'paper', 'collage'],
    palette: ['#211913', '#B7834F', '#E8D8B8', '#81684A'],
  },
  {
    slug: 'moth-specimen-display',
    file: 'moth-specimen-display.webp',
    title: 'Moth specimen display',
    summary: 'A natural-history display image with moth specimens, dark contrast, and museum atmosphere.',
    tags: ['lovcore-original', 'image', 'moth', 'specimen'],
    palette: ['#141210', '#8B7052', '#D7C09A', '#514D42'],
  },
];

const removedStarterSlugs = ['zhou-guoliang-pdf'];

function seedId(userId: string, suffix: string) {
  return `seed-${userId}-${suffix}`;
}

function createImageItem(userId: string, spaceId: string, image: SeedImage, index: number): Item {
  return {
    id: seedId(userId, image.slug),
    type: 'image',
    title: image.title,
    content: `${image.title}. ${image.summary}`,
    summary: image.summary,
    thumbnail: `${ASSET_BASE}/${image.file}`,
    originalFileRef: `${ASSET_BASE}/${image.file}`,
    colorPalette: image.palette,
    tags: image.tags,
    status: 'ready',
    createdAt: new Date(Date.UTC(2026, 5, 9, 8, 50 - index)).toISOString(),
    assignedSpaceIds: image.slug.startsWith('chatgpt-original') ? [spaceId] : undefined,
  };
}

function normalizedArray(value: string[] | undefined) {
  return JSON.stringify(value ?? []);
}

function starterRepairChanged(before: Item, after: Item): boolean {
  return before.title !== after.title
    || before.content !== after.content
    || before.summary !== after.summary
    || before.thumbnail !== after.thumbnail
    || before.originalFileName !== after.originalFileName
    || before.fileSize !== after.fileSize
    || before.fileSizeBytes !== after.fileSizeBytes
    || before.fileExtension !== after.fileExtension
    || before.mimeType !== after.mimeType
    || before.pageCount !== after.pageCount
    || before.originalFileRef !== after.originalFileRef
    || before.previewPdfRef !== after.previewPdfRef
    || before.whyItMatters !== after.whyItMatters
    || normalizedArray(before.colorPalette) !== normalizedArray(after.colorPalette)
    || normalizedArray(before.keyClaims) !== normalizedArray(after.keyClaims)
    || normalizedArray(before.tags) !== normalizedArray(after.tags)
    || normalizedArray(before.assignedSpaceIds) !== normalizedArray(after.assignedSpaceIds);
}

export function createLovcoreOriginalSpace(userId: string): LovcoreSpace {
  const now = '2026-06-09T08:50:00.000Z';

  return {
    id: seedId(userId, LOVCORE_ORIGINAL_SPACE_SLUG),
    name: 'lovcore original',
    type: 'smart',
    color: '#d6a55c',
    description: 'A starter folio of original visual references prepared for Lovcore.',
    selectedType: 'all',
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createLovcoreOriginalItems(userId: string): Item[] {
  const spaceId = createLovcoreOriginalSpace(userId).id;
  const imageCards = [...folioImages, ...stackOnlyImages].map((image, index) =>
    createImageItem(userId, spaceId, image, index)
  );

  return imageCards;
}

export function repairLovcoreOriginalSeedItem(userId: string, item: Item): Item {
  const latest = createLovcoreOriginalItems(userId).find((candidate) => candidate.id === item.id);
  if (!latest) return item;

  return {
    ...item,
    type: latest.type,
    title: latest.title,
    content: latest.content,
    summary: latest.summary,
    thumbnail: latest.thumbnail,
    originalFileName: latest.originalFileName,
    fileSize: latest.fileSize,
    fileSizeBytes: latest.fileSizeBytes,
    fileExtension: latest.fileExtension,
    mimeType: latest.mimeType,
    pageCount: latest.pageCount,
    originalFileRef: latest.originalFileRef,
    previewPdfRef: latest.previewPdfRef,
    colorPalette: latest.colorPalette,
    keyClaims: latest.keyClaims,
    whyItMatters: latest.whyItMatters,
    tags: latest.tags,
    assignedSpaceIds: latest.assignedSpaceIds,
  };
}

export function hasLovcoreOriginalSeedRepair(before: Item, after: Item): boolean {
  return starterRepairChanged(before, after);
}

export function isRemovedLovcoreOriginalSeedItem(userId: string, item: Item): boolean {
  return removedStarterSlugs.some((slug) => item.id === seedId(userId, slug));
}
