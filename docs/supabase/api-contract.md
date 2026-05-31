# Lovcore Supabase API Contract

Status: **Planning** (not yet implemented)

This document defines the CRUD operations and data flows for the Supabase migration. Each operation maps to a Supabase client call that the frontend hooks will use.

## Prerequisites

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

All operations require an authenticated user. Supabase RLS automatically filters by `user_id` from the JWT token.

---

## Cards

### 1. Load all cards

**Replaces:** `loadStoredItems()` from `storage.ts`

```typescript
async function loadCards(): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapCardRowToCard);
}
```

**Notes:**
- RLS ensures only the current user's cards are returned
- No `WHERE user_id = ...` needed — RLS handles it
- Sorted newest-first to match current UI behavior

### 2. Create a card (ingest)

**Replaces:** `createAnalyzingItem()` + `persistItems()` from `useCards.ts`

```typescript
async function createCard(card: Card): Promise<Card> {
  const row = mapCardToCardRow(card, userId);

  const { data, error } = await supabase
    .from('cards')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return mapCardRowToCard(data);
}
```

**Two-phase ingest flow:**
1. Insert with `status: 'analyzing'` → card appears in UI immediately
2. After AI processing (2.5s), UPDATE to `status: 'ready'` with enriched fields

```typescript
// Phase 1: Insert analyzing card
const analyzingCard = createAnalyzingItem(type, initialFields);
await createCard(analyzingCard);

// Phase 2: Update with resolved data
await supabase
  .from('cards')
  .update({
    title: resolved.title,
    summary: resolved.summary,
    tags: resolved.tags,
    status: 'ready',
    // ... other enriched fields
  })
  .eq('id', analyzingCard.id);
```

### 3. Update a card

**Replaces:** `updateItem()` from `useCards.ts`

```typescript
async function updateCard(card: Card): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update({
      title: card.title,
      content: card.content,
      body: card.body,
      summary: card.summary,
      tags: card.tags,
      note_bg_color: card.noteBgColor,
      // ... other updatable fields
    })
    .eq('id', card.id);

  if (error) throw error;
}
```

**Notes:**
- Only send changed fields (partial update) for efficiency
- `updated_at` is auto-set by the database trigger

### 4. Delete a card

**Replaces:** `deleteItem()` from `useCards.ts`

```typescript
async function deleteCard(id: string): Promise<void> {
  // Delete associated file from storage (if exists)
  await supabase.storage
    .from('files')
    .remove([`${userId}/${id}`]);

  // Delete card row (RLS ensures ownership)
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
```

### 5. Query cards for a space

**Replaces:** Client-side filtering in `useSpaces.ts` + component logic

```typescript
async function queryCardsForSpace(space: Space): Promise<Card[]> {
  let query = supabase
    .from('cards')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply type filter
  if (space.selectedType && space.selectedType !== 'all') {
    query = query.eq('type', space.selectedType);
  }

  // Apply tag filter (cards containing ALL specified tags)
  if (space.tags && space.tags.length > 0) {
    query = query.contains('tags', space.tags);
  }

  // Apply text search
  if (space.query) {
    query = query.or(
      `title.ilike.%${space.query}%,content.ilike.%${space.query}%,summary.ilike.%${space.query}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapCardRowToCard);
}
```

---

## Spaces

### 6. Load all spaces

**Replaces:** `loadSpaces()` from `useSpaces.ts`

```typescript
async function loadSpaces(): Promise<Space[]> {
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(mapSpaceRowToSpace);
}
```

### 7. Create a space

**Replaces:** `saveSmartSpace()` / `createManualSpace()` from `useSpaces.ts`

```typescript
async function createSpace(space: Space): Promise<Space> {
  const row = mapSpaceToSpaceRow(space, userId);

  const { data, error } = await supabase
    .from('spaces')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return mapSpaceRowToSpace(data);
}
```

### 8. Delete a space

**Replaces:** `deleteSpace()` from `useSpaces.ts`

```typescript
async function deleteSpace(spaceId: string): Promise<void> {
  const { error } = await supabase
    .from('spaces')
    .delete()
    .eq('id', spaceId)
    .eq('system', false); // Extra safety: never delete system spaces

  if (error) throw error;
}
```

### 9. Seed default spaces (first login)

```typescript
async function seedDefaultSpaces(): Promise<void> {
  const { count } = await supabase
    .from('spaces')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) return; // Already seeded

  const defaults = defaultSpaces.map(s => mapSpaceToSpaceRow(s, userId));

  const { error } = await supabase
    .from('spaces')
    .insert(defaults);

  if (error) throw error;
}
```

---

## File Storage

### 10. Upload a file

**Replaces:** `storeFile()` from `fileStore.ts`

```typescript
async function uploadFile(cardId: string, file: File): Promise<void> {
  const path = `${userId}/${cardId}`;

  const { error } = await supabase.storage
    .from('files')
    .upload(path, file, { upsert: true });

  if (error) throw error;
}
```

### 11. Get a signed URL for display

**Replaces:** `loadFileUrl()` from `fileStore.ts`

```typescript
async function getFileUrl(cardId: string): Promise<string | null> {
  const path = `${userId}/${cardId}`;

  const { data, error } = await supabase.storage
    .from('files')
    .createSignedUrl(path, 3600); // 1 hour expiry

  if (error) return null;
  return data.signedUrl;
}
```

### 12. Delete a file

**Replaces:** `deleteStoredFile()` from `fileStore.ts`

```typescript
async function deleteFile(cardId: string): Promise<void> {
  const path = `${userId}/${cardId}`;

  await supabase.storage
    .from('files')
    .remove([path]);
}
```

---

## Auth

### 13. Sign in with email/password

**Replaces:** `enterVault()` from `useVaultGate.ts`

```typescript
async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}
```

### 14. Sign up

```typescript
async function signUp(email: string, password: string) {
  const { error } = await supabase.auth.signUp({ email, password });
  return { error: error?.message ?? null };
}
```

### 15. Sign in with Google

```typescript
async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  });
  return { error: error?.message ?? null };
}
```

### 16. Sign out

**Replaces:** `exitVault()` from `useVaultGate.ts`

```typescript
async function signOut() {
  await supabase.auth.signOut();
}
```

---

## Error Handling Pattern

All operations should follow this pattern in the hook layer:

```typescript
// Optimistic UI update
setItems(prev => [newItem, ...prev]);

try {
  await createCard(newItem);
} catch (err) {
  // Rollback on failure
  setItems(prev => prev.filter(i => i.id !== newItem.id));
  onToast?.('Failed to save. Please try again.');
}
```
