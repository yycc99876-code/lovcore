# Lovcore API Contract

Date: 2026-05-24
Status: **Planning** (not yet implemented)

## Auth

All endpoints require authentication via Bearer token (Supabase JWT).

```
Authorization: Bearer <supabase-jwt-token>
```

**Error shape (all endpoints):**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Card not found"
  }
}
```

Common error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`

---

## Cards

### GET /api/cards

List all cards for the authenticated user.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | No |
| Writes ai_events | No |

**Query params:**
- `type` (optional): Filter by card type
- `tags` (optional): Comma-separated tag filter
- `limit` (optional, default 50): Page size
- `offset` (optional, default 0): Pagination offset

**Response:**
```json
{
  "data": [
    {
      "id": "1716500000000",
      "type": "note",
      "title": "Product ideas",
      "preview": "Three ideas for Q3...",
      "content": "Three ideas for Q3...",
      "summary": "Product roadmap ideas",
      "sourceUrl": null,
      "domain": null,
      "tags": ["product", "ideas"],
      "colorPalette": null,
      "noteBgColor": "#F0EAE1",
      "status": "ready",
      "createdAt": "2026-05-20T10:00:00Z",
      "updatedAt": "2026-05-20T10:00:00Z"
    }
  ],
  "total": 42
}
```

---

### POST /api/cards

Create a new card.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | 60 req/min |
| Writes ai_events | No |

**Request body:**
```json
{
  "type": "note",
  "title": "New idea",
  "content": "Content text here",
  "body": {
    "kind": "tiptap",
    "json": {},
    "text": "Content text here",
    "html": "<p>Content text here</p>"
  },
  "tags": ["ideas"],
  "sourceUrl": null,
  "noteBgColor": "#F0EAE1",
  "status": "ready"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "1716500000001",
    "type": "note",
    "title": "New idea",
    "status": "ready",
    "createdAt": "2026-05-24T12:00:00Z",
    "updatedAt": "2026-05-24T12:00:00Z"
  }
}
```

---

### GET /api/cards/:id

Get a single card with its body.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | No |
| Writes ai_events | No |

**Response:**
```json
{
  "data": {
    "id": "1716500000000",
    "type": "note",
    "title": "Product ideas",
    "content": "Three ideas for Q3...",
    "body": {
      "kind": "tiptap",
      "json": {},
      "text": "Three ideas for Q3...",
      "html": "<p>Three ideas for Q3...</p>"
    },
    "summary": "",
    "tags": ["product"],
    "status": "ready",
    "createdAt": "2026-05-20T10:00:00Z",
    "updatedAt": "2026-05-20T10:00:00Z"
  }
}
```

---

### PATCH /api/cards/:id

Update a card (partial update).

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | No |
| Writes ai_events | No |

**Request body:** (any subset of updatable fields)
```json
{
  "title": "Updated title",
  "tags": ["product", "updated"],
  "body": {
    "kind": "tiptap",
    "json": {},
    "text": "Updated content",
    "html": "<p>Updated content</p>"
  }
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": "1716500000000",
    "title": "Updated title",
    "updatedAt": "2026-05-24T12:30:00Z"
  }
}
```

---

### DELETE /api/cards/:id

Delete a card and its associated files.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | No |
| Writes ai_events | No |

**Response:** `204 No Content`

---

## Spaces

### GET /api/spaces

List all spaces for the authenticated user.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | No |
| Writes ai_events | No |

**Response:**
```json
{
  "data": [
    {
      "id": "space-all",
      "name": "All",
      "type": "default",
      "system": true,
      "color": null,
      "description": null,
      "query": null,
      "selectedType": null,
      "tags": [],
      "createdAt": "2026-05-01T00:00:00Z",
      "updatedAt": "2026-05-01T00:00:00Z"
    }
  ]
}
```

---

### POST /api/spaces

Create a new space.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | 30 req/min |
| Writes ai_events | No |

**Request body:**
```json
{
  "name": "AI Research",
  "type": "smart",
  "color": "#4F46E5",
  "description": "AI research papers and articles",
  "query": "AI research",
  "selectedType": "article",
  "tags": ["ai", "research"]
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "user-space-1716500000",
    "name": "AI Research",
    "type": "smart",
    "system": false
  }
}
```

---

### PATCH /api/spaces/:id

Update a space.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | No |
| Writes ai_events | No |

**Request body:** (partial)
```json
{
  "name": "Updated Space Name",
  "color": "#10B981"
}
```

**Response:** `200 OK`

---

### DELETE /api/spaces/:id

Delete a non-system space.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | No |
| Writes ai_events | No |

**Response:** `204 No Content`

---

### POST /api/spaces/:id/cards

Add a card to a space.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | No |
| Writes ai_events | No |

**Request body:**
```json
{
  "cardId": "1716500000000",
  "position": 0
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "spaceId": "space-keynotes",
    "cardId": "1716500000000",
    "addedAt": "2026-05-24T12:00:00Z"
  }
}
```

---

### DELETE /api/spaces/:id/cards/:cardId

Remove a card from a space.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | No |
| Writes ai_events | No |

**Response:** `204 No Content`

---

## Files

### POST /api/files/upload

Upload a file and associate it with a card.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | 20 req/min |
| Writes ai_events | No |

**Request:** `multipart/form-data`
- `file`: The file blob
- `cardId`: Associated card ID

**Response:** `201 Created`
```json
{
  "data": {
    "id": "uuid-here",
    "cardId": "1716500000000",
    "storagePath": "user123/card456",
    "mimeType": "image/png",
    "size": 1024000,
    "width": 1920,
    "height": 1080,
    "createdAt": "2026-05-24T12:00:00Z"
  }
}
```

---

### GET /api/files/:id

Get file metadata and a signed download URL.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | No |
| Writes ai_events | No |

**Response:**
```json
{
  "data": {
    "id": "uuid-here",
    "storagePath": "user123/card456",
    "mimeType": "image/png",
    "size": 1024000,
    "signedUrl": "https://xxx.supabase.co/storage/v1/object/sign/files/...",
    "expiresAt": "2026-05-24T13:00:00Z"
  }
}
```

---

### DELETE /api/files/:id

Delete a file record and its storage object.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | No |
| Writes ai_events | No |

**Response:** `204 No Content`

---

## AI

### POST /api/ai/autocomplete

Get inline text completion suggestion.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | 120 req/min |
| Writes ai_events | Yes |

**Request body:**
```json
{
  "paragraph": "The key insight is that",
  "beforeCursor": "The key insight is that",
  "afterCursor": "",
  "fullContext": "Full document text for context..."
}
```

**Response:**
```json
{
  "data": {
    "suggestion": "agentic workflows will reshape enterprise software.",
    "confidence": 0.87
  }
}
```

---

### POST /api/ai/ghost-correct

Get ghost correction suggestions for a paragraph.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | 60 req/min |
| Writes ai_events | Yes |

**Request body:**
```json
{
  "paragraphText": "Their going to the meetng tomorrow.",
  "fullContext": "Full document text..."
}
```

**Response:**
```json
{
  "data": {
    "suggestions": [
      {
        "original": "Their",
        "replacement": "They're",
        "reason": "Contraction of 'they are' needed here",
        "severity": "moderate",
        "from": 0,
        "to": 5
      },
      {
        "original": "meetng",
        "replacement": "meeting",
        "reason": "Typo: missing 'i'",
        "severity": "minor",
        "from": 22,
        "to": 28
      }
    ]
  }
}
```

---

### POST /api/ai/rewrite

Rewrite selected text with an instruction.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | 30 req/min |
| Writes ai_events | Yes |

**Request body:**
```json
{
  "text": "The product is good and people like it.",
  "instruction": "Make it more professional and specific",
  "language": "en"
}
```

**Response:**
```json
{
  "data": {
    "rewritten": "The product demonstrates strong market fit, with consistently positive user feedback across key satisfaction metrics."
  }
}
```

---

### POST /api/ai/transcribe

Transcribe audio to text.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | 20 req/min |
| Writes ai_events | Yes |

**Request body:**
```json
{
  "audioBase64": "base64-encoded-audio-data...",
  "language": "en",
  "contextTerms": ["Lovcore", "agentic", "Sequoia"]
}
```

**Response:**
```json
{
  "data": {
    "text": "The key takeaway from the Sequoia presentation...",
    "language": "en",
    "segments": [
      { "start": 0, "end": 3.5, "text": "The key takeaway" },
      { "start": 3.5, "end": 7.2, "text": "from the Sequoia presentation" }
    ]
  }
}
```

---

### POST /api/ai/summarize

Generate a summary of text content.

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | 30 req/min |
| Writes ai_events | Yes |

**Request body:**
```json
{
  "text": "Long text content to summarize...",
  "maxLength": 200,
  "style": "brief"
}
```

**Response:**
```json
{
  "data": {
    "summary": "A concise summary of the content highlighting the main points..."
  }
}
```

---

### POST /api/ai/analyze-card

Run full AI analysis on a card (summary + tags + key claims + why it matters).

| Property | Value |
|---|---|
| Auth | Required |
| Rate limit | 20 req/min |
| Writes ai_events | Yes |

**Request body:**
```json
{
  "cardId": "1716500000000",
  "text": "Card content to analyze...",
  "type": "article"
}
```

**Response:**
```json
{
  "data": {
    "summary": "This article discusses...",
    "tags": ["ai", "enterprise", "strategy"],
    "keyClaims": ["AI agents will replace 40% of SaaS workflows", "Enterprise adoption is accelerating"],
    "whyItMatters": "Signals a fundamental shift in how enterprise software is built and consumed."
  }
}
```
