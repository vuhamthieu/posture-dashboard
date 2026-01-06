/**
 * Detector tư thế xấu toàn diện (v2)
 * Sử dụng:
 * - posture_type
 * - confidence
 * - metrics.neck_angle
 *
 * @param {Array} records posture_records trong 1 window (vd 5 phút)
 * @returns {{
 *   isBad: boolean,
 *   reason?: string,
 *   meta?: object
 * }}
 */
export function detectBadPosture(records) {
  if (!Array.isArray(records) || records.length < 6) {
    return { isBad: false }
  }

  // sort theo thời gian
  const sorted = [...records].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  )

  // lọc record đủ tin cậy
  const valid = sorted.filter(r => (r.confidence ?? 0) >= 0.65)

  if (valid.length < 6) {
    return { isBad: false }
  }

 // ==== 1. Đánh giá theo posture_type ====
// Tất cả posture KHÔNG phải 'good' đều coi là xấu
const badByLabel = valid.filter(
  r => r.posture_type && r.posture_type !== 'good'
)
const badRatio = badByLabel.length / valid.length

// ==== 2. Đánh giá theo neck_angle ====
const badByAngle = valid.filter(r => {
  const angle = r.metrics?.neck_angle
  return typeof angle === 'number' && angle >= 15
})

const angleRatio = badByAngle.length / valid.length

// ==== 3. Kiểm tra chuỗi xấu liên tục (label OR angle) ====
let maxContinuousBad = 0
let currentStreak = 0

for (const r of valid) {
  const angle = r.metrics?.neck_angle ?? 0
  const isBad =
    (r.posture_type && r.posture_type !== 'good') ||
    angle >= 15

  if (isBad) {
    currentStreak++
    maxContinuousBad = Math.max(maxContinuousBad, currentStreak)
  } else {
    currentStreak = 0
  }
}

// ==== 4. Ước lượng thời gian tư thế xấu ====
// Giả định mỗi record ~5s
const ESTIMATED_INTERVAL_SEC = 5
const estimatedBadSeconds =
  Math.max(badByLabel.length, badByAngle.length) *
  ESTIMATED_INTERVAL_SEC

// ==== 5. Quyết định cuối (nới lỏng cho data thực tế) ====
const isBad =
  badRatio >= 0.4 &&
  maxContinuousBad >= 3 &&
  estimatedBadSeconds >= 60

if (!isBad) {
  return { isBad: false }
}

  return {
    isBad: true,
    reason: 'bad_posture_neck_angle',
    meta: {
      badRatio: Number(badRatio.toFixed(2)),
      angleRatio: Number(angleRatio.toFixed(2)),
      maxContinuousBad,
      estimatedBadSeconds,
      totalRecords: valid.length,
    },
  }
}
