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
  'space-good': { name: 'good', desc: 'goodDesc' },
};

export function useTranslatedSpace(space: LovcoreSpace): { name: string; description: string } {
  const { locale, t } = useTranslation();
  const defaultId = Object.keys(SPACE_ID_MAP).find((id) => space.id === id || space.id.endsWith(`-${id}`));
  const mapping = defaultId ? SPACE_ID_MAP[defaultId] : undefined;

  const universalLabels: Record<string, { en: [string, string]; zh: [string, string] }> = {
    'space-keynotes': {
      en: ['Inspiration', 'Loose ideas, images, quotes, and fragments worth returning to.'],
      zh: ['灵感', '随手保存的想法、图片、句子和以后值得回看的片段。'],
    },
    'space-agentic-coding': {
      en: ['Articles', 'Essays, webpages, references, and long-form reads.'],
      zh: ['文章', '长文、网页、参考资料和需要慢慢读的内容。'],
    },
    'space-enterprise-ai': {
      en: ['Images', 'Screenshots, photos, visual references, and saved scenes.'],
      zh: ['图片', '截图、照片、视觉参考和被保存下来的画面。'],
    },
    'space-research-pdfs': {
      en: ['Documents', 'PDF、Word、PPT and research material.'],
      zh: ['文档', 'PDF、Word、PPT 和研究资料。'],
    },
    'space-venture-thesis': {
      en: ['Videos', 'Talks, demos, saved clips, and watch-later material.'],
      zh: ['视频', '演讲、片段、演示和稍后再看的内容。'],
    },
    'space-good': {
      en: ['Notes', 'Quick notes, drafts, thoughts, and text captured in the moment.'],
      zh: ['笔记', '快速记录、草稿、想法和当下写下来的文字。'],
    },
  };

  if (defaultId && universalLabels[defaultId]) {
    const [name, description] = universalLabels[defaultId][locale];
    return { name, description };
  }

  if (mapping) {
    return {
      name: t.defaultSpaces[mapping.name],
      description: t.defaultSpaces[mapping.desc],
    };
  }

  return { name: space.name, description: space.description || '' };
}
