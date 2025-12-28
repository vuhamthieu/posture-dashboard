import { supabaseService } from '@/lib/supabase/service'
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
  const now = Date.now()
  const windowFrom = new Date(
    now - WINDOW_MINUTES * 60 * 1000
  ).toISOString()

  // 1️⃣ Lấy posture_records trong window
  const { data: records, error } = await supabaseService
    .from('posture_records')
    .select(
      'id, user_id, posture_type, confidence, metrics, created_at'
    )
    .gte('created_at', windowFrom)
    .not('user_id', 'is', null)

  if (error) {
    console.error('Query posture_records error:', error)
    return
  }

  if (!records || records.length === 0) return

  // 2️⃣ Group theo user_id
  const recordsByUser = {}

  for (const r of records) {
    if (!recordsByUser[r.user_id]) {
      recordsByUser[r.user_id] = []
    }
    recordsByUser[r.user_id].push(r)
  }

  // 3️⃣ Duyệt từng user
  for (const userId of Object.keys(recordsByUser)) {
    const userRecords = recordsByUser[userId]

    // 3.1 Detect posture xấu
    const result = detectBadPosture(userRecords)
    if (!result.isBad) continue

    // 3.2 Check cooldown (dựa trên notifications)
    const cooldownFrom = new Date(
      now - COOLDOWN_MINUTES * 60 * 1000
    ).toISOString()

    const { data: recentNoti } = await supabaseService
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'posture_warning')
      .gte('created_at', cooldownFrom)
      .limit(1)

    if (recentNoti && recentNoti.length > 0) {
      // Đang trong cooldown → skip
      continue
    }

    // 3.3 Lấy FCM tokens
    const { data: tokensData } = await supabaseService
      .from('user_fcm_tokens')
      .select('fcm_token')
      .eq('user_id', userId)
      .eq('is_active', true)

    const tokens = (tokensData || []).map(t => t.fcm_token)

    if (tokens.length === 0) continue

    // 3.4 Build message theo mức độ
    const message = buildPostureMessage(result.meta)

    // 3.5 Gửi FCM
    await sendFCM(tokens, {
    title: message.title,
    body: message.body,
    })

    // 3.6 Lưu notification (kèm meta + level)
    await supabaseService.from('notifications').insert({
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
