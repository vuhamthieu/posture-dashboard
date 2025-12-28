import 'server-only'
import { getSupabaseService } from '@/lib/supabase/service'
import { detectBadPosture } from './detector'
import { sendFCM } from './fcm'
import { buildPostureMessage } from './messageBuilder'

/**
 * Thời gian cửa sổ kiểm tra (5 phút)
 */
const WINDOW_MINUTES = 5

/**
 * Cooldown gửi notification cho mỗi user (phút)
 * Tránh spam
 */
const COOLDOWN_MINUTES = 15

export async function handlePostureNotify() {
  const supabase = getSupabaseService()

  const now = Date.now()
  const windowFrom = new Date(
    now - WINDOW_MINUTES * 60 * 1000
  ).toISOString()

  const { data: records, error } = await supabase
    .from('posture_records')
    .select(
      'id, user_id, posture_type, confidence, metrics, created_at'
    )
    .gte('created_at', windowFrom)
    .not('user_id', 'is', null)

  if (error || !records?.length) return

  const recordsByUser = {}

  for (const r of records) {
    if (!recordsByUser[r.user_id]) {
      recordsByUser[r.user_id] = []
    }
    recordsByUser[r.user_id].push(r)
  }

  for (const userId of Object.keys(recordsByUser)) {
    const userRecords = recordsByUser[userId]

    const result = detectBadPosture(userRecords)
    if (!result.isBad) continue

    const cooldownFrom = new Date(
      now - COOLDOWN_MINUTES * 60 * 1000
    ).toISOString()

    const { data: recentNoti } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'posture_warning')
      .gte('created_at', cooldownFrom)
      .limit(1)

    if (recentNoti?.length) continue

    const { data: tokensData } = await supabase
      .from('user_fcm_tokens')
      .select('fcm_token')
      .eq('user_id', userId)
      .eq('is_active', true)

    const tokens = (tokensData || []).map(t => t.fcm_token)
    if (!tokens.length) continue

    const message = buildPostureMessage(result.meta)

    await sendFCM(tokens, {
      title: message.title,
      body: message.body,
    })

    await supabase.from('notifications').insert({
      user_id: userId,
      title: message.title,
      body: message.body,
      type: 'posture_warning',
      meta: {
        detector: 'v2',
        level: message.level,
        ...result.meta,
      },
    })
  }
}

