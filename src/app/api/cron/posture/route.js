import { NextResponse } from 'next/server'
import { handlePostureNotify } from '@/services/posture-notifier/handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await handlePostureNotify()
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('Posture cron error:', err)

    return NextResponse.json(
      {
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
