import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { collection, getCountFromServer, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthProfile } from '../authContext'
import { queryForUserScope } from '../firestoreAccess'
import { isRecordInTrash } from '../recordStatus'
import { getNavItems } from '../navigation'
import { useLogout } from '../useLogout'
import {
  SCOPE_VIEWS,
  countNewThisMonth,
  filterByScopeView,
  formatDisplayDate,
  getCategoryStats,
  getGreetingName,
  getInitials,
  getMonthlyTrends,
  getRecentViolations,
  getScopeLabel,
  getStudentsWithPendingCases,
  getTopViolations,
  getViolationName,
} from '../dashboardStats'
import '../css/Dashboard.css'
import heroImg from '../assets/hero.png'
import wesleyLogo from '../assets/wesley-logo.png'
import { AlertTriangle, ChevronRight, LogOut, Menu, RotateCcw, X } from 'lucide-react'

const PENDING_PREVIEW_COUNT = 5

async function loadViolations(profile) {
  const snapshot = await getDocs(queryForUserScope(collection(db, 'violations'), profile))
  return snapshot.docs
    .map((violationDoc) => ({ violation_id: violationDoc.id, ...violationDoc.data() }))
    .filter((violation) => !isRecordInTrash(violation))
}

function studentScopeQuery(profile, scopeView) {
  const students = collection(db, 'students')
  if (profile.role === 'superadmin') {
    return scopeView === 'all' ? students : query(students, where('school_scope', 'in', [scopeView, 'shared']))
  }
  return queryForUserScope(students, profile)
}

// Counts students on the server instead of downloading every student record.
// Trashed students (deleted_at set) are subtracted.
async function countActiveStudents(profile, scopeView) {
  const scoped = studentScopeQuery(profile, scopeView)
  try {
    const [all, trashed] = await Promise.all([
      getCountFromServer(scoped),
      getCountFromServer(query(scoped, where('deleted_at', '!=', null))),
    ])
    return all.data().count - trashed.data().count
  } catch (error) {
    // e.g. the Firestore index in firestore.indexes.json isn't deployed yet.
    console.warn('Student count query failed; falling back to reading student records.', error)
    const snapshot = await getDocs(scoped)
    return snapshot.docs.filter((studentDoc) => !isRecordInTrash(studentDoc.data())).length
  }
}

const Dashboard = () => {
  const { userProfile } = useAuthProfile()
  const location = useLocation()
  const navigate = useNavigate()
  const handleLogout = useLogout()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isSuperadmin = userProfile?.role === 'superadmin'
  const [scopeView, setScopeView] = useState('all')
  const activeScope = isSuperadmin ? scopeView : userProfile?.school_scope

  const [reloadKey, setReloadKey] = useState(0)
  const [violationState, setViolationState] = useState({ status: 'loading', records: [], loadedAt: null })
  const [studentCount, setStudentCount] = useState(null)
  const [showAllPending, setShowAllPending] = useState(false)

  useEffect(() => {
    if (!userProfile) return undefined
    let cancelled = false
    loadViolations(userProfile).then(
      (records) => {
        if (!cancelled) setViolationState({ status: 'ready', records, loadedAt: new Date() })
      },
      (error) => {
        console.error('Dashboard load error:', error)
        if (!cancelled) setViolationState({ status: 'error', records: [], loadedAt: null })
      }
    )
    return () => {
      cancelled = true
    }
  }, [userProfile, reloadKey])

  useEffect(() => {
    if (!userProfile) return undefined
    let cancelled = false
    countActiveStudents(userProfile, activeScope).then(
      (value) => {
        if (!cancelled) setStudentCount({ scope: activeScope, reloadKey, value, error: false })
      },
      (error) => {
        console.error('Student count error:', error)
        if (!cancelled) setStudentCount({ scope: activeScope, reloadKey, value: null, error: true })
      }
    )
    return () => {
      cancelled = true
    }
  }, [userProfile, activeScope, reloadKey])

  const isLoading = violationState.status === 'loading'
  const isReady = violationState.status === 'ready'
  const studentCountReady = studentCount?.scope === activeScope && studentCount?.reloadKey === reloadKey
  const hasError = violationState.status === 'error' || (studentCountReady && studentCount.error)

  const stats = useMemo(() => {
    const violations = filterByScopeView(violationState.records, isSuperadmin ? scopeView : 'all')
    const now = violationState.loadedAt || new Date(0)
    const pendingStudents = getStudentsWithPendingCases(violations, now)
    return {
      totalViolations: violations.length,
      pendingStudents,
      newThisMonth: countNewThisMonth(violations, now),
      monthly: getMonthlyTrends(violations, now),
      category: getCategoryStats(violations),
      top: getTopViolations(violations, 5),
      recent: getRecentViolations(violations, 5),
    }
  }, [violationState, isSuperadmin, scopeView])

  const handleRetry = () => {
    setViolationState({ status: 'loading', records: [], loadedAt: null })
    setReloadKey((key) => key + 1)
  }

  const openStudent = (studentId) => {
    if (studentId) navigate('/sares/students', { state: { openStudentId: studentId } })
  }

  // Never show 0 for data that hasn't loaded: a dash means "unknown", not "none".
  const showValue = (value) => (isReady ? value : '—')
  const notReadyText = isLoading ? 'Loading…' : 'Couldn’t load.'
  const greetingName = getGreetingName(userProfile?.full_name)
  const fallbackGreeting = userProfile?.role === 'counselor' ? 'Counselor' : 'Admin'
  const maxMonthly = Math.max(1, ...stats.monthly.map((month) => month.count))
  const maxTop = Math.max(1, ...stats.top.map((item) => item.count))
  const visiblePending = showAllPending ? stats.pendingStudents : stats.pendingStudents.slice(0, PENDING_PREVIEW_COUNT)

  return (
    <div className="dashboard-container">

      {/* menu */}
      <div className="mobile-menu-bar">
        <div className="logo-container">
          <div className="logo-icon-container">
            <img src={wesleyLogo} alt="" className="school-logo" />
          </div>
          <h1 className="admin-title">SARES</h1>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="mobile-menu-btn"
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon-container">
              <img src={wesleyLogo} alt="Wesley Logo" className="school-logo" />
            </div>
            <h1 className="admin-title">SARES</h1>
          </div>
        </div>

        <nav className="navigation" data-help-target="dashboard-navigation">
          <ul className="nav-list">
            {getNavItems(userProfile).map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link to={to} onClick={() => setSidebarOpen(false)} className={`nav-item${location.pathname === to ? '-active' : ''}`}>
                  <Icon className="nav-icon" />
                  <span className="nav-text">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="logout-section">
          <button type="button" className="logout-button" onClick={handleLogout}>
            <LogOut className="nav-icon" />
            <span className="nav-text">Logout</span>
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="main-content">
        <div className="content-wrapper">

          {/* Welcome Card */}
          <div className="welcome-card" data-help-target="dashboard-welcome">
            <div className="welcome-inner">
              <div className="welcome-grid">
                <div className="welcome-text-section">
                  <h1 className="welcome-title">
                    Welcome back, {greetingName || fallbackGreeting}!
                  </h1>
                  <p className="welcome-subtitle">
                    {getScopeLabel(activeScope)}
                    {violationState.loadedAt && (
                      <> · {violationState.loadedAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</>
                    )}
                  </p>

                  {isSuperadmin && (
                    <div className="dash-scope-toggle" role="group" aria-label="Show data for">
                      {SCOPE_VIEWS.map((view) => (
                        <button
                          key={view.value}
                          type="button"
                          className={`dash-scope-option${scopeView === view.value ? ' dash-scope-option--active' : ''}`}
                          aria-pressed={scopeView === view.value}
                          onClick={() => {
                            setScopeView(view.value)
                            setShowAllPending(false)
                          }}
                        >
                          {view.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <button className="cta-button" onClick={() => navigate('/sares/violation')}>
                    <svg className="button-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    <span className="button-text">Log New Violation</span>
                  </button>
                </div>

                <div className="image-container" style={{ backgroundImage: `url(${heroImg})` }}>
                  <div className="image-overlay" />
                </div>
              </div>
            </div>
          </div>

          {hasError && (
            <div className="dash-alert" role="alert">
              <AlertTriangle aria-hidden="true" className="dash-alert-icon" />
              <span>Some dashboard data couldn't be loaded. Check your connection and try again.</span>
              <button type="button" className="dash-alert-retry" onClick={handleRetry}>
                <RotateCcw aria-hidden="true" />
                Retry
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="stats-cards-grid" data-help-target="dashboard-stats" aria-busy={isLoading}>
            <div className="stat-card">
              <div className="card-header">
                <h3 className="card-title">Total Violations</h3>
              </div>
              <p className="card-value">{showValue(stats.totalViolations)}</p>
              <p className="card-subtitle">All time recorded</p>
            </div>

            <div className="stat-card special-card">
              <div className="card-header">
                <h3 className="card-title special-card-title">Students with Pending Cases</h3>
              </div>
              <p className="card-value special-card-value">{showValue(stats.pendingStudents.length)}</p>
              <p className="card-subtitle special-card-subtitle">Require attention</p>
            </div>

            <div className="stat-card">
              <div className="card-header">
                <h3 className="card-title">Total Students</h3>
              </div>
              <p className="card-value">{studentCountReady && !studentCount.error ? studentCount.value : '—'}</p>
              <p className="card-subtitle">In the system</p>
            </div>

            <div className="stat-card">
              <div className="card-header">
                <h3 className="card-title">New This Month</h3>
              </div>
              <p className="card-value">{showValue(stats.newThisMonth.thisMonth)}</p>
              <p className="card-subtitle">
                {isReady ? `${stats.newThisMonth.lastMonth} last month` : 'Violations this month'}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="charts-grid" data-help-target="dashboard-charts">
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Violation Trends</h3>
                <p className="chart-subtitle">Violations per month, last 6 months</p>
              </div>
              <div className="chart-container">
                {!isReady ? (
                  <p className="card-subtitle">{notReadyText}</p>
                ) : (
                  <div
                    className="trend-bar-container"
                    role="img"
                    aria-label={`Violations per month: ${stats.monthly.map((m) => `${m.label}, ${m.count}`).join('; ')}`}
                  >
                    {stats.monthly.map((data) => (
                      <div key={data.label} className="trend-bar-wrapper">
                        <div className="dash-trend-track">
                          <div className="trend-bar dash-trend-bar" style={{ height: `${(data.count / maxMonthly) * 100}%` }}>
                            <span className="dash-trend-count">{data.count}</span>
                          </div>
                        </div>
                        <span className="trend-month">{data.month}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Violations by Category</h3>
                <p className="chart-subtitle">By severity level</p>
              </div>
              {!isReady ? (
                <p className="card-subtitle">{notReadyText}</p>
              ) : stats.category.total === 0 ? (
                <p className="card-subtitle">No category data yet.</p>
              ) : (
                <>
                  <div className="dash-stack" aria-hidden="true">
                    {stats.category.categories.filter((item) => item.count > 0).map((item) => (
                      <span
                        key={item.key}
                        className="dash-stack-segment"
                        style={{ width: `${(item.count / stats.category.total) * 100}%`, background: item.color }}
                      />
                    ))}
                  </div>
                  <ul className="dash-category-list">
                    {stats.category.categories.map((item) => (
                      <li key={item.key} className="dash-category-item">
                        <span className="legend-dot" style={{ background: item.color }} />
                        <span className="dash-category-label">{item.label}</span>
                        <span className="dash-category-count">{item.count}</span>
                        <span className="dash-category-percent">{item.percent}%</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Top Violations</h3>
                <p className="chart-subtitle">All school years · most frequent, share of all violations</p>
              </div>
              {!isReady ? (
                <p className="card-subtitle">{notReadyText}</p>
              ) : stats.top.length === 0 ? (
                <p className="card-subtitle">No data yet.</p>
              ) : (
                <ol className="dash-rank-list">
                  {stats.top.map((item, index) => (
                    <li key={item.name} className="dash-rank-item">
                      <div className="dash-rank-row">
                        <span className={`dash-rank-badge dash-rank-badge--${Math.min(index + 1, 4)}`}>{index + 1}</span>
                        <span className="dash-rank-name" title={item.name}>{item.name}</span>
                        <span className="dash-rank-value">
                          {item.count} <span className="dash-rank-percent">· {item.percent}%</span>
                        </span>
                      </div>
                      <div className="dash-rank-track">
                        <div className="dash-rank-fill" style={{ width: `${(item.count / maxTop) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* Bottom: Recent Activity + Students with Pending Cases */}
          <div className="bottom-grid" data-help-target="dashboard-activity">

            <div className="bottom-card">
              <h3 className="bottom-card-title">Recent Violation Activity</h3>
              <p className="bottom-card-subtitle">Latest recorded violations. Select one to open the student.</p>

              <div className="violation-list">
                {!isReady ? (
                  <p className="card-subtitle">{notReadyText}</p>
                ) : stats.recent.length === 0 ? (
                  <p className="card-subtitle">No violations recorded yet.</p>
                ) : (
                  stats.recent.map((violation) => (
                    <button
                      type="button"
                      className="violation-row dash-clickable"
                      key={violation.violation_id}
                      onClick={() => openStudent(violation.student_id)}
                      disabled={!violation.student_id}
                    >
                      <div className="avatar dash-avatar--recent">{getInitials(violation.student_name)}</div>
                      <div className="violation-info">
                        <div className="violation-name">{violation.student_name || 'Unknown student'}</div>
                        <div className="violation-type">{getViolationName(violation)}</div>
                        <div className="violation-date">{formatDisplayDate(violation.incident_date)}</div>
                      </div>
                      <ChevronRight aria-hidden="true" className="dash-row-chevron" />
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="bottom-card">
              <h3 className="bottom-card-title">Students with Pending Cases</h3>
              <p className="bottom-card-subtitle">Most pending cases first. Select a student to open their record.</p>

              <div className="offender-list">
                {!isReady ? (
                  <p className="card-subtitle">{notReadyText}</p>
                ) : stats.pendingStudents.length === 0 ? (
                  <p className="card-subtitle">No students with pending cases.</p>
                ) : (
                  visiblePending.map((student) => (
                    <button
                      type="button"
                      className="offender-card offender-card--amber dash-clickable"
                      key={student.student_id || student.student_name}
                      onClick={() => openStudent(student.student_id)}
                      disabled={!student.student_id}
                    >
                      <div className="avatar avatar--lg dash-avatar--pending">
                        {getInitials(student.student_name)}
                      </div>
                      <div className="offender-info">
                        <div className="offender-name">{student.student_name || 'Unknown student'}</div>
                        <div className="offender-id">
                          {[student.student_number, student.year_level].filter(Boolean).join(' • ')}
                        </div>
                        {student.oldestIncidentDate && (
                          <div className="dash-offender-since">
                            Oldest pending: {formatDisplayDate(student.oldestIncidentDate)}
                          </div>
                        )}
                      </div>
                      <span className="offense-tag offense-tag--amber">
                        {student.pendingCount} pending
                      </span>
                    </button>
                  ))
                )}
              </div>

              {isReady && stats.pendingStudents.length > PENDING_PREVIEW_COUNT && (
                <button
                  type="button"
                  className="dash-show-all"
                  onClick={() => setShowAllPending((value) => !value)}
                  aria-expanded={showAllPending}
                >
                  {showAllPending ? 'Show fewer' : `Show all ${stats.pendingStudents.length} students`}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
