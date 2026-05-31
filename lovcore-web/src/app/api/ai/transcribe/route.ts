import { NextRequest, NextResponse } from 'next/server'

export async function POST(_request: NextRequest) {
  // Transcribe requires ASR integration - return stub for now
  return NextResponse.json({ text: '[mock] 语音转写需要后端 ASR 集成。', language: 'zh' })
}
