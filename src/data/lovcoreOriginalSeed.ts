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

const originalPdf = {
  slug: 'zhou-guoliang-pdf',
  file: 'zhou-guoliang.pdf',
  title: 'AI Product Manager Profile',
  originalFileName: '周国梁_AI产品经理简历.pdf',
  content: [
    'AI product manager profile for Zhou Guoliang, focused on Lovcore, Revision Lens, AI-native knowledge management, and product design.',
    'The document highlights product ownership, React and TypeScript implementation, Supabase-backed storage, AI writing workflows, browser clipping, semantic search, and multimodal file handling.',
    'It is included as a starter PDF so Lovcore can show a real document preview beside visual references immediately after signup.',
  ].join('\n\n'),
  summary: '周国梁是一名 AI 产品经理，专注于设计和开发 AI 驱动的知识管理工具，包括 Lovcore 和 Revision Lens。他具备从 0 到 1 构建产品的能力，并熟悉 React、TypeScript、Supabase、AI 写作和语义搜索等技术栈。',
  keyClaims: [
    '独立设计并开发 Lovcore，一个 AI 驱动的私密记忆归档工具，支持多类型内容保存与语义搜索。',
    '在 AI 写作编辑器中引入低干扰建议和可控修改功能，提升用户对 AI 生成内容的控制感。',
    '具备从产品定位到技术实现的完整经验，覆盖 React、TypeScript、Supabase 等技术栈。',
  ],
  whyItMatters: 'A realistic starter PDF that demonstrates Lovcore document ingestion, preview, summary, tags, and detail reading behavior.',
  tags: ['document', 'pdf', 'ai-product-manager', 'knowledge-management', 'product-design', 'tech-stack', 'ai-projects'],
};

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
    id: seedId(userId, originalPdf.slug),
    type: 'pdf',
    title: originalPdf.title,
    content: originalPdf.content,
    summary: originalPdf.summary,
    originalFileName: originalPdf.originalFileName,
    fileSize: '0.5 MB',
    fileSizeBytes: 536103,
    fileExtension: 'pdf',
    mimeType: 'application/pdf',
    pageCount: 2,
    originalFileRef: `${ASSET_BASE}/${originalPdf.file}`,
    previewPdfRef: `${ASSET_BASE}/${originalPdf.file}`,
    keyClaims: originalPdf.keyClaims,
    whyItMatters: originalPdf.whyItMatters,
    tags: originalPdf.tags,
    status: 'ready',
    createdAt: '2026-06-09T08:39:00.000Z',
  };

  return [pdfCard, ...imageCards];
}

export function repairLovcoreOriginalSeedItem(userId: string, item: Item): Item {
  if (item.id !== seedId(userId, originalPdf.slug)) return item;

  return {
    ...item,
    title: originalPdf.title,
    content: originalPdf.content,
    summary: originalPdf.summary,
    originalFileName: originalPdf.originalFileName,
    fileSize: '0.5 MB',
    fileSizeBytes: 536103,
    fileExtension: 'pdf',
    mimeType: 'application/pdf',
    pageCount: 2,
    originalFileRef: `${ASSET_BASE}/${originalPdf.file}`,
    previewPdfRef: `${ASSET_BASE}/${originalPdf.file}`,
    keyClaims: originalPdf.keyClaims,
    whyItMatters: originalPdf.whyItMatters,
    tags: originalPdf.tags,
  };
}

export function hasLovcoreOriginalSeedRepair(before: Item, after: Item): boolean {
  return before.title !== after.title
    || before.content !== after.content
    || before.summary !== after.summary
    || before.originalFileName !== after.originalFileName
    || before.fileSize !== after.fileSize
    || before.fileSizeBytes !== after.fileSizeBytes
    || before.fileExtension !== after.fileExtension
    || before.mimeType !== after.mimeType
    || before.pageCount !== after.pageCount
    || before.originalFileRef !== after.originalFileRef
    || before.previewPdfRef !== after.previewPdfRef
    || JSON.stringify(before.keyClaims ?? []) !== JSON.stringify(after.keyClaims ?? [])
    || before.whyItMatters !== after.whyItMatters
    || JSON.stringify(before.tags ?? []) !== JSON.stringify(after.tags ?? []);
}
