import { useTranslation } from './useTranslation';
import type { LovcoreSpace } from '../types';

type DefaultSpaces = ReturnType<typeof useTranslation>['t']['defaultSpaces'];

const SPACE_ID_MAP: Record<string, { name: keyof DefaultSpaces; desc: keyof DefaultSpaces }> = {
  'space-all': { name: 'all', desc: 'allDesc' },
  'space-keynotes': { name: 'keynotes', desc: 'keynotesDesc' },
  'space-agentic-coding': { name: 'agenticCoding', desc: 'agenticCodingDesc' },
  'space-enterprise-ai': { name: 'enterpriseAi', desc: 'enterpriseAiDesc' },
  'space-research-pdfs': { name: 'researchPdfs', desc: 'researchPdfsDesc' },
  'space-venture-thesis': { name: 'ventureThesis', desc: 'ventureThesisDesc' },
};

export function useTranslatedSpace(space: LovcoreSpace): { name: string; description: string } {
  const { t } = useTranslation();
  const mapping = SPACE_ID_MAP[space.id];

  if (mapping) {
    return {
      name: t.defaultSpaces[mapping.name],
      description: t.defaultSpaces[mapping.desc],
    };
  }

  return { name: space.name, description: space.description || '' };
}
