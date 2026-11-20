import { useState } from 'react'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { Save } from 'lucide-react'
import { db } from './firebase'
import { useAuthProfile } from './authContext'
import { ACTIVITY_ACTIONS, recordActivity } from './activityLog'
import {
  getSchoolYearKey,
  getSchoolYearRange,
  getSchoolYearStarts,
  isSchoolYearStartConfigured,
  setSchoolYearStarts,
  validateSchoolYearStarts,
} from './schoolCalendar'

function formatLongDate(isoDate) {
  const [year, month, day] = String(isoDate || '').split('-').map(Number)
  if (!year) return ''
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Rule Management → School Year. The superadmin sets each school year's opening
 * day; every account uses it to decide which school year a case belongs to.
 */
export default function SchoolCalendarPanel() {
  const { userProfile, ruleRevision } = useAuthProfile()
  const canEdit = userProfile?.role === 'superadmin'
  const currentStartYear = Number(getSchoolYearKey(todayIso()).split('-')[0])
  const startYears = [currentStartYear - 1, currentStartYear, currentStartYear + 1]

  // Draft keyed by start year; '' means "use the default (June 1)".
  const [draft, setDraft] = useState(() => getSchoolYearStarts())
  const [draftRevision, setDraftRevision] = useState(ruleRevision)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Reload the draft when the saved calendar changes (e.g. saved from another device).
  if (draftRevision !== ruleRevision && !saving) {
    setDraftRevision(ruleRevision)
    setDraft(getSchoolYearStarts())
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    const entries = Object.fromEntries(Object.entries(draft).filter(([, value]) => value))
    const { valid, errors } = validateSchoolYearStarts(entries)
    if (errors.length) {
      setError(errors.join(' '))
      return
    }
    setSaving(true)
    try {
      await setDoc(doc(db, 'rules', 'school_calendar'), {
        school_year_starts: valid,
        updated_at: serverTimestamp(),
      })
      setSchoolYearStarts(valid)
      await recordActivity(userProfile, ACTIVITY_ACTIONS.HANDBOOK_UPDATED, 'handbook', 'school_calendar')
      setMessage('School year opening days saved. New cases use them; recorded cases keep their school year.')
    } catch (saveError) {
      console.error('Failed to save the school calendar:', saveError)
      setError('The school calendar could not be saved. Check your access and connection, then try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="rm-editor-panel" onSubmit={handleSave} data-help-target="rule-school-calendar">
      <div className="rm-editor-heading">
        <div>
          <h2>School Year Calendar</h2>
          <p>
            Set the opening day of each school year, as announced by DepEd or the school. It decides which school year a
            case belongs to, so offense counts restart on the right day. Years left blank start on June 1.
          </p>
        </div>
        {canEdit && (
          <button className="rm-apply-btn rm-save-btn" type="submit" disabled={saving}>
            <Save size={16} aria-hidden="true" /> {saving ? 'Saving...' : 'Save Calendar'}
          </button>
        )}
      </div>

      {!canEdit && <p>Only the superadmin can change the school calendar.</p>}
      {message && <p className="rm-panel-message" role="status">{message}</p>}
      {error && <p className="rm-panel-error" role="alert">{error}</p>}

      <div className="rm-calendar-list">
        {startYears.map((startYear) => {
          const key = `${startYear}-${startYear + 1}`
          const value = draft[String(startYear)] || ''
          const savedRange = getSchoolYearRange(key)
          return (
            <div key={startYear} className="rm-calendar-row">
              <div>
                <h3>
                  SY {key}
                  {startYear === currentStartYear && <span className="rm-calendar-current">Current</span>}
                </h3>
                <p>
                  {formatLongDate(savedRange.start)} – {formatLongDate(savedRange.end)}
                  {!isSchoolYearStartConfigured(startYear) && ' (default)'}
                </p>
              </div>
              <label>
                <span>Opening day</span>
                <input
                  type="date"
                  value={value}
                  min={`${startYear}-01-01`}
                  max={`${startYear}-12-31`}
                  disabled={!canEdit}
                  onChange={(event) => setDraft((current) => ({ ...current, [String(startYear)]: event.target.value }))}
                />
              </label>
            </div>
          )
        })}
      </div>

      <p className="rm-calendar-note">
        Set the opening day before classes start. Cases already recorded keep the school year they were saved with, so
        changing a date later does not move them between years.
      </p>
    </form>
  )
}
