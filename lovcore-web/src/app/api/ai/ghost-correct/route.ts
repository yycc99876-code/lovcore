import { NextRequest, NextResponse } from 'next/server'
import { handleGhostCorrect } from '@/lib/ai/handlers/ghost-correct'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await handleGhostCorrect(body)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
