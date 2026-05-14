import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import {
  evaluateSaresRecommendation,
  getSchoolYearKey,
} from '../engine/ruleEngine'
import {
  listOffenseTypes,
  getSubcategories,
  listOffenseGroups,
  listOffensesByGroup,
  getMinorSanctionSchedule,
  getMajorSanctionMap,
} from '../data/handbookIndex'
import '../css/Violation.css'
import wesleyLogo from '../assets/wesley-logo.png'
import {
  LayoutDashboard, Users, ClipboardList, ShieldCheck,
  BarChart3, LogOut, Menu, X, ChevronRight, AlertTriangle,
  CheckCircle, ChevronLeft,
} from 'lucide-react'

function Sidebar({ activePage, handleLogout, isOpen, toggleSidebar }) {
  return (
    <div className={`v-sidebar${isOpen ? ' v-sidebar--open' : ''}`}>
      <div className="v-logo">
        <div className="v-logo-icon">
          <img src={wesleyLogo} alt="Olongapo Wesley School Logo" className="school-logo" />
        </div>
        <h1>SARES</h1>
      </div>
      <nav className="v-nav">
        <Link to="/sares/dashboard" onClick={toggleSidebar} className={`v-nav-item${activePage === '/sares/dashboard' ? ' active' : ''}`}>
          <LayoutDashboard className="v-nav-icon" /><span>Dashboard</span>
        </Link>
        <Link to="/sares/students" onClick={toggleSidebar} className={`v-nav-item${activePage === '/sares/students' ? ' active' : ''}`}>
          <Users className="v-nav-icon" /><span>Students</span>
        </Link>
        <Link to="/sares/rules" onClick={toggleSidebar} className={`v-nav-item${activePage === '/sares/rules' ? ' active' : ''}`}>
          <ShieldCheck className="v-nav-icon" /><span>Rule Management</span>
        </Link>
        <Link to="/sares/reports" onClick={toggleSidebar} className={`v-nav-item${activePage === '/sares/reports' ? ' active' : ''}`}>
          <BarChart3 className="v-nav-icon" /><span>Reports</span>
        </Link>
        <Link to="/sares/violation" onClick={toggleSidebar} className={`v-nav-item${activePage === '/sares/violation' ? ' active' : ''}`}>
          <ClipboardList className="v-nav-icon" /><span>Log Violation</span>
        </Link>
      </nav>
      <div className="v-logout-section">
        <button className="v-logout" onClick={handleLogout}>
          <LogOut className="v-nav-icon" /><span>Logout</span>
        </button>
      </div>
    </div>
  )
}

const STEPS = ['Student & Date', 'Offense Type', 'Subcategory', 'Violation', 'Sanction', 'Description', 'Review']
const MINOR_SANCTIONS = getMinorSanctionSchedule()
const MAJOR_SANCTIONS = getMajorSanctionMap()

function deterministicTemplateExplanation({
  offenseCategory,
  offenseType,
  offenseCount,
  severityScore,
  recommendedSanction,
}) {
  return `Based on the recorded violation, the case is classified under ${offenseCategory || "Unspecified Category"} (${offenseType || "Unspecified Offense"}). ` +
    `This incident corresponds to offense count ${offenseCount ?? "N/A"} with a severity score of ${severityScore ?? "N/A"}. ` +
    `Following the system's deterministic rule engine, the recommended sanction is: ${recommendedSanction || "N/A"}. ` +
    `This explanation is generated for counselor review and does not replace formal disciplinary due process.`;
}

export default function Violation() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [students, setStudents] = useState([])
  const [studentQuery, setStudentQuery] = useState('')
  const [studentMenuOpen, setStudentMenuOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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
    offense_number: 1,      // minor: 1/2/3
    severity_score: 5,      // major: 1-10
    incident_description: '',
  })

  const [recommendation, setRecommendation] = useState(null)
  const [existingViolations, setExistingViolations] = useState([])
  const [currentPage, setCurrentPage] = useState(1)

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

  useEffect(() => { 
    fetchStudents() 
    fetchViolations()
  }, [])

  useEffect(() => {
    const prefill = location.state?.prefillStudentId
    if (!prefill || students.length === 0) return
    const matched = students.find(s => String(s.student_id) === String(prefill))
    if (!matched) return
    setForm(f => ({ ...f, student_id: String(matched.student_id) }))
    setStudentQuery(matched.full_name || '')
    setStep(1) // Auto-advance to Offense Type
    fetchViolations() // Pre-fetch existing violations
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.state, students])

  const fetchStudents = async () => {
    try {
      const snap = await getDocs(collection(db, 'students'))
      setStudents(snap.docs.map(d => ({
        ...d.data(),
        __docId: d.id,
        student_id: d.data().student_id || d.id,
      })))
    } catch { alert('Failed to load students.') }
  }

  const fetchViolations = async () => {
    try {
      const snap = await getDocs(collection(db, 'violations'))
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      records.sort((a, b) => {
        const timeA = a.created_at?.seconds || 0
        const timeB = b.created_at?.seconds || 0
        return timeB - timeA
      })
      setExistingViolations(records)
    } catch { /* non-critical */ }
  }

  const filteredStudents = students.filter(s => {
    const q = studentQuery.trim().toLowerCase()
    if (!q) return true
    return (s.full_name || '').toLowerCase().includes(q) ||
      String(s.student_number || '').toLowerCase().includes(q)
  })

  const selectedStudent = students.find(s => String(s.student_id) === String(form.student_id))

  // Compute recommendation when we reach the sanction step
  useEffect(() => {
    if (step !== 4 || !form.offense_id || !form.student_id) return
    const rec = evaluateSaresRecommendation({
      offenseType: form.offense_type,
      offenseId: form.offense_id,
      studentId: form.student_id,
      incidentDate: form.incident_date,
      severityScore: form.severity_score,
      existingViolations,
    })
    setRecommendation(rec)

    // Auto-set the offense number for minor violations based on history
    if (form.offense_type === 'minor' && rec.offenseNumber && form.offense_number !== rec.offenseNumber) {
      setForm(f => ({ ...f, offense_number: rec.offenseNumber }))
    }
  }, [step, form.offense_id, form.offense_type, form.incident_date, form.student_id, form.severity_score])

  const goNext = async () => {
    if (step === 0) {
      if (!form.student_id) { alert('Please select a student.'); return }
      if (!form.incident_date) { alert('Please select a date.'); return }
      await fetchViolations()
    }
    if (step === 3 && !form.offense_id) { alert('Please select a violation.'); return }
    if (step === 5 && !form.incident_description.trim()) { alert('Please provide an incident description.'); return }
    setStep(s => s + 1)
  }

  const goBack = () => setStep(s => s - 1)

  const pickOffenseType = (type) => {
    setForm(f => ({ ...f, offense_type: type, subcategory_id: '', group_number: null, group_title: '', offense_id: '', offense_title: '' }))
    setStep(2)
  }

  const pickSubcategory = (subId) => {
    setForm(f => ({ ...f, subcategory_id: subId, group_number: null, group_title: '', offense_id: '', offense_title: '' }))
    setStep(3)
  }

  const pickGroup = (group) => {
    setForm(f => ({ ...f, group_number: group.handbookNumber, group_title: group.groupTitle, offense_id: '', offense_title: '' }))
  }

  const pickOffense = (offense) => {
    setForm(f => ({ ...f, offense_id: offense.id, offense_title: offense.title }))
  }

  const handleSubmit = async () => {
    if (!recommendation) return
    setSubmitting(true)
    try {
      const user = JSON.parse(localStorage.getItem('user'))
      const offenseCount = form.offense_type === 'minor' ? recommendation.offenseNumber : 1
      const severityScore = form.offense_type === 'major' ? form.severity_score : null

      let generatedExplanation = deterministicTemplateExplanation({
        offenseCategory: form.group_title,
        offenseType: form.offense_title,
        offenseCount,
        severityScore,
        recommendedSanction: recommendation.recommendedSanction,
      })
      let explanationSource = 'fallback'

      try {
        const response = await fetch('/api/generate-explanation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offenseCategory: form.group_title,
            offenseType: form.offense_title,
            offenseCount,
            severityScore,
            recommendedSanction: recommendation.recommendedSanction,
          }),
        })
        if (response.ok) {
          const result = await response.json()
          if (result?.explanation) {
            generatedExplanation = result.explanation
            explanationSource = result?.source || 'gemini'
          }
        }
      } catch {
        // Fallback template remains active.
      }

      const payload = {
        student_id: form.student_id,
        student_name: selectedStudent?.full_name || '',
        student_number: selectedStudent?.student_number || '',
        year_level: selectedStudent?.year_level || '',
        incident_date: form.incident_date,
        incident_description: form.incident_description,
        offense_type: form.offense_type,
        subcategory_id: form.subcategory_id,
        group_number: form.group_number,
        group_title: form.group_title,
        offense_id: form.offense_id,
        offense_variety: form.offense_title,
        category_name: form.group_title,
        offense_number: form.offense_type === 'minor' ? recommendation.offenseNumber : null,
        severity_score: form.offense_type === 'major' ? form.severity_score : null,
        recommended_sanction: recommendation.recommendedSanction,
        generated_explanation: generatedExplanation,
        explanation_source: explanationSource,
        suggest_authorities: recommendation.suggestAuthorities,
        status: 'recorded',
        created_by: user?.user_id || 'system',
        school_year_key: recommendation.schoolYearKey,
        engine_mode: 'handbook_v2',
        created_at: serverTimestamp(),
      }
      const saved = await addDoc(collection(db, 'violations'), payload)
      navigate('/sares/case-assessment', {
        state: {
          caseData: {
            ...payload,
            id: saved.id,
          },
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
  const groupOffenses = (form.offense_type && form.subcategory_id && form.group_number !== null)
    ? listOffensesByGroup(form.offense_type, form.subcategory_id, form.group_number)
    : []

  const isMajor = form.offense_type === 'major'
  const sanctionForDisplay = recommendation?.recommendedSanction || ''
  const suggestAuthorities = recommendation?.suggestAuthorities || false

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

      <Sidebar activePage={location.pathname} handleLogout={handleLogout} isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(false)} />

      <div className="v-main">
        <div className="v-main-header">
          <div>
            <h1 className="v-page-title">Log New Violation</h1>
            <p className="v-page-sub">Record a student disciplinary incident</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="v-wizard-steps">
          {STEPS.map((label, i) => (
            <div key={label} className={`v-wizard-step ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}>
              <div className="v-wizard-step-circle">
                {i < step ? <CheckCircle size={16} /> : <span>{i + 1}</span>}
              </div>
              <span className="v-wizard-step-label">{label}</span>
              {i < STEPS.length - 1 && <div className="v-wizard-step-line" />}
            </div>
          ))}
        </div>

        <div className="v-directory-card v-form-card">

          {/* STEP 0: Student & Date */}
          {step === 0 && (
            <div className="v-step-content">
              <h2 className="v-directory-title">Step 1: Student & Date</h2>
              <p className="v-directory-sub">Select the student and incident date</p>

              <div className="v-field" style={{ marginTop: '1.5rem' }}>
                <label className="v-label">Student *</label>
                <div className="v-student-combobox">
                  <div className="v-student-combobox-inner">
                    <input
                      type="text"
                      className="v-input v-student-input"
                      autoComplete="off"
                      placeholder="Search or select a student"
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
                        : filteredStudents.map(s => (
                          <li key={s.student_id} className="v-student-option"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { setForm(f => ({ ...f, student_id: String(s.student_id) })); setStudentQuery(s.full_name); setStudentMenuOpen(false) }}>
                            <span className="v-student-option-name">{s.full_name}</span>
                            {s.student_number && <span className="v-student-option-meta">{s.student_number}</span>}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="v-field" style={{ marginTop: '1rem' }}>
                <label className="v-label">Date of Incident *</label>
                <input className="v-input" type="date" value={form.incident_date}
                  onChange={e => setForm(f => ({ ...f, incident_date: e.target.value }))} />
              </div>
            </div>
          )}

          {/* STEP 1: Offense Type */}
          {step === 1 && (
            <div className="v-step-content">
              <h2 className="v-directory-title">Step 2: Offense Type</h2>
              <p className="v-directory-sub">Is this a Minor or Major offense?</p>
              <div className="v-offense-type-grid">
                <button className={`v-offense-type-card v-offense-type-card--minor ${form.offense_type === 'minor' ? 'selected' : ''}`}
                  onClick={() => pickOffenseType('minor')}>
                  <span className="v-offense-type-badge">Minor</span>
                  <h3>Minor Offense</h3>
                  <p>Violations that do not constitute an immediate threat. Sanctions are based on 1st, 2nd, or 3rd offense count.</p>
                  <div className="v-offense-type-sub-labels">
                    <span>Light</span><span>Less Serious</span>
                  </div>
                </button>
                <button className={`v-offense-type-card v-offense-type-card--major ${form.offense_type === 'major' ? 'selected' : ''}`}
                  onClick={() => pickOffenseType('major')}>
                  <span className="v-offense-type-badge v-offense-type-badge--major">Major</span>
                  <h3>Major Offense</h3>
                  <p>Acts of serious misconduct. Sanctions are based on a severity score (1–10) assessed by the admin/counselor.</p>
                  <div className="v-offense-type-sub-labels">
                    <span>Serious</span><span>Very Serious</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Subcategory */}
          {step === 2 && (
            <div className="v-step-content">
              <h2 className="v-directory-title">Step 3: Subcategory</h2>
              <p className="v-directory-sub">
                {form.offense_type === 'minor' ? 'Minor Offense' : 'Major Offense'} → Select subcategory level
              </p>
              <div className="v-subcategory-grid">
                {subcategories.map(sub => (
                  <button key={sub.id}
                    className={`v-subcategory-card ${form.subcategory_id === sub.id ? 'selected' : ''} ${form.offense_type === 'major' ? 'major' : ''}`}
                    onClick={() => pickSubcategory(sub.id)}>
                    <h3>{sub.label}</h3>
                    <p className="v-subcategory-hint">
                      {sub.id === 'light' && 'Dress code, ID, grooming, cleanliness, loitering'}
                      {sub.id === 'less_serious' && 'Class disruption, tardiness, devices, language, facility misuse'}
                      {sub.id === 'serious' && 'Academic dishonesty, forgery, vandalism, theft, disrespect, bullying'}
                      {sub.id === 'very_serious' && 'Physical violence, weapons, drugs & alcohol, immorality, gambling'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Specific Violation */}
          {step === 3 && (
            <div className="v-step-content">
              <h2 className="v-directory-title">Step 4: Specific Violation</h2>
              <p className="v-directory-sub">
                {form.offense_type === 'minor' ? 'Minor' : 'Major'} → {subcategories.find(s => s.id === form.subcategory_id)?.label} → Select violation group and specific act
              </p>

              <div className="v-groups-list">
                {offenseGroups.map(group => (
                  <div key={group.handbookNumber} className={`v-group-item ${form.group_number === group.handbookNumber ? 'expanded' : ''}`}>
                    <button className="v-group-header" onClick={() => pickGroup(group)}>
                      <span>{group.groupTitle}</span>
                      <ChevronRight size={16} className={`v-group-chevron ${form.group_number === group.handbookNumber ? 'rotated' : ''}`} />
                    </button>
                    {form.group_number === group.handbookNumber && (
                      <div className="v-offense-options">
                        {listOffensesByGroup(form.offense_type, form.subcategory_id, group.handbookNumber).map(offense => (
                          <button key={offense.id}
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
            </div>
          )}

          {/* STEP 4: Sanction */}
          {step === 4 && (
            <div className="v-step-content">
              <h2 className="v-directory-title">Step 5: Sanction</h2>

              {!isMajor ? (
                /* MINOR — pick offense number */
                <div>
                  <p className="v-directory-sub">Select which offense number this is for this student</p>
                  <div className="v-offense-number-grid">
                    {MINOR_SANCTIONS.map(s => (
                      <button key={s.offenseNumber}
                        className={`v-offense-number-card ${form.offense_number === s.offenseNumber ? 'selected' : ''}`}
                        onClick={() => setForm(f => ({ ...f, offense_number: s.offenseNumber }))}>
                        <span className="v-offense-number-label">{s.label}</span>
                        <p className="v-offense-number-sanction">{s.sanction}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* MAJOR — enter severity score */
                <div>
                  <p className="v-directory-sub">Assess a severity score (1–10) based on the gravity of this incident</p>
                  <div className="v-severity-map">
                    {MAJOR_SANCTIONS.map(s => (
                      <div key={s.label} className={`v-severity-band ${form.severity_score >= s.min && form.severity_score <= s.max ? 'active' : ''}`}>
                        <span className="v-severity-band-score">{s.label}</span>
                        <span className="v-severity-band-sanction">{s.sanction}</span>
                      </div>
                    ))}
                  </div>
                  <div className="v-severity-slider-wrap">
                    <label className="v-label">Severity Score: <strong>{form.severity_score}</strong> / 10</label>
                    <input type="range" min="1" max="10" step="1" value={form.severity_score}
                      onChange={e => setForm(f => ({ ...f, severity_score: Number(e.target.value) }))}
                      className="v-severity-slider" />
                    <div className="v-severity-slider-ticks">
                      {[1,2,3,4,5,6,7,8,9,10].map(n => <span key={n}>{n}</span>)}
                    </div>
                  </div>
                  {recommendation && (
                    <div className="v-sanction-result">
                      <h4>Recommended Sanction</h4>
                      <p>{recommendation.recommendedSanction}</p>
                    </div>
                  )}
                </div>
              )}

              {suggestAuthorities && (
                <div className="v-authority-alert">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Authority Involvement Suggested</strong>
                    <p>This violation may involve illegal activity. Consider referral to proper authorities (police/security) at school discretion.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Description */}
          {step === 5 && (
            <div className="v-step-content">
              <h2 className="v-directory-title">Step 6: Incident Description</h2>
              <p className="v-directory-sub">Provide a detailed account of the incident</p>
              <div className="v-field" style={{ marginTop: '1.5rem' }}>
                <label className="v-label">Incident Description *</label>
                <textarea className="v-input v-textarea" rows="5"
                  placeholder="Include relevant details such as witnesses, location, and circumstances..."
                  value={form.incident_description}
                  onChange={e => setForm(f => ({ ...f, incident_description: e.target.value }))} />
              </div>
            </div>
          )}

          {/* STEP 6: Review */}
          {step === 6 && recommendation && (
            <div className="v-step-content">
              <h2 className="v-directory-title">Step 7: Review & Submit</h2>
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
                </div>
                {form.offense_type === 'minor' && (
                  <div className="v-review-section">
                    <h4>Offense Number</h4>
                    <p>{recommendation.offenseLabel}</p>
                  </div>
                )}
                {form.offense_type === 'major' && (
                  <div className="v-review-section">
                    <h4>Severity Score</h4>
                    <p>{form.severity_score} / 10</p>
                  </div>
                )}
                <div className="v-review-section v-review-section--full">
                  <h4>Recommended Sanction</h4>
                  <p className="v-review-sanction">{recommendation.recommendedSanction}</p>
                </div>
                <div className="v-review-section v-review-section--full">
                  <h4>Incident Description</h4>
                  <p>{form.incident_description}</p>
                </div>
              </div>

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
            {step > 0 && step !== 1 && step !== 2 && (
              <button className="v-btn-cancel" onClick={goBack}>
                <ChevronLeft size={16} /> Back
              </button>
            )}
            {step === 1 && (
              <button className="v-btn-cancel" onClick={goBack}>
                <ChevronLeft size={16} /> Back
              </button>
            )}
            {step === 2 && (
              <button className="v-btn-cancel" onClick={() => setStep(1)}>
                <ChevronLeft size={16} /> Back
              </button>
            )}
            {step === 0 && <Link to="/sares/dashboard" className="v-btn-cancel v-link-btn">Cancel</Link>}

            {step < 6 && step !== 1 && step !== 2 && (
              <button className="v-btn-submit" onClick={goNext}>
                Next <ChevronRight size={16} />
              </button>
            )}
            {step === 6 && (
              <button className="v-btn-submit" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Violation'}
              </button>
            )}
          </div>

        </div>

        {/* Global Violation History */}
        <div className="v-directory-card" style={{ marginTop: '24px' }}>
          <div className="v-directory-header" style={{ marginBottom: '16px' }}>
            <h2 className="v-directory-title">Recent System Violations</h2>
            <p className="v-directory-sub">History of all logged violations across the system.</p>
          </div>
          
          {existingViolations.length === 0 ? (
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
                    {existingViolations.slice((currentPage - 1) * 10, currentPage * 10).map((v) => (
                      <tr key={v.id || v.created_at?.seconds || Math.random()} style={{ borderBottom: '1px solid #e6edf7' }}>
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
              {existingViolations.length > 10 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '6px 12px', border: '1px solid #d8e6f7', background: currentPage === 1 ? '#f1f5f9' : '#fff', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: '#365577', fontWeight: 600 }}
                  >
                    Prev
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                    Page {currentPage} of {Math.ceil(existingViolations.length / 10)}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(existingViolations.length / 10), p + 1))}
                    disabled={currentPage === Math.ceil(existingViolations.length / 10)}
                    style={{ padding: '6px 12px', border: '1px solid #d8e6f7', background: currentPage === Math.ceil(existingViolations.length / 10) ? '#f1f5f9' : '#fff', borderRadius: '6px', cursor: currentPage === Math.ceil(existingViolations.length / 10) ? 'not-allowed' : 'pointer', color: '#365577', fontWeight: 600 }}
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
