import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

export const ACTIVITY_ACTIONS = Object.freeze({
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  SESSION_TIMEOUT: 'session_timeout',
  PASSWORD_UPDATED: 'password_updated',
  CASE_RECORDED: 'case_recorded',
  STUDENT_CREATED: 'student_created',
  STUDENT_UPDATED: 'student_updated',
  STUDENT_TRASHED: 'student_trashed',
  STUDENT_RESTORED: 'student_restored',
  STUDENT_DELETED: 'student_deleted',
  VIOLATION_RECORDED: 'violation_recorded',
  VIOLATION_UPDATED: 'violation_updated',
  VIOLATION_STATUS_UPDATED: 'violation_status_updated',
  SUSPENSION_DATES_UPDATED: 'suspension_dates_updated',
  HANDBOOK_UPDATED: 'handbook_updated',
})

export async function recordActivity(userProfile, action, targetType, targetId = '') {
  const user = auth.currentUser
  if (!user || !userProfile?.role || !userProfile?.school_scope) {
    console.error('Activity log entry could not be saved: authenticated role profile is unavailable.')
    return
  }

  try {
    await addDoc(collection(db, 'activity_logs'), {
      action,
      actor_uid: user.uid,
      actor_email: user.email || '',
      actor_role: userProfile.role,
      school_scope: userProfile.school_scope,
      target_type: targetType,
      target_id: String(targetId || '').slice(0, 128),
      source: 'client',
      created_at: serverTimestamp(),
    })
  } catch (error) {
    console.error(`Activity log entry "${action}" could not be saved:`, error)
  }
}

export function getActivityActionLabel(action) {
  const labels = {
    [ACTIVITY_ACTIONS.LOGIN_SUCCESS]: 'Signed in successfully',
    [ACTIVITY_ACTIONS.LOGIN_FAILED]: 'Failed sign-in attempt',
    [ACTIVITY_ACTIONS.LOGOUT]: 'Signed out',
    [ACTIVITY_ACTIONS.SESSION_TIMEOUT]: 'Signed out after inactivity',
    [ACTIVITY_ACTIONS.PASSWORD_UPDATED]: 'Changed account password',
    [ACTIVITY_ACTIONS.CASE_RECORDED]: 'Saved case management details',
    [ACTIVITY_ACTIONS.STUDENT_CREATED]: 'Added a student',
    [ACTIVITY_ACTIONS.STUDENT_UPDATED]: 'Updated a student record',
    [ACTIVITY_ACTIONS.STUDENT_TRASHED]: 'Moved a student to Trash',
    [ACTIVITY_ACTIONS.STUDENT_RESTORED]: 'Restored a student from Trash',
    [ACTIVITY_ACTIONS.STUDENT_DELETED]: 'Permanently deleted a student record',
    [ACTIVITY_ACTIONS.VIOLATION_RECORDED]: 'Recorded a violation',
    [ACTIVITY_ACTIONS.VIOLATION_UPDATED]: 'Updated a violation record',
    [ACTIVITY_ACTIONS.VIOLATION_STATUS_UPDATED]: 'Updated a case status',
    [ACTIVITY_ACTIONS.SUSPENSION_DATES_UPDATED]: 'Updated suspension dates',
    [ACTIVITY_ACTIONS.HANDBOOK_UPDATED]: 'Updated handbook rules or catalog',
  }
  return labels[action] || 'System activity'
}

// Reasons recorded by the server-side failed sign-in logger (api/log-failed-login.js).
export const FAILED_LOGIN_REASONS = Object.freeze({
  INVALID_CREDENTIALS: 'invalid_credentials',
  DOMAIN_NOT_ALLOWED: 'domain_not_allowed',
  RATE_LIMITED: 'rate_limited',
  ACCOUNT_DISABLED: 'account_disabled',
  NOT_PROVISIONED: 'not_provisioned',
  WRONG_ACCOUNT_TYPE: 'wrong_account_type',
  UNKNOWN_ERROR: 'unknown_error',
})

export function getFailedLoginReasonLabel(reason) {
  const labels = {
    [FAILED_LOGIN_REASONS.INVALID_CREDENTIALS]: 'wrong email or password',
    [FAILED_LOGIN_REASONS.DOMAIN_NOT_ALLOWED]: 'email outside the school domain',
    [FAILED_LOGIN_REASONS.RATE_LIMITED]: 'too many attempts',
    [FAILED_LOGIN_REASONS.ACCOUNT_DISABLED]: 'account disabled',
    [FAILED_LOGIN_REASONS.NOT_PROVISIONED]: 'account not provisioned for SARES',
    [FAILED_LOGIN_REASONS.WRONG_ACCOUNT_TYPE]: 'wrong account type selected',
    [FAILED_LOGIN_REASONS.UNKNOWN_ERROR]: 'unexpected error',
  }
  return labels[reason] || ''
}

// Fire-and-forget: a logging failure must never block or change the sign-in result.
export function reportFailedLogin({ email, reason, accountType, idToken = '' }) {
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (idToken) headers.Authorization = `Bearer ${idToken}`
    fetch('/api/log-failed-login', {
      method: 'POST',
      headers,
      keepalive: true,
      body: JSON.stringify({
        email: String(email || '').slice(0, 254),
        reason,
        account_type: accountType || '',
      }),
    }).catch(() => {})
  } catch {
    // Ignore: logging is best-effort.
  }
}
