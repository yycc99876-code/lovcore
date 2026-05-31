import type { ChainedCommands } from '@tiptap/core';

export interface SlashCommandItem {
  title: string;
  alias: string;
  icon: string;
  description: string;
  group: string;
  action: (chain: ChainedCommands) => ChainedCommands;
  onAfterRun?: () => void;
}

export const slashCommandItems: SlashCommandItem[] = [
  {
    title: '正文',
    alias: 'zw',
    icon: 'Type',
    description: '段落文本',
    group: '基础',
    action: (chain) => chain.setParagraph(),
  },
  {
    title: '标题1',
    alias: 'bt1',
    icon: 'Heading1',
    description: '一级标题',
    group: '基础',
    action: (chain) => chain.toggleHeading({ level: 1 }),
  },
  {
    title: '标题2',
    alias: 'bt2',
    icon: 'Heading2',
    description: '二级标题',
    group: '基础',
    action: (chain) => chain.toggleHeading({ level: 2 }),
  },
  {
    title: '标题3',
    alias: 'bt3',
    icon: 'Heading3',
    description: '三级标题',
    group: '基础',
    action: (chain) => chain.toggleHeading({ level: 3 }),
  },
  {
    title: '有序列表',
    alias: 'yxlb',
    icon: 'ListOrdered',
    description: '有序列表',
    group: '列表',
    action: (chain) => chain.toggleOrderedList(),
  },
  {
    title: '无序列表',
    alias: 'wxlb',
    icon: 'List',
    description: '无序列表',
    group: '列表',
    action: (chain) => chain.toggleBulletList(),
  },
  {
    title: '表格',
    alias: 'bg',
    icon: 'Table',
    description: '插入 3x3 表格',
    group: '插入',
    action: (chain) => chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
  },
  {
    title: '分隔线',
    alias: 'fgx',
    icon: 'Minus',
    description: '水平分割线',
    group: '插入',
    action: (chain) => chain.setHorizontalRule(),
  },
  {
    title: '图片',
    alias: 'tb',
    icon: 'Image',
    description: '插入图片 URL',
    group: '插入',
    action: (chain) => {
      const url = window.prompt('请输入图片地址:');
      if (url) return chain.setImage({ src: url });
      return chain;
    },
  },
  {
    title: '代码块',
    alias: 'dmk',
    icon: 'Code',
    description: '代码块',
    group: '插入',
    action: (chain) => chain.toggleCodeBlock(),
  },
  {
    title: '引用',
    alias: 'yy',
    icon: 'Quote',
    description: '引用块',
    group: '插入',
    action: (chain) => chain.toggleBlockquote(),
  },
  {
    title: 'AI写作',
    alias: '',
    icon: 'Sparkles',
    description: 'AI 辅助写作',
    group: 'AI',
    action: (chain) => chain,
    onAfterRun: () => {
      document
        .querySelector('.ProseMirror')
        ?.dispatchEvent(new CustomEvent('slash-ai-writing'));
    },
  },
];

export function filterSlashCommands(query: string): SlashCommandItem[] {
  const lower = query.toLowerCase();

  return slashCommandItems.filter((item) => (
    item.title.toLowerCase().includes(lower) ||
    item.alias.toLowerCase().includes(lower) ||
    item.description.toLowerCase().includes(lower)
  ));
}
