import { NextResponse } from 'next/server'
import { handlePostureNotify } from '@/services/posture-notifier/handler'
export const runtime = 'nodejs';

export async function GET() {
  try {
    await handlePostureNotify()
    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Posture cron error:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
