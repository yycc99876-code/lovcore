import type { Item, LovcoreSpace } from '../types';

export const LOVCORE_ORIGINAL_SPACE_SLUG = 'lovcore-original';

const ASSET_BASE = '/seed/lovcore-original';

const folioImages = [
  {
    slug: 'chatgpt-original-01',
    file: 'chatgpt-original-01.webp',
    title: 'Iridescent paper wings',
    summary: 'A delicate visual study of translucent wings, paper fibers, and natural patterning.',
    tags: ['lovcore-original', 'image', 'chatgpt', 'nature', 'texture'],
    palette: ['#181715', '#BFAE76', '#E7D6A0', '#768A76'],
  },
  {
    slug: 'chatgpt-original-02',
    file: 'chatgpt-original-02.webp',
    title: 'Butterfly wing texture study',
    summary: 'A close look at layered color, veining, and scale-like texture across butterfly wings.',
    tags: ['lovcore-original', 'image', 'chatgpt', 'butterfly', 'macro'],
    palette: ['#151716', '#E8B04F', '#2F6C84', '#EFE0BB'],
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
    palette: ['#221B15', '#C29E69', '#E9DCC0', '#8A6F50'],
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

const stackOnlyImages = [
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

function seedId(userId: string, suffix: string) {
  return `seed-${userId}-${suffix}`;
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
  const imageCards: Item[] = [...folioImages, ...stackOnlyImages].map((image, index) => ({
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
  }));

  const pdfCard: Item = {
    id: seedId(userId, 'zhou-guoliang-pdf'),
    type: 'pdf',
    title: 'Zhou Guoliang.pdf',
    content: 'A personal PDF document included in the Lovcore original starter stack.',
    summary: 'A starter PDF card so the Stack shows mixed media immediately after signup.',
    originalFileName: 'Zhou Guoliang.pdf',
    fileSize: '0.5 MB',
    fileSizeBytes: 536103,
    fileExtension: 'pdf',
    mimeType: 'application/pdf',
    originalFileRef: `${ASSET_BASE}/zhou-guoliang.pdf`,
    tags: ['lovcore-original', 'pdf', 'document'],
    status: 'ready',
    createdAt: '2026-06-09T08:39:00.000Z',
  };

  return [pdfCard, ...imageCards];
}
