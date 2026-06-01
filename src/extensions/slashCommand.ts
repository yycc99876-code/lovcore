import { Extension, type Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionOptions,
  type SuggestionProps,
} from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import SlashCommandMenu, {
  type SlashCommandMenuRef,
} from '../components/editor/SlashCommandMenu';
import type { SlashCommandItem } from '../components/editor/slashCommands';
import { getEditorDom } from '../services/editor/editorView';

type SlashSuggestionProps = SuggestionProps<SlashCommandItem, SlashCommandItem>;

const getClientRect = (props: SlashSuggestionProps) => {
  return props.clientRect?.() ?? new DOMRect(0, 0, 0, 0);
};

const dispatchEditorEvent = (
  editor: SlashSuggestionProps['editor'] | null,
  name: string,
) => {
  getEditorDom(editor)?.dispatchEvent(
    new CustomEvent(name, { bubbles: false }),
  );
};

const suggestionRender = () => {
  let component: ReactRenderer<SlashCommandMenuRef> | null = null;
  let popup: TippyInstance[] | null = null;
  let editorRef: SlashSuggestionProps['editor'] | null = null;

  return {
    onStart: (props: SlashSuggestionProps) => {
      editorRef = props.editor;
      component = new ReactRenderer(SlashCommandMenu, {
        props,
        editor: props.editor,
      });

      popup = tippy('body', {
        getReferenceClientRect: () => getClientRect(props),
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
        offset: [0, 8],
      });

      // Notify editor that slash menu is open
      dispatchEditorEvent(props.editor, 'lovcore:slash-menu-open');
    },

    onUpdate: (props: SlashSuggestionProps) => {
      component?.updateProps(props);

      popup?.[0]?.setProps({
        getReferenceClientRect: () => getClientRect(props),
      });
    },

    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (props.event.key === 'Escape') {
        popup?.[0]?.hide();
        dispatchEditorEvent(editorRef, 'lovcore:slash-menu-close');
        return true;
      }

      return component?.ref?.onKeyDown(props.event) ?? false;
    },

    onExit: () => {
      popup?.[0]?.destroy();
      component?.destroy();
      // Always dispatch close event when menu exits (not just on Escape)
      dispatchEditorEvent(editorRef, 'lovcore:slash-menu-close');
    },
  };
};

export interface SlashCommandOptions {
  suggestion: Omit<
    SuggestionOptions<SlashCommandItem, SlashCommandItem>,
    'editor'
  >;
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        allowSpaces: false,
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem, SlashCommandItem>({
        editor: this.editor,
        render: suggestionRender,
        ...this.options.suggestion,
      }),
    ];
  },
});

export function runSlashCommand(
  item: SlashCommandItem,
  editor: SlashSuggestionProps['editor'],
  range: Range,
) {
  item.action(editor.chain().focus().deleteRange(range)).run();
  item.onAfterRun?.();
}
