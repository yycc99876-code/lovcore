import type { Editor } from '@tiptap/react';

export function getEditorDom(editor: Editor | null | undefined): HTMLElement | null {
  if (!editor || editor.isDestroyed) return null;

  try {
    return editor.view.dom;
  } catch {
    return null;
  }
}

export function hasEditorView(editor: Editor | null | undefined): editor is Editor {
  return !!getEditorDom(editor);
}
