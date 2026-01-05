import { NextResponse } from 'next/server'
import { handlePostureNotify } from '@/services/posture-notifier/handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req) {
  const secret = req.headers.get('x-cron-secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    await handlePostureNotify()
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
  console.error('Posture cron error:')
  console.error(err?.message)
  console.error(err?.stack)

  return NextResponse.json(
    {
      status: 'error',
      message: err?.message || 'Unknown error',
    },
    { status: 500 }
  )
}

}
