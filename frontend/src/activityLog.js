import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

export const ACTIVITY_ACTIONS = Object.freeze({
  LOGIN_SUCCESS: 'login_success',
  LOGOUT: 'logout',
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
    [ACTIVITY_ACTIONS.LOGOUT]: 'Signed out',
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
