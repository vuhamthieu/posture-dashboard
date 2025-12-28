import 'server-only'
import admin from 'firebase-admin'

let firebaseAppInitialized = false

function initFirebaseAdmin() {
  if (firebaseAppInitialized || admin.apps.length > 0) return

  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
  } = process.env

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error('Missing Firebase Admin environment variables')
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  })

  firebaseAppInitialized = true
}

/**
 * Gửi FCM tới nhiều device
 */
export async function sendFCM(tokens, payload) {
  if (!Array.isArray(tokens) || tokens.length === 0) return

  initFirebaseAdmin()

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
    })

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
