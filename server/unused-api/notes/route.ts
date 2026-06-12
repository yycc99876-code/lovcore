/**
 * Note CRUD API Stubs 鈥?BACKEND
 *
 * Desired endpoints:
 *   POST   /api/notes         鈥?create note
 *   GET    /api/notes/:id     鈥?get note by id
 *   PATCH  /api/notes/:id     鈥?update note (used by autosave)
 *   DELETE /api/notes/:id     鈥?delete note
 *
 * Autosave uses PATCH with structured rich content.
 *
 * For the current local prototype stage, this is simulated via localStorage.
 * These stubs define the expected request/response shape for future backend migration.
 */

export interface NoteBody {
  kind: 'tiptap';
  json: unknown;
  text: string;
  html?: string;
}

export interface NoteCreateRequest {
  title: string;
  body: NoteBody;
  tags?: string[];
  type?: 'note';
}

export interface NoteUpdateRequest {
  title?: string;
  body?: NoteBody;
  tags?: string[];
}

export interface NoteRecord {
  id: string;
  title: string;
  content: string; // plain text preview
  body?: NoteBody;
  tags: string[];
  type: 'note';
  createdAt: string;
  updatedAt: string;
}

/**
 * POST /api/notes 鈥?STUB
 */
export async function handleCreateNote(_req: NoteCreateRequest): Promise<NoteRecord> {
  throw new Error('Note API not yet implemented. Using localStorage prototype.');
}

/**
 * GET /api/notes/:id 鈥?STUB
 */
export async function handleGetNote(_id: string): Promise<NoteRecord> {
  throw new Error('Note API not yet implemented. Using localStorage prototype.');
}

/**
 * PATCH /api/notes/:id 鈥?STUB
 * This is the endpoint autosave will use.
 */
export async function handleUpdateNote(_id: string, _req: NoteUpdateRequest): Promise<NoteRecord> {
  throw new Error('Note API not yet implemented. Using localStorage prototype.');
}

/**
 * DELETE /api/notes/:id 鈥?STUB
 */
export async function handleDeleteNote(_id: string): Promise<void> {
  throw new Error('Note API not yet implemented. Using localStorage prototype.');
}
