import type { LovcoreSpace } from '../types';

const ALL_SPACE_ID = 'space-all';

const LEGACY_DEFAULT_FOLIO_IDS = [
  'space-keynotes',
  'space-agentic-coding',
  'space-enterprise-ai',
  'space-research-pdfs',
  'space-venture-thesis',
  'space-good',
];

export const isAllSpace = (space: LovcoreSpace) =>
  space.id === ALL_SPACE_ID || space.id.endsWith(`-${ALL_SPACE_ID}`);

export const isLegacyDefaultFolio = (space: LovcoreSpace) => {
  if (isAllSpace(space)) return false;
  if (space.system) return true;

  return LEGACY_DEFAULT_FOLIO_IDS.some((id) => space.id === id || space.id.endsWith(`-${id}`));
};

export const isVisibleFolio = (space: LovcoreSpace) =>
  !isAllSpace(space) && !isLegacyDefaultFolio(space);
