import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import { ACTIVITY_ACTIONS, recordActivity } from './activityLog'

// Signed-in users are signed out after this much inactivity (shared office computers).
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000

// Set before an inactivity sign-out so the login page can explain why the user is there.
export const SESSION_EXPIRED_KEY = 'sares:session-expired'

/**
 * Records the sign-out in the activity log, then ends the Firebase session.
 * The log entry must be written first: once signed out, the rules reject it.
 */
export async function endSession(userProfile, action = ACTIVITY_ACTIONS.LOGOUT) {
  await recordActivity(userProfile, action, 'session')
  try {
    await signOut(auth)
  } catch (error) {
    console.error('Sign-out failed:', error)
  }
}
