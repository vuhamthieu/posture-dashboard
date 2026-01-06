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

  const badByLabel = valid.filter(
  r => r.posture_type && r.posture_type !== 'good'
)

const badRatio = badByLabel.length / valid.length

let maxContinuousBad = 0
let current = 0

for (const r of valid) {
  const angle = r.metrics?.neck_angle ?? 0
  const isBad =
    r.posture_type !== 'good' || angle >= 15

  if (isBad) {
    current++
    maxContinuousBad = Math.max(maxContinuousBad, current)
  } else {
    current = 0
  }
}


  // ==== 4. Ước lượng thời gian tư thế xấu ====
  // Giả định mỗi record ~5s
  const ESTIMATED_INTERVAL_SEC = 5
  const estimatedBadSeconds =
    Math.max(badByLabel.length, badByAngle.length) *
    ESTIMATED_INTERVAL_SEC

  // ==== 5. Quyết định cuối ====
  const isBad =
    badRatio >= 0.6 &&
    angleRatio >= 0.5 &&
    maxContinuousBad >= 3 &&
    estimatedBadSeconds >= 120

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
