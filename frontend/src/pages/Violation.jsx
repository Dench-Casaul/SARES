import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { collection, getDocs, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useAuthProfile } from '../authContext'
import { queryForUserScope } from '../firestoreAccess'
import { isRecordInTrash } from '../recordStatus'
import { getSchoolScopeForYear } from '../schoolScope'
import { formatIdentifiedSanction } from '../engine/sanctionLabel'
import { getViolationDescription } from '../engine/violationDescription'
import { ACTIVITY_ACTIONS, recordActivity } from '../activityLog'
import { getNavItems } from '../navigation'
import { useLogout } from '../useLogout'
import { getInitialStatusFields } from '../caseStatus'
import { getParentRequirementsForSanction } from '../parentInvolvement'
import {
  buildViolationRecordsForStudents,
  evaluateSaresRecommendation,
  findOffenseNumberChanges,
} from '../engine/ruleEngine'
import { saveViolationsWithCaseNumbers } from '../engine/incidentCaseNumber'
import { fetchRecentViolations, fetchViolationsForStudents } from '../violationQueries'
import {
  buildOffenseCatalog,
  describeOffenseSelection,
  getOffenseSelectionMethod,
  redactStudentNames,
} from '../engine/offenseRecommendation'
import {
  getOffenseById,
  getSubcategories,
  listOffenseGroups,
  listOffensesByGroup,
  getHandbook,
} from '../data/handbookIndex'
import '../css/Violation.css'
import wesleyLogo from '../assets/wesley-logo.png'
import {
  LogOut,
  Menu,
  X,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  Sparkles,
} from 'lucide-react'

function Sidebar({ activePage, handleLogout, isOpen, toggleSidebar, userProfile }) {
  return (
    <div className={`v-sidebar${isOpen ? ' v-sidebar--open' : ''}`}>
      <div className="v-logo">
        <div className="v-logo-icon">
          <img src={wesleyLogo} alt="Olongapo Wesley School Logo" className="school-logo" />
        </div>
        <h1>SARES</h1>
      </div>
      <nav className="v-nav">
        {getNavItems(userProfile).map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} onClick={toggleSidebar} className={`v-nav-item${activePage === to ? ' active' : ''}`}>
            <Icon className="v-nav-icon" /><span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="v-logout-section">
        <button className="v-logout" onClick={handleLogout}>
          <LogOut className="v-nav-icon" /><span>Logout</span>
        </button>
      </div>
    </div>
  )
}

// The narrative comes first; the AI recommends the matching handbook offense from it,
// the counselor confirms one, and the rule engine decides the sanction.
const STEPS = ['Student & Date', 'Incident Report', 'Recommended Offense', 'Review']
const STEP = Object.freeze({ STUDENT: 0, REPORT: 1, OFFENSE: 2, REVIEW: 3 })

const LEVEL_LABELS = {
  light: 'Light',
  less_serious: 'Less Serious',
  serious: 'Serious',
  very_serious: 'Very Serious',
}

const CONFIDENCE_LABELS = { high: 'High match', medium: 'Possible match', low: 'Weak match' }

// The history table shows only the latest cases; the full history is on the Reports page.
const RECENT_HISTORY_LIMIT = 50

const splitStudentName = (fullName = '') => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' ') || '',
  }
}

const formatStudentName = (student) => [
  student.first_name,
  student.middle_name,
  student.last_name,
].map((name) => String(name || '').trim()).filter(Boolean).join(' ') || student.full_name || ''

const formatApplicablePolicyReference = ({
  handbookNumber,
  groupTitle,
  specificViolation,
  offenseTypeLabel,
  subcategoryLabel,
}) => {
  const number = Number(handbookNumber)
  const numberLabel = Number.isFinite(number) ? `Handbook Number ${number}` : 'Handbook policy'
  const policyTitle = [groupTitle, specificViolation].filter(Boolean).join(' – ')
  const classification = [offenseTypeLabel, subcategoryLabel].filter(Boolean).join(' / ')
  const details = [policyTitle, classification ? `(${classification})` : ''].filter(Boolean).join(' ')

  return details ? `${numberLabel}: ${details}` : numberLabel
}

export default function Violation() {
  const { userProfile, rulesStatus, ruleRevision } = useAuthProfile()
  const rulesReady = rulesStatus === 'ready'
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [students, setStudents] = useState([])
  const [studentQuery, setStudentQuery] = useState('')
  const [studentMenuOpen, setStudentMenuOpen] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [useAiAssistance, setUseAiAssistance] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [aiSuggestionSource, setAiSuggestionSource] = useState('')
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false)
  const [aiSuggestionError, setAiSuggestionError] = useState('')
  const [aiCounselorRecommendation, setAiCounselorRecommendation] = useState('')
  const [aiCounselorRecommendationSource, setAiCounselorRecommendationSource] = useState('')
  const [aiCounselorRecommendationLoading, setAiCounselorRecommendationLoading] = useState(false)
  const [aiCounselorRecommendationError, setAiCounselorRecommendationError] = useState('')
  // AI offense recommendation from the narrative: [{ offenseId, confidence, reason, offense }]
  const [offenseSuggestions, setOffenseSuggestions] = useState([])
  const [offenseSuggestionStatus, setOffenseSuggestionStatus] = useState('idle') // idle | loading | ready | error
  const [offenseSuggestionError, setOffenseSuggestionError] = useState('')
  const [offenseSuggestionNarrative, setOffenseSuggestionNarrative] = useState(null)
  const [showManualBrowser, setShowManualBrowser] = useState(false)
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false)
  const offenseSuggestionRequest = useRef(0)

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    student_id: '',
    incident_date: today,
    offense_type: '',       // 'minor' | 'major'
    subcategory_id: '',     // 'light' | 'less_serious' | 'serious' | 'very_serious'
    group_number: null,     // handbookNumber
    group_title: '',
    offense_id: '',         // e.g. "m-l-1-1"
    offense_title: '',
    handling_path: 'sanction',
    incident_description: '',
    witnesses: '',
    reported_by: '',
    reporter_role: 'staff',
    reporter_contact: '',
  })

  const [recommendation, setRecommendation] = useState(null)
  // The involved students' own cases, used to count offenses (not every violation in the system).
  const [existingViolations, setExistingViolations] = useState([])
  const [recentViolations, setRecentViolations] = useState([])
  const [currentPage, setCurrentPage] = useState(1)

  const handleLogout = useLogout()

  const fetchStudents = async () => {
    try {
      const snap = await getDocs(queryForUserScope(collection(db, 'students'), userProfile))
      setStudents(snap.docs.filter(d => !isRecordInTrash(d.data())).map(d => {
        const data = d.data()
        const parsedName = splitStudentName(data.full_name || data.name || '')
        return {
          ...data,
          __docId: d.id,
          student_id: data.student_id || d.id,
          school_scope: data.school_scope || getSchoolScopeForYear(data.year_level || data.year),
          first_name: data.first_name || parsedName.first_name,
          middle_name: data.middle_name || '',
          last_name: data.last_name || parsedName.last_name,
        }
      }))
    } catch { alert('Failed to load students.') }
  }

  const incidentStudentIds = () => (
    selectedStudents.length > 0 ? selectedStudents.map((student) => student.student_id) : [form.student_id]
  ).filter(Boolean)

  // Offense numbers only depend on the involved students' own cases, so only those are read.
  const loadViolations = async (studentIds = incidentStudentIds()) => {
    const records = await fetchViolationsForStudents(userProfile, studentIds)
    records.sort((a, b) => {
      const timeA = a.created_at?.seconds || 0
      const timeB = b.created_at?.seconds || 0
      return timeB - timeA
    })
    return records
  }

  const fetchViolations = async (studentIds) => {
    try {
      setExistingViolations(await loadViolations(studentIds))
    } catch (error) {
      // The submit step reads these again and stops if anything changed.
      console.error("Failed to load the students' previous cases:", error)
    }
  }

  const fetchRecentHistory = async () => {
    try {
      setRecentViolations(await fetchRecentViolations(userProfile, RECENT_HISTORY_LIMIT))
    } catch (error) {
      console.error('Failed to load recent violations:', error)
    }
  }

  useEffect(() => {
    if (!userProfile) return
    fetchStudents()
    fetchRecentHistory()
  }, [userProfile])

  useEffect(() => {
    const prefill = location.state?.prefillStudentId
    const prefillViolation = location.state?.prefillViolation
    if (!prefill || students.length === 0) return
    const matched = students.find(s => String(s.student_id) === String(prefill))
    if (!matched) return
    setForm(f => ({
      ...f,
      student_id: String(matched.student_id),
      offense_type: prefillViolation?.offense_type || f.offense_type,
      subcategory_id: prefillViolation?.subcategory_id || f.subcategory_id,
      group_number: prefillViolation?.group_number ?? f.group_number,
      group_title: prefillViolation?.group_title || f.group_title,
      offense_id: prefillViolation?.offense_id || f.offense_id,
      offense_title: prefillViolation?.offense_title || f.offense_title,
      incident_description: prefillViolation?.incident_description || f.incident_description,
    }))
    setStudentQuery(matched.full_name || '')
    setStep(STEP.REPORT)
    fetchViolations([matched.student_id]) // This student's cases, for offense counting
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.state, students])

  const filteredStudents = students.filter(s => {
    const q = studentQuery.trim().toLowerCase()
    if (!q) return true
    return (s.full_name || '').toLowerCase().includes(q) ||
      (s.first_name || '').toLowerCase().includes(q) ||
      (s.middle_name || '').toLowerCase().includes(q) ||
      (s.last_name || '').toLowerCase().includes(q) ||
      String(s.student_number || '').toLowerCase().includes(q)
  })

  const selectedStudent = students.find(s => String(s.student_id) === String(form.student_id))
  const selectedStudentRecommendations = useMemo(() => {
    const targets = selectedStudents.length > 0
      ? selectedStudents
      : selectedStudent ? [selectedStudent] : [];
    return targets.map((target) => {
      const student = students.find((item) => String(item.student_id) === String(target.student_id))
      const yearLevel = student?.year_level || target.year_level || student?.year
      const schoolScope = student?.school_scope || getSchoolScopeForYear(yearLevel)
      return {
        studentId: target.student_id,
        studentName: target.full_name || student?.full_name || '',
        yearLevel,
        ...evaluateSaresRecommendation({
          offenseType: form.offense_type,
          offenseId: form.offense_id,
          studentId: target.student_id,
          incidentDate: form.incident_date,
          subcategoryId: form.subcategory_id,
          schoolScope,
          yearLevel,
          existingViolations,
          currentIncident: { incident_date: form.incident_date },
        }),
      }
    })
  // ruleRevision: the handbook lives in module state, so recompute when the school's rules change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudents, selectedStudent, students, form.offense_type, form.offense_id, form.incident_date, form.subcategory_id, existingViolations, ruleRevision])

  const beyondScheduleRecs = selectedStudentRecommendations.filter((rec) => rec.beyondSchedule)

  const removeSelectedStudent = (studentId) => {
    const normalizedStudentId = String(studentId)
    const remaining = selectedStudents.filter((student) => String(student.student_id) !== normalizedStudentId)
    setSelectedStudents(remaining)
    setForm((currentForm) => (
      String(currentForm.student_id) === normalizedStudentId
        ? { ...currentForm, student_id: remaining.at(-1)?.student_id || '' }
        : currentForm
    ))
  }

  // Compute recommendation when we reach the sanction step
  useEffect(() => {
    if (!form.offense_id || !form.student_id) return
    const rec = evaluateSaresRecommendation({
      offenseType: form.offense_type,
      offenseId: form.offense_id,
      studentId: form.student_id,
      incidentDate: form.incident_date,
      subcategoryId: form.subcategory_id,
      schoolScope: selectedStudent?.school_scope || getSchoolScopeForYear(selectedStudent?.year_level || selectedStudent?.year),
      yearLevel: selectedStudent?.year_level || selectedStudent?.year,
      existingViolations,
      currentIncident: { incident_date: form.incident_date },
    })
    setRecommendation(rec)
  }, [form.offense_id, form.offense_type, form.subcategory_id, form.incident_date, form.student_id, selectedStudent?.school_scope, selectedStudent?.year_level, selectedStudent?.year, existingViolations, ruleRevision])

  // Narrative sent to AI: the selected students' names are replaced with "Student A", "Student B", …
  const narrativeStudents = (selectedStudents.length > 0 ? selectedStudents : (selectedStudent ? [selectedStudent] : []))
    .map((target) => students.find((item) => String(item.student_id) === String(target.student_id)) || target)
  const aiNarrative = redactStudentNames(form.incident_description.trim(), narrativeStudents)

  const requestOffenseSuggestions = async (narrative) => {
    const requestId = ++offenseSuggestionRequest.current
    setOffenseSuggestionNarrative(narrative)
    setOffenseSuggestions([])
    setOffenseSuggestionError('')
    setOffenseSuggestionStatus('loading')
    try {
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) throw new Error('Sign in again to use AI assistance.')
      const response = await fetch('/api/recommend-offense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          incidentDescription: narrative,
          catalog: buildOffenseCatalog(getHandbook()),
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(result?.matches)) {
        throw new Error(result?.error || `AI offense recommendation failed (${response.status}).`)
      }
      // Only offenses that exist in this school's current handbook are shown.
      const matches = result.matches
        .map((match) => ({ ...match, offense: getOffenseById(match.offenseId) }))
        .filter((match) => match.offense)
      if (requestId !== offenseSuggestionRequest.current) return
      setOffenseSuggestions(matches)
      setOffenseSuggestionStatus('ready')
      if (matches.length === 0) setShowManualBrowser(true)
    } catch (error) {
      if (requestId !== offenseSuggestionRequest.current) return
      console.error('Failed to recommend an offense:', error)
      setOffenseSuggestionError(error instanceof Error ? error.message : 'AI offense recommendation is unavailable.')
      setOffenseSuggestionStatus('error')
      setShowManualBrowser(true)
    }
  }

  const goNext = async () => {
    if (step === STEP.STUDENT) {
      if (selectedStudents.length === 0 && !form.student_id) { alert('Please select at least one student.'); return }
      if (!form.incident_date) { alert('Please select a date.'); return }
      await fetchViolations()
    }
    if (step === STEP.REPORT) {
      if (!form.incident_description.trim()) {
        alert('Describe what happened. The matching handbook offense is recommended from this narrative.')
        return
      }
      if (!form.reported_by.trim()) { alert('Please enter who reported this incident.'); return }
      // Re-run the recommendation only when the narrative changed since the last request.
      if (aiNarrative !== offenseSuggestionNarrative) requestOffenseSuggestions(aiNarrative)
      setStep(STEP.OFFENSE)
      return
    }
    if (step === STEP.OFFENSE && !form.offense_id) {
      alert('Confirm one of the recommended offenses, or select one from the handbook.')
      return
    }
    if (step === STEP.OFFENSE && offenseSuggestionStatus === 'loading') {
      // The counselor chose manually before the AI answered: ignore the late answer so the
      // stored audit (suggestions vs. confirmed offense) reflects what the counselor saw.
      offenseSuggestionRequest.current += 1
      setOffenseSuggestionStatus('skipped')
    }
    if (step === STEP.OFFENSE && useAiAssistance) {
      setAiSuggestion('')
      setAiSuggestionSource('')
      setAiSuggestionError('')
      setAiSuggestionLoading(true)
      try {
        const idToken = await auth.currentUser?.getIdToken()
        if (!idToken) throw new Error('Sign in again to use AI assistance.')
        const response = await fetch('/api/generate-prevention-suggestion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            incidentDescription: aiNarrative,
            offenseCategory: form.group_title,
            offenseType: form.offense_title,
          }),
        })
        const result = await response.json()
        if (!response.ok || !result?.suggestion) {
          throw new Error(result?.error || 'AI assistance is currently unavailable.')
        }
        setAiSuggestion(result.suggestion)
        setAiSuggestionSource(result.source || 'gemini')
      } catch (error) {
        console.error('Failed to generate AI prevention suggestion:', error)
        const details = error instanceof Error ? error.message : 'AI assistance is currently unavailable.'
        const fallback = 'AI assistance is unavailable right now. You can continue without an AI suggestion.'
        setAiSuggestionError(details && details !== 'AI assistance is currently unavailable.' ? `${details} You can continue without an AI suggestion.` : fallback)
      } finally {
        setAiSuggestionLoading(false)
      }
    }
    if (step === STEP.OFFENSE) {
      setAiCounselorRecommendation('')
      setAiCounselorRecommendationSource('')
      setAiCounselorRecommendationError('')
      setAiCounselorRecommendationLoading(true)
      try {
        const idToken = await auth.currentUser?.getIdToken()
        if (!idToken) throw new Error('Sign in again to use AI assistance.')

        const handbook = getHandbook()
        const handbookType = handbook.offenseTypes?.find((type) => type.id === form.offense_type)
        const offenseGroup = handbook.offenseGroups?.find((group) =>
          group.categoryId === form.offense_type
          && group.subcategoryId === form.subcategory_id
          && Number(group.handbookNumber) === Number(form.group_number)
        )
        const offense = offenseGroup?.offenses?.find((item) => item.id === form.offense_id)
        const offenseTypeLabel = handbookType?.label || form.offense_type
        const subcategoryLabel = handbookType?.subcategories?.find((item) => item.id === form.subcategory_id)?.label || form.subcategory_id
        const offenseGroupTitle = offenseGroup?.groupTitle || form.group_title
        const specificViolationTitle = offense?.title || form.offense_title
        const selectedSchoolScope = selectedStudent?.school_scope
          || getSchoolScopeForYear(selectedStudent?.year_level || selectedStudent?.year)
        const selectedSanctionSchedule = (handbookType?.sanctionSchedule || []).filter((rule) =>
          rule.subcategoryId === form.subcategory_id && rule.schoolScope === selectedSchoolScope
        )
        const applicablePolicyReference = formatApplicablePolicyReference({
          handbookNumber: offenseGroup?.handbookNumber ?? form.group_number,
          groupTitle: offenseGroupTitle,
          specificViolation: specificViolationTitle,
          offenseTypeLabel,
          subcategoryLabel,
        })
        const handbookPolicy = {
          offenseType: offenseTypeLabel,
          subcategory: subcategoryLabel,
          schoolScope: selectedSchoolScope,
          offenseGroup: offenseGroupTitle,
          specificViolation: specificViolationTitle,
          handbookNumber: offenseGroup?.handbookNumber ?? form.group_number,
          countingNote: handbookType?.countingNote || '',
          sanctionSchedule: selectedSanctionSchedule,
          selectedOffenseNumber: recommendation?.offenseNumber,
          selectedSanction: recommendation?.recommendedSanction,
          authorityNote: handbookType?.authorityNote || '',
        }
        const response = await fetch('/api/generate-counselor-recommendation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            incidentDescription: aiNarrative,
            offenseType: offenseTypeLabel,
            subcategory: subcategoryLabel,
            offenseGroup: offenseGroupTitle,
            specificViolation: specificViolationTitle,
            applicablePolicyReference,
            ruleBasedSanction: recommendation?.recommendedSanction || '',
            handlingPath: form.handling_path,
            handbookPolicy: JSON.stringify(handbookPolicy),
          }),
        })
        const responseText = await response.text()
        let result
        try {
          result = responseText ? JSON.parse(responseText) : null
        } catch (parseError) {
          throw new Error(response.ok
            ? 'AI recommendation service returned an invalid response.'
            : `AI recommendation service failed (${response.status}).`)
        }
        if (!response.ok || !result?.recommendation) {
          throw new Error(result?.error || `AI recommendation service returned no recommendation (${response.status}).`)
        }
        setAiCounselorRecommendation(result.recommendation)
        setAiCounselorRecommendationSource(result.source || 'gemini')
      } catch (error) {
        console.error('Failed to generate AI counselor recommendation:', error)
        setAiCounselorRecommendationError(
          error instanceof Error ? error.message : 'AI counselor guidance is currently unavailable.'
        )
        setAiCounselorRecommendationSource('unavailable')
      } finally {
        setAiCounselorRecommendationLoading(false)
      }
    }
    setStep(s => s + 1)
  }

  const goBack = () => setStep(s => s - 1)

  const pickOffenseType = (type) => {
    setForm(f => ({ ...f, offense_type: type, subcategory_id: '', group_number: null, group_title: '', offense_id: '', offense_title: '' }))
  }

  const pickSubcategory = (subId) => {
    setForm(f => ({ ...f, subcategory_id: subId, group_number: null, group_title: '', offense_id: '', offense_title: '' }))
  }

  /** Confirms an AI-recommended offense: fills the full classification from the handbook. */
  const pickSuggestion = (suggestion) => {
    const { offense } = suggestion
    setForm(f => ({
      ...f,
      offense_type: offense.group.categoryId,
      subcategory_id: offense.group.subcategoryId,
      group_number: offense.group.handbookNumber,
      group_title: offense.group.groupTitle,
      offense_id: offense.id,
      offense_title: offense.title,
    }))
  }

  const pickGroup = (group) => {
    setForm(f => ({ ...f, group_number: group.handbookNumber, group_title: group.groupTitle, offense_id: '', offense_title: '' }))
  }

  const pickOffense = (offense) => {
    setForm(f => ({ ...f, offense_id: offense.id, offense_title: offense.title }))
  }

  const additionalDetailsCount = [form.reporter_contact, form.witnesses]
    .filter((value) => value.trim()).length

  const offenseSuggestionSource = {
    ready: 'gemini',
    error: 'unavailable',
    skipped: 'skipped',
  }[offenseSuggestionStatus] || 'not_requested'
  const offenseSelectionSummary = describeOffenseSelection(
    getOffenseSelectionMethod(offenseSuggestions, form.offense_id),
    offenseSuggestionSource
  )

  const handleSubmit = async () => {
    if (!recommendation) return
    if (!rulesReady) {
      alert(rulesStatus === 'error'
        ? 'The school handbook rules could not be loaded. Reload the page before recording this case.'
        : 'The school handbook rules are still loading. Please wait a moment and try again.')
      return
    }
    setSubmitting(true)
    try {
      const studentsToRecord = (selectedStudents.length > 0
        ? selectedStudents
        : (selectedStudent ? [selectedStudent] : [])).map((student) => ({
          ...student,
          school_scope: student.school_scope || getSchoolScopeForYear(student.year_level || student.year),
        }))
      const isMediation = form.handling_path === 'mediation'

      // Offense numbers shown on the review step were computed from violations loaded
      // when the page opened. Re-read them now so a case recorded meanwhile (e.g. by
      // another counselor) is counted, and stop if any student's number changed.
      const freshViolations = await loadViolations(studentsToRecord.map((student) => student.student_id))
      const changedOffenseNumbers = findOffenseNumberChanges({
        students: studentsToRecord,
        offense: {
          offenseType: form.offense_type,
          offenseId: form.offense_id,
          incidentDate: form.incident_date,
          subcategoryId: form.subcategory_id,
        },
        before: existingViolations,
        after: freshViolations,
      })
      setExistingViolations(freshViolations)
      if (changedOffenseNumbers.length > 0) {
        alert(
          'Another case was recorded for this student since you opened this form, so the offense number changed:\n\n'
          + changedOffenseNumbers.map((change) => (
            `• ${change.student.full_name || change.student.student_id}: ${change.beforeLabel} → ${change.afterLabel}`
          )).join('\n')
          + '\n\nPlease review the updated recommended sanction, then submit again.'
        )
        return
      }

      const baseIncidentData = {
        incident_date: form.incident_date,
        incident_description: form.incident_description,
        witnesses: form.witnesses.trim(),
        reported_by: form.reported_by.trim(),
        reporter_role: form.reporter_role,
        reporter_contact: form.reporter_contact.trim(),
        offense_type: form.offense_type,
        intervention_type: isMediation ? 'mediation' : 'sanction',
        mediation_status: isMediation ? 'pending' : null,
        subcategory_id: form.subcategory_id,
        group_number: form.group_number,
        group_title: form.group_title,
        offense_id: form.offense_id,
        offense_variety: form.offense_title,
        category_name: form.group_title,
        offense_number: recommendation.offenseNumber,
        cumulative_offense_number: recommendation.offenseNumber,
        recommended_sanction: recommendation.recommendedSanction,
        generated_explanation: '',
        explanation_source: 'not_generated',
        ai_assisted_solution: useAiAssistance ? aiSuggestion : '',
        ai_assisted_solution_source: useAiAssistance
          ? (aiSuggestion ? aiSuggestionSource : 'unavailable')
          : 'not_requested',
        ai_counselor_recommendation: aiCounselorRecommendation.trim(),
        ai_counselor_recommendation_source: aiCounselorRecommendationSource || 'unavailable',
        suggest_authorities: recommendation.suggestAuthorities,
        // AI offense recommendation audit: what the AI suggested and how the counselor chose.
        ai_offense_suggestions: offenseSuggestions.map(({ offenseId, confidence, reason }) => ({
          offense_id: offenseId,
          confidence,
          reason,
        })),
        ai_offense_suggestion_source: offenseSuggestionSource,
        offense_selection_method: getOffenseSelectionMethod(offenseSuggestions, form.offense_id),
        status: isMediation ? 'pending' : 'recorded',
        created_by: userProfile.user_id,
        school_year_key: recommendation.schoolYearKey,
        engine_mode: 'handbook_v2',
        created_at: serverTimestamp(),
        identified_sanction: formatIdentifiedSanction({
          offense_type: form.offense_type,
          subcategory_id: form.subcategory_id,
          school_scope: recommendation.schoolScope,
          offense_number: recommendation.offenseNumber,
          school_year_key: recommendation.schoolYearKey,
          recommended_sanction: recommendation.recommendedSanction,
          intervention_type: isMediation ? 'mediation' : 'sanction',
          status: isMediation ? 'pending' : 'recorded',
        }),
      }

      const payloads = buildViolationRecordsForStudents({
        incidentData: baseIncidentData,
        selectedStudents: studentsToRecord,
        recommendation,
        existingViolations: freshViolations,
      }).map((payload) => ({
        ...payload,
        // Each student's own sanction decides the starting status (e.g. no-readmission).
        ...getInitialStatusFields(payload),
        evidence_urls: [],
      }))

      const savedDocs = await saveViolationsWithCaseNumbers(db, payloads)
      await Promise.all(savedDocs.map((violation) => (
        recordActivity(userProfile, ACTIVITY_ACTIONS.VIOLATION_RECORDED, 'violation', violation.id)
      )))

      const primaryCase = savedDocs[0]
      navigate(`/sares/case-assessment/${primaryCase.id}`, {
        state: {
          caseData: primaryCase,
          groupCaseData: savedDocs,
        },
      })
    } catch (err) {
      console.error(err)
      alert('Failed to submit violation.')
    } finally {
      setSubmitting(false)
    }
  }

  const subcategories = form.offense_type ? getSubcategories(form.offense_type) : []
  const offenseGroups = (form.offense_type && form.subcategory_id)
    ? listOffenseGroups(form.offense_type, form.subcategory_id)
    : []
  const reviewDescription = getViolationDescription({
    incident_description: form.incident_description,
    ai_counselor_recommendation: aiCounselorRecommendation,
    ai_assisted_solution: aiSuggestion,
  })
  // Mediation cases apply no sanction yet, so no parent requirement until escalated.
  const reviewParentRequirements = form.handling_path === 'mediation'
    ? []
    : getParentRequirementsForSanction(recommendation?.recommendedSanction)
  return (
    <div className="v-page">
      {/* Mobile bar */}
      <div className="v-mobile-menu-bar">
        <div className="v-logo">
          <div className="v-logo-icon"><img src={wesleyLogo} alt="Logo" className="school-logo" /></div>
          <h1>SARES</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="v-mobile-menu-btn">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <Sidebar activePage={location.pathname} handleLogout={handleLogout} isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(false)} userProfile={userProfile} />

      <div className="v-main">
        <div className="v-main-header">
          <div>
            <h1 className="v-page-title">Log Violation</h1>
            <p className="v-page-sub">Record a disciplinary incident, reporter, and supporting evidence</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="v-wizard-steps" data-help-target="violation-wizard">
          {STEPS.map((label, i) => (
            <div key={label} data-help-step={i} className={`v-wizard-step ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}>
              <div className="v-wizard-step-circle">
                {i < step ? <CheckCircle size={16} /> : <span>{i + 1}</span>}
              </div>
              <span className="v-wizard-step-label">{label}</span>
              {i < STEPS.length - 1 && <div className="v-wizard-step-line" />}
            </div>
          ))}
        </div>

        <div className="v-directory-card v-form-card" data-help-target="violation-form">

          {/* STEP 0: Student & Date */}
          {step === STEP.STUDENT && (
            <div className="v-step-content">
              <h2 className="v-directory-title">Step 1: Student & Date</h2>
              <p className="v-directory-sub">Select the student and incident date</p>

              <div className="v-field" data-help-target="violation-student-fields" style={{ marginTop: '1.5rem' }}>
                <label className="v-label">Students involved *</label>
                <div className="v-student-combobox">
                  <div className="v-student-combobox-inner">
                    <input
                      type="text"
                      className="v-input v-student-input"
                      autoComplete="off"
                      placeholder="Search or select students"
                      value={studentQuery}
                      onChange={e => {
                        setStudentQuery(e.target.value)
                        setStudentMenuOpen(true)
                        if (!e.target.value.trim()) setForm(f => ({ ...f, student_id: '' }))
                      }}
                      onFocus={() => setStudentMenuOpen(true)}
                      onBlur={() => setTimeout(() => setStudentMenuOpen(false), 175)}
                    />
                    <button type="button" className="v-student-chevron-btn" onMouseDown={e => e.preventDefault()} onClick={() => setStudentMenuOpen(o => !o)}>
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  {studentMenuOpen && (
                    <ul className="v-student-dropdown">
                      {filteredStudents.length === 0
                        ? <li className="v-student-option v-student-option--empty">No matching students.</li>
                        : filteredStudents.map(s => {
                            const isSelected = selectedStudents.some(student => String(student.student_id) === String(s.student_id))
                            return (
                              <li key={s.student_id} className={`v-student-option ${isSelected ? 'selected' : ''}`}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => {
                                  setStudentQuery('')
                                  setStudentMenuOpen(false)
                                  setSelectedStudents(prev => {
                                    const exists = prev.some(student => String(student.student_id) === String(s.student_id))
                                    if (exists) {
                                      return prev.filter(student => String(student.student_id) !== String(s.student_id))
                                    }
                                    return [...prev, {
                                      student_id: String(s.student_id),
                                      full_name: formatStudentName(s),
                                      student_number: s.student_number || '',
                                      year_level: s.year_level || '',
                                    }]
                                  })
                                  setForm(f => ({ ...f, student_id: String(s.student_id) }))
                                }}>
                                <span className="v-student-option-name">{formatStudentName(s)}</span>
                                {s.student_number && <span className="v-student-option-meta">{s.student_number}</span>}
                              </li>
                            )
                          })}
                    </ul>
                  )}
                </div>
                {selectedStudents.length > 0 && (
                  <div className="v-field" style={{ marginTop: '0.75rem' }}>
                    <div className="v-selected-students">
                      <strong>Selected students</strong>
                      <div className="v-selected-student-list">
                        {selectedStudents.map((student) => (
                          <span className="v-selected-student" key={student.student_id}>
                            <span>{student.full_name || student.student_id}</span>
                            <button
                              type="button"
                              className="v-selected-student-remove"
                              aria-label={`Remove ${student.full_name || student.student_id}`}
                              title={`Remove ${student.full_name || student.student_id}`}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => removeSelectedStudent(student.student_id)}
                            >
                              <X size={14} aria-hidden="true" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="v-field" data-help-target="violation-incident-date" style={{ marginTop: '1rem' }}>
                <label className="v-label">Date of Incident *</label>
                <input className="v-input" type="date" value={form.incident_date}
                  onChange={e => setForm(f => ({ ...f, incident_date: e.target.value }))} />
              </div>
            </div>
          )}

          {/* STEP 2: Incident Report — written first; the offense is recommended from it */}
          {step === STEP.REPORT && (
            <div className="v-step-content">
              <h2 className="v-directory-title">Step 2: Incident Report</h2>
              <p className="v-directory-sub">Describe what happened. SARES recommends the matching handbook offense from this narrative in the next step.</p>

              <div className="v-field" style={{ marginTop: '1.5rem' }}>
                <label className="v-label" htmlFor="incident-description">What happened? *</label>
                <textarea
                  id="incident-description"
                  className="v-input v-textarea"
                  rows="6"
                  maxLength={3000}
                  placeholder="Describe the behavior: what was done, where, and how. Example: During recess, a student pushed a classmate against the wall and took their phone."
                  value={form.incident_description}
                  onChange={e => setForm(f => ({ ...f, incident_description: e.target.value }))}
                />
                <p className="v-ai-character-count">{form.incident_description.length} / 3000 characters</p>
              </div>

              <div className="v-ai-privacy-notice" role="note">
                <strong>Privacy warning — keep the narrative anonymous.</strong>
                <p>
                  The narrative is sent to Google Gemini (free tier) to recommend the matching handbook offense and draft counselor guidance. Google may use free-tier content to improve its services. The selected students' names are replaced with "Student A", "Student B" before sending, but do not include other names, student numbers, contact details, health information, or other private details.
                </p>
              </div>

              <div className="v-field" style={{ marginTop: '1.5rem' }}>
                <label className="v-label">Reported by *</label>
                <input
                  className="v-input"
                  type="text"
                  placeholder="Name of the person who reported this incident"
                  value={form.reported_by}
                  onChange={e => setForm(f => ({ ...f, reported_by: e.target.value }))}
                />
              </div>

              <div className="v-field" style={{ marginTop: '1.5rem' }}>
                <label className="v-label">Reporter role *</label>
                <select
                  className="v-input"
                  value={form.reporter_role}
                  onChange={e => setForm(f => ({ ...f, reporter_role: e.target.value }))}
                >
                  <option value="staff">Staff</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                  <option value="parent">Parent / Guardian</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Optional details printed on the incident report; collapsed to keep the required input short. */}
              <button
                type="button"
                className="v-text-button v-manual-toggle"
                aria-expanded={showAdditionalDetails}
                aria-controls="incident-additional-details"
                onClick={() => setShowAdditionalDetails((open) => !open)}
              >
                {showAdditionalDetails ? 'Hide additional details' : 'Add reporter contact or witnesses (optional)'}
                {!showAdditionalDetails && additionalDetailsCount > 0 && ` · ${additionalDetailsCount} added`}
              </button>

              {showAdditionalDetails && (
                <div id="incident-additional-details" className="v-additional-details">
                  <div className="v-field">
                    <label className="v-label" htmlFor="reporter-contact">Reporter contact</label>
                    <input
                      id="reporter-contact"
                      className="v-input"
                      type="text"
                      placeholder="Phone or email, for follow-up"
                      value={form.reporter_contact}
                      onChange={e => setForm(f => ({ ...f, reporter_contact: e.target.value }))}
                    />
                  </div>

                  <div className="v-field" style={{ marginTop: '1.25rem' }}>
                    <label className="v-label" htmlFor="incident-witnesses">Witnesses</label>
                    <textarea
                      id="incident-witnesses"
                      className="v-input v-textarea"
                      rows="2"
                      placeholder="One name per line. Each witness gets a signature row on the printed incident report."
                      value={form.witnesses}
                      onChange={e => setForm(f => ({ ...f, witnesses: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Recommended Offense — AI suggests, counselor confirms */}
          {step === STEP.OFFENSE && (
            <div className="v-step-content">
              <h2 className="v-directory-title">Step 3: Recommended Offense</h2>
              <p className="v-directory-sub">Matched from the incident narrative against the school handbook. Confirm the offense that fits, or browse the handbook. The sanction is then decided by the handbook rules.</p>

              <div className="v-suggestions" aria-live="polite">
                {offenseSuggestionStatus === 'loading' && (
                  <p className="v-suggestion-status" role="status">
                    <Sparkles size={16} aria-hidden="true" /> Reading the incident report and matching it to the handbook…
                  </p>
                )}
                {(offenseSuggestionStatus === 'error' || offenseSuggestionStatus === 'skipped') && (
                  <div className="v-suggestion-status v-suggestion-status--warning" role="alert">
                    <p>
                      {offenseSuggestionStatus === 'error'
                        ? `${offenseSuggestionError} Select the offense from the handbook below.`
                        : 'The AI recommendation was skipped. Select the offense from the handbook below.'}
                    </p>
                    <button type="button" className="v-text-button" onClick={() => requestOffenseSuggestions(aiNarrative)}>
                      Try again
                    </button>
                  </div>
                )}
                {offenseSuggestionStatus === 'ready' && offenseSuggestions.length === 0 && (
                  <p className="v-suggestion-status v-suggestion-status--warning" role="status">
                    No handbook offense clearly matches this narrative. Select the offense from the handbook below, or go back and add detail to the narrative.
                  </p>
                )}
                {offenseSuggestionStatus === 'ready' && offenseSuggestions.length > 0 && (
                  <div className="v-suggestion-list" role="radiogroup" aria-label="Recommended offenses">
                    {offenseSuggestions.map((suggestion, index) => {
                      const { offense } = suggestion
                      const isSelected = form.offense_id === suggestion.offenseId
                      return (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          key={suggestion.offenseId}
                          className={`v-suggestion-card ${isSelected ? 'selected' : ''} ${offense.group.categoryId === 'major' ? 'major' : ''}`}
                          onClick={() => pickSuggestion(suggestion)}
                        >
                          <span className="v-suggestion-head">
                            <span className={`v-suggestion-confidence v-suggestion-confidence--${suggestion.confidence}`}>
                              {index === 0 ? 'Best match · ' : ''}{CONFIDENCE_LABELS[suggestion.confidence]}
                            </span>
                            {isSelected && <CheckCircle size={18} className="v-suggestion-check" aria-hidden="true" />}
                          </span>
                          <strong className="v-suggestion-title">
                            {offense.isIllegal && <AlertTriangle size={14} className="v-illegal-icon" aria-label="May involve illegal activity" />}
                            {offense.title}
                          </strong>
                          <span className="v-suggestion-path">
                            {offense.group.categoryId === 'major' ? 'Major' : 'Minor'} › {LEVEL_LABELS[offense.group.subcategoryId]} › {offense.group.groupTitle}
                          </span>
                          {suggestion.reason && <span className="v-suggestion-reason">{suggestion.reason}</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {form.offense_id && !offenseSuggestions.some((suggestion) => suggestion.offenseId === form.offense_id) && (
                <div className="v-selected-offense" role="status">
                  <CheckCircle size={16} aria-hidden="true" />
                  <span>
                    <strong>Selected from the handbook:</strong>{' '}
                    {form.offense_type === 'major' ? 'Major' : 'Minor'} › {LEVEL_LABELS[form.subcategory_id]} › {form.group_title} › {form.offense_title}
                  </span>
                </div>
              )}

              <button
                type="button"
                className="v-text-button v-manual-toggle"
                aria-expanded={showManualBrowser}
                onClick={() => setShowManualBrowser((open) => !open)}
              >
                {showManualBrowser ? 'Hide the handbook' : 'None of these fit? Browse the handbook'}
              </button>

              {showManualBrowser && (
                <div className="v-manual-browser">
                  <div className="v-chip-row" role="group" aria-label="Offense type">
                    {['minor', 'major'].map((type) => (
                      <button
                        type="button"
                        key={type}
                        className={`v-chip ${form.offense_type === type ? 'selected' : ''} ${type === 'major' ? 'major' : ''}`}
                        aria-pressed={form.offense_type === type}
                        onClick={() => { if (form.offense_type !== type) pickOffenseType(type) }}
                      >
                        {type === 'minor' ? 'Minor' : 'Major'}
                      </button>
                    ))}
                  </div>
                  {form.offense_type && (
                    <div className="v-chip-row" role="group" aria-label="Offense level">
                      {subcategories.map((sub) => (
                        <button
                          type="button"
                          key={sub.id}
                          className={`v-chip ${form.subcategory_id === sub.id ? 'selected' : ''} ${form.offense_type === 'major' ? 'major' : ''}`}
                          aria-pressed={form.subcategory_id === sub.id}
                          onClick={() => { if (form.subcategory_id !== sub.id) pickSubcategory(sub.id) }}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {form.offense_type && form.subcategory_id && (
                    <div className="v-groups-list">
                      {offenseGroups.map(group => (
                        <div key={group.handbookNumber} className={`v-group-item ${form.group_number === group.handbookNumber ? 'expanded' : ''}`}>
                          <button type="button" className="v-group-header" onClick={() => pickGroup(group)}>
                            <span>{group.groupTitle}</span>
                            <ChevronRight size={16} className={`v-group-chevron ${form.group_number === group.handbookNumber ? 'rotated' : ''}`} />
                          </button>
                          {form.group_number === group.handbookNumber && (
                            <div className="v-offense-options">
                              {listOffensesByGroup(form.offense_type, form.subcategory_id, group.handbookNumber).map(offense => (
                                <button type="button" key={offense.id}
                                  className={`v-offense-option ${form.offense_id === offense.id ? 'selected' : ''}`}
                                  onClick={() => pickOffense(offense)}>
                                  {offense.isIllegal && <AlertTriangle size={13} className="v-illegal-icon" />}
                                  {offense.title}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="v-field" style={{ marginTop: '1.5rem' }}>
                <label className="v-label">Handling Path</label>
                <select
                  className="v-input"
                  value={form.handling_path}
                  onChange={(e) => setForm(f => ({ ...f, handling_path: e.target.value }))}
                >
                  <option value="sanction">Proceed with sanction recommendation</option>
                  <option value="mediation">Route to mediation first</option>
                </select>
                {form.handling_path === 'mediation' && (
                  <p className="v-directory-sub" style={{ marginTop: '8px' }}>
                    This case will be saved as pending mediation. The handbook sanction remains available if mediation fails or needs escalation.
                  </p>
                )}
              </div>

              <label className="v-ai-toggle">
                <input
                  type="checkbox"
                  checked={useAiAssistance}
                  onChange={(event) => {
                    setUseAiAssistance(event.target.checked)
                    setAiSuggestion('')
                    setAiSuggestionSource('')
                    setAiSuggestionError('')
                  }}
                />
                <span>
                  <strong>Also suggest AI-assisted prevention / alternative solutions</strong>
                  <small>Optional. Uses the same anonymized narrative.</small>
                </span>
              </label>
            </div>
          )}

          {/* STEP 6: Review */}
          {step === STEP.REVIEW && recommendation && (
            <div className="v-step-content">
              <h2 className="v-directory-title">Step 4: Review & Submit</h2>
              <p className="v-directory-sub">Confirm all details before submitting</p>

              <div className="v-review-grid">
                <div className="v-review-section">
                  <h4>Student</h4>
                  <p>{selectedStudent?.full_name}</p>
                  <p className="v-review-meta">{selectedStudent?.student_number} · {selectedStudent?.year_level}</p>
                </div>
                <div className="v-review-section">
                  <h4>Date</h4>
                  <p>{form.incident_date}</p>
                </div>
                <div className="v-review-section">
                  <h4>Offense Classification</h4>
                  <p>
                    <span className={`v-review-badge ${form.offense_type}`}>{form.offense_type === 'minor' ? 'Minor' : 'Major'}</span>
                    {' → '}
                    {subcategories.find(s => s.id === form.subcategory_id)?.label}
                  </p>
                </div>
                <div className="v-review-section">
                  <h4>Violation</h4>
                  <p className="v-review-group">{form.group_title}</p>
                  <p>{form.offense_title}</p>
                  <p className="v-review-meta">{offenseSelectionSummary}</p>
                </div>
                <div className="v-review-section">
                  <h4>Offense Number</h4>
                  <p>{recommendation.offenseLabel}</p>
                </div>
                <div className="v-review-section">
                  <h4>School Level</h4>
                  <p>{recommendation.schoolScope === 'elementary' ? 'Elementary' : recommendation.schoolScope === 'high_school' ? 'High School' : 'Not specified'}</p>
                </div>
                <div className="v-review-section v-review-section--full">
                  <h4>Handling Path</h4>
                  <p className="v-review-sanction">
                    {form.handling_path === 'mediation' ? 'Pending mediation' : 'Proceed with sanction recommendation'}
                  </p>
                </div>
                <div className="v-review-section v-review-section--full">
                  <h4>Recommended Sanction</h4>
                  {selectedStudentRecommendations.length > 1
                    ? selectedStudentRecommendations.map((studentRec) => (
                      <p className="v-review-sanction" key={studentRec.studentId}>
                        <strong>{studentRec.studentName || studentRec.studentId} · {studentRec.schoolScope === 'elementary' ? 'Elementary' : studentRec.schoolScope === 'high_school' ? 'High School' : 'School level not specified'} · {studentRec.offenseLabel}:</strong>{' '}
                        {studentRec.recommendedSanction}
                      </p>
                    ))
                    : <p className="v-review-sanction">{recommendation.recommendedSanction}</p>}
                </div>
                <div className="v-review-section v-review-section--full">
                  <h4>Identified Sanction</h4>
                  {selectedStudentRecommendations.length > 1
                    ? selectedStudentRecommendations.map((studentRec) => (
                      <p className="v-review-sanction" key={studentRec.studentId}>
                        <strong>{studentRec.studentName || studentRec.studentId}:</strong>{' '}
                        {formatIdentifiedSanction({
                          offense_type: studentRec.offenseType,
                          subcategory_id: studentRec.subcategoryId,
                          school_scope: studentRec.schoolScope,
                          offense_number: studentRec.offenseNumber,
                          school_year_key: studentRec.schoolYearKey,
                          recommended_sanction: studentRec.recommendedSanction,
                        })}
                      </p>
                    ))
                    : (
                      <p className="v-review-sanction">
                        {formatIdentifiedSanction({
                          offense_type: form.offense_type,
                          subcategory_id: form.subcategory_id,
                          school_scope: recommendation.schoolScope,
                          offense_number: recommendation.offenseNumber,
                          school_year_key: recommendation.schoolYearKey,
                          recommended_sanction: recommendation.recommendedSanction,
                        })}
                      </p>
                    )}
                </div>
                <div className="v-review-section">
                  <h4>Reported by</h4>
                  <p>{form.reported_by} ({form.reporter_role})</p>
                  {form.reporter_contact && <p className="v-review-meta">{form.reporter_contact}</p>}
                </div>
                <div className="v-review-section v-review-section--full">
                  <h4>{reviewDescription.label}</h4>
                  <p>{reviewDescription.text || 'Not provided'}</p>
                  {reviewDescription.source === 'ai_counselor_recommendation' && (
                    <p className="v-review-meta">
                      Generated from the selected handbook policy. It does not change the formal sanction recommendation.
                    </p>
                  )}
                  {reviewDescription.source === 'ai_assisted_solution' && (
                    <p className="v-review-meta">
                      Source: {aiSuggestionSource || 'Gemini'} · AI-generated guidance for counselor review.
                    </p>
                  )}
                </div>
                {reviewParentRequirements.length > 0 && (
                  <div className="v-review-section v-review-section--full">
                    <h4>Parent/Guardian Involvement</h4>
                    <p>
                      Required by the handbook sanction: {reviewParentRequirements.map((item) => item.label).join(', ')}.
                      Record the outcome from the student's case record.
                    </p>
                  </div>
                )}
                {useAiAssistance && reviewDescription.source !== 'ai_assisted_solution' && (
                  <div className="v-review-section v-review-section--full v-ai-review">
                    <h4>AI-Assisted Prevention / Alternative Suggestion</h4>
                    {aiSuggestionLoading ? (
                      <p>Generating suggestion…</p>
                    ) : aiSuggestion ? (
                      <>
                        <p>{aiSuggestion}</p>
                        <p className="v-review-meta">Source: {aiSuggestionSource || 'Gemini'} · Review and adapt this suggestion; it does not replace school policy or professional judgment.</p>
                      </>
                    ) : (
                      <p>{aiSuggestionError || 'No AI suggestion was generated.'}</p>
                    )}
                  </div>
                )}
                {reviewDescription.source !== 'ai_counselor_recommendation' && <div className="v-review-section v-review-section--full v-ai-review">
                  <h4>AI-Generated Counselor Recommendation</h4>
                    <p className="v-review-meta">
                      Generated from the selected handbook policy and incident details. This recommendation does not change the formal rule-based sanction.
                    </p>
                    {aiCounselorRecommendationLoading ? (
                      <p role="status">Generating recommendation from the handbook…</p>
                    ) : (
                      <>
                        {aiCounselorRecommendationError && (
                          <p className="v-review-meta" role="alert">
                            {aiCounselorRecommendationError}
                          </p>
                        )}
                        {aiCounselorRecommendation && (
                          <p className="v-ai-recommendation-text">{aiCounselorRecommendation}</p>
                        )}
                      </>
                    )}
                </div>}
                {form.witnesses && (
                  <div className="v-review-section v-review-section--full">
                    <h4>Witnesses</h4>
                    <p>{form.witnesses}</p>
                  </div>
                )}
              </div>

              {beyondScheduleRecs.length > 0 && (
                <div className="v-authority-alert" role="alert">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Repeat Offense Beyond Handbook Schedule</strong>
                    <p>
                      {beyondScheduleRecs.map((rec) => `${rec.studentName || 'This student'} (${rec.offenseLabel})`).join(', ')}
                      {' '}exceeded the last offense listed in the handbook (
                      {beyondScheduleRecs[0].scheduleMaxOffense}). The highest listed sanction is applied. Refer to the principal/discipline committee for review.
                    </p>
                  </div>
                </div>
              )}

              {recommendation.suggestAuthorities && (
                <div className="v-authority-alert">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Authority Involvement Suggested</strong>
                    <p>This violation may involve illegal activity. Consider referral to proper authorities at school discretion.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="v-wizard-nav">
            {step > STEP.STUDENT && (
              <button className="v-btn-cancel" onClick={goBack}>
                <ChevronLeft size={16} /> Back
              </button>
            )}
            {step === STEP.STUDENT && <Link to="/sares/dashboard" className="v-btn-cancel v-link-btn">Cancel</Link>}

            {step < STEP.REVIEW && (
              <button className="v-btn-submit" onClick={goNext} disabled={aiSuggestionLoading || aiCounselorRecommendationLoading}>
                {aiSuggestionLoading || aiCounselorRecommendationLoading
                  ? 'Generating guidance…'
                  : <>Next <ChevronRight size={16} /></>}
              </button>
            )}
            {step === STEP.REVIEW && !rulesReady && (
              <p className="v-rules-status" role="status">
                {rulesStatus === 'error'
                  ? 'The school handbook rules could not be loaded. Reload the page before recording this case.'
                  : 'Loading the school handbook rules…'}
              </p>
            )}
            {step === STEP.REVIEW && (
              <button className="v-btn-submit" onClick={handleSubmit} disabled={submitting || !rulesReady}>
                {submitting ? 'Submitting...' : form.handling_path === 'mediation' ? 'Submit for Mediation' : 'Submit Incident Report'}
              </button>
            )}
          </div>

        </div>

        {/* Global Violation History */}
        <div className="v-directory-card" style={{ marginTop: '24px' }}>
          <div className="v-directory-header" style={{ marginBottom: '16px' }}>
            <h2 className="v-directory-title">Recent System Violations</h2>
            <p className="v-directory-sub">The {RECENT_HISTORY_LIMIT} most recently recorded violations. The full history is on the Reports page.</p>
          </div>
          
          {recentViolations.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>No violations recorded yet.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #d8e6f7', color: '#0b4f8a' }}>
                      <th style={{ padding: '12px 16px' }}>Date</th>
                      <th style={{ padding: '12px 16px' }}>Student</th>
                      <th style={{ padding: '12px 16px' }}>Offense</th>
                      <th style={{ padding: '12px 16px' }}>Classification</th>
                      <th style={{ padding: '12px 16px' }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentViolations.slice((currentPage - 1) * 10, currentPage * 10).map((v) => (
                      <tr
                        key={v.id || v.created_at?.seconds || Math.random()}
                        style={{
                          borderBottom: '1px solid #e6edf7',
                          background: v.offense_type === 'major' ? '#fff1f2' : '#ffffff',
                        }}
                      >
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{v.incident_date}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#071f5f' }}>{v.student_name}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#365577' }}>{v.category_name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{v.offense_variety}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ 
                            background: v.subcategory_id === 'very_serious' ? '#fff1f2' : v.subcategory_id === 'serious' ? '#fff7ed' : '#f0f9ff',
                            color: v.subcategory_id === 'very_serious' ? '#be123c' : v.subcategory_id === 'serious' ? '#c2410c' : '#0369a1',
                            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, textTransform: 'capitalize' 
                          }}>
                            {v.subcategory_id?.replace('_', ' ') || 'Minor'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {v.offense_type === 'minor' ? (
                            <span style={{ background: '#f8fafc', color: '#475569', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>Minor</span>
                          ) : (
                            <span style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 8px', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>Major</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {recentViolations.length > 10 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '6px 12px', border: '1px solid #d8e6f7', background: currentPage === 1 ? '#f1f5f9' : '#fff', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: '#365577', fontWeight: 600 }}
                  >
                    Prev
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                    Page {currentPage} of {Math.ceil(recentViolations.length / 10)}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(recentViolations.length / 10), p + 1))}
                    disabled={currentPage === Math.ceil(recentViolations.length / 10)}
                    style={{ padding: '6px 12px', border: '1px solid #d8e6f7', background: currentPage === Math.ceil(recentViolations.length / 10) ? '#f1f5f9' : '#fff', borderRadius: '6px', cursor: currentPage === Math.ceil(recentViolations.length / 10) ? 'not-allowed' : 'pointer', color: '#365577', fontWeight: 600 }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
