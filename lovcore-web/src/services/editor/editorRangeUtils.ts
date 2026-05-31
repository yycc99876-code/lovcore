import type { Editor } from '@tiptap/react';

/**
 * Get the text content of the block node (paragraph, heading, list item, etc.)
 * at the current cursor position.
 */
export function getBlockTextAtCursor(editor: Editor): { text: string; from: number; to: number } | null {
  const { from } = editor.state.selection;
  const $pos = editor.state.doc.resolve(from);
  const blockNode = $pos.parent;
  const blockStart = $pos.start($pos.depth);
  const blockEnd = $pos.end($pos.depth);
  const text = blockNode.textContent;

  return { text, from: blockStart, to: blockEnd };
}

/**
 * Get text before and after the cursor within the current block.
 */
export function getCursorContext(editor: Editor): {
  paragraph: string;
  beforeCursor: string;
  afterCursor: string;
  cursorOffset: number;
} | null {
  const block = getBlockTextAtCursor(editor);
  if (!block) return null;

  const { from } = editor.state.selection;
  const $pos = editor.state.doc.resolve(from);
  const cursorOffset = $pos.parentOffset;
  const paragraph = block.text;
  const beforeCursor = paragraph.slice(0, cursorOffset);
  const afterCursor = paragraph.slice(cursorOffset);

  return { paragraph, beforeCursor, afterCursor, cursorOffset };
}

/**
 * Check if the cursor is near the end of the current block (within tolerance chars).
 * Used to decide if ArrowRight should accept autocomplete.
 */
export function isCursorNearBlockEnd(editor: Editor, tolerance = 2): boolean {
  const { from, to } = editor.state.selection;
  if (from !== to) return false;

  const $pos = editor.state.doc.resolve(from);
  const blockEnd = $pos.end($pos.depth);
  return from >= blockEnd - tolerance;
}

/**
 * Find the position of `search` text within a specific block range in the document.
 * Returns { from, to } in document positions, or null if not found.
 * Handles repeated text by preferring the first occurrence.
 */
export function findTextInRange(
  editor: Editor,
  blockFrom: number,
  blockTo: number,
  search: string,
): { from: number; to: number } | null {
  const { doc } = editor.state;
  let result: { from: number; to: number } | null = null;
  const safeFrom = Math.max(0, Math.min(blockFrom, doc.content.size));
  const safeTo = Math.max(safeFrom, Math.min(blockTo, doc.content.size));

  doc.nodesBetween(safeFrom, safeTo, (node, pos) => {
    if (result) return false;
    if (!node.isText || !node.text) return;

    const idx = node.text.indexOf(search);
    if (idx !== -1) {
      result = { from: pos + idx, to: pos + idx + search.length };
    }
    return false;
  });

  return result;
}

/**
 * Check if the user is currently composing via IME (e.g., Chinese input).
 * Ghost features should not trigger during composition.
 */
export function isIMEComposing(event?: KeyboardEvent): boolean {
  if (event?.isComposing) return true;
  // Fallback: check for compositionupdate state via DOM
  return false;
}
