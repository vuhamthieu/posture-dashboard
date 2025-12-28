import admin from 'firebase-admin'

/**
 * Khởi tạo Firebase Admin
 * Tránh init nhiều lần trên Vercel (hot start)
 */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercel env thường escape \n
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  })
}

/**
 * Gửi FCM tới nhiều device
 * @param {string[]} tokens
 * @param {{ title: string, body: string }} payload
 */
export async function sendFCM(tokens, payload) {
  if (!Array.isArray(tokens) || tokens.length === 0) return

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
    })

    // Optional: log lỗi token chết
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        console.warn(
          'FCM failed for token:',
          tokens[idx],
          res.error?.message
        )
      }
    })
  } catch (err) {
    console.error('Send FCM error:', err)
  }
}
