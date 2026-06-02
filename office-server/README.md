# Lovcore Office Server

Converts Office files (`.ppt`, `.pptx`, `.doc`, `.docx`, `.xls`, `.xlsx`) to PDF with LibreOffice so Lovcore can render real previews in the document drawer.

## Railway

Create a new Railway service from this repository and set:

- Root Directory: `office-server`
- Port: `8080`
- Start Command: `npm start`

Environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ALLOWED_ORIGINS=https://lovcore.com,https://www.lovcore.com,https://lovcore.vercel.app,http://localhost:5173`

After Railway gives you a public domain, set this on Vercel:

```env
VITE_OFFICE_CONVERT_URL=https://your-office-server.up.railway.app
```

