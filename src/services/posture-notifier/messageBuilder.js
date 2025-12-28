export function buildPostureMessage(meta) {
  const badRatio = meta.badRatio ?? 0
  const badTime = meta.estimatedBadSeconds ?? 0

  if (badTime >= 240) {
    return {
      level: 'severe',
      title: '⚠️ Tư thế rất xấu',
      body: 'Bạn cúi cổ trong thời gian dài. Hãy nghỉ ngơi và điều chỉnh tư thế ngay.',
    }
  }

  if (badRatio >= 0.7) {
    return {
      level: 'moderate',
      title: 'Cảnh báo tư thế',
      body: 'Tư thế của bạn đang xấu trong vài phút gần đây. Hãy ngồi thẳng lưng.',
    }
  }

  return {
    level: 'mild',
    title: 'Nhắc nhở tư thế',
    body: 'Hãy chú ý giữ tư thế đúng để tránh mỏi cổ.',
  }
}
