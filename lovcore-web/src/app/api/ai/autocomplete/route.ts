import { NextRequest, NextResponse } from 'next/server'
import { handleAutocomplete } from '@/lib/ai/handlers/autocomplete'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await handleAutocomplete(body)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
