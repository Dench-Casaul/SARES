import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { collection, getDocs, limit, orderBy, query, startAfter, Timestamp, where } from 'firebase/firestore'
import { Activity, BarChart3, ClipboardList, KeyRound, LayoutDashboard, LogOut, ShieldCheck, Users } from 'lucide-react'
import { db } from '../firebase'
import { useAuthProfile } from '../authContext'
import { ACTIVITY_ACTIONS, getActivityActionLabel, recordActivity } from '../activityLog'
import '../css/SystemLogs.css'
import wesleyLogo from '../assets/wesley-logo.png'

const PAGE_SIZE = 25
const FETCH_BATCH_SIZE = 100

function Sidebar({ activePage, onLogout }) {
  return (
    <aside className="logs-sidebar">
      <div className="logs-brand">
        <img src={wesleyLogo} alt="Olongapo Wesley School Logo" />
        <h1>SARES</h1>
      </div>
      <nav className="logs-nav" aria-label="Main navigation">
        <Link to="/sares/dashboard"><LayoutDashboard /><span>Dashboard</span></Link>
        <Link to="/sares/students"><Users /><span>Students</span></Link>
        <Link to="/sares/rules"><ShieldCheck /><span>Rule Management</span></Link>
        <Link to="/sares/reports"><BarChart3 /><span>Reports</span></Link>
        <Link to="/sares/violation"><ClipboardList /><span>Log Violation</span></Link>
        <Link to="/sares/system-logs" className={activePage ? 'active' : ''} aria-current={activePage ? 'page' : undefined}>
          <Activity /><span>System Logs</span>
        </Link>
        <Link to="/sares/account"><KeyRound /><span>Account Security</span></Link>
      </nav>
      <div className="logs-sidebar-footer">
        <button type="button" onClick={onLogout}><LogOut /><span>Logout</span></button>
      </div>
    </aside>
  )
}

function formatActivityDate(timestamp) {
  const date = timestamp?.toDate?.()
    || (timestamp instanceof Date ? timestamp : null)
  return date ? date.toLocaleString() : 'Time unavailable'
}

export default function SystemLogs() {
  const { userProfile } = useAuthProfile()
  const location = useLocation()
  const navigate = useNavigate()
  const [activityLogs, setActivityLogs] = useState([])
  const [nextPageCursor, setNextPageCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageStartCursors, setPageStartCursors] = useState([null])
  const [filters, setFilters] = useState({
    scope: 'all',
    dateRange: '30',
    action: 'all',
    appliedAt: null,
  })
  const [filterForm, setFilterForm] = useState({
    scope: 'all',
    dateRange: '30',
    action: 'all',
  })

  useEffect(() => {
    if (userProfile?.role !== 'superadmin') return undefined

    let cancelled = false
    const loadPage = async () => {
      setLoading(true)
      setError('')
      setActivityLogs([])
      setNextPageCursor(null)

      try {
        const constraints = []
        if (filters.dateRange !== 'all') {
          const cutoff = new Date(filters.appliedAt || Date.now())
          cutoff.setDate(cutoff.getDate() - Number(filters.dateRange))
          constraints.push(where('created_at', '>=', Timestamp.fromDate(cutoff)))
        }
        constraints.push(orderBy('created_at', 'desc'))

        const pageStartCursor = pageStartCursors[pageIndex] || null
        let scanCursor = pageStartCursor
        let exhausted = false
        const matchingLogs = []

        while (matchingLogs.length <= PAGE_SIZE && !exhausted) {
          const batchConstraints = [...constraints]
          if (scanCursor) batchConstraints.push(startAfter(scanCursor))
          batchConstraints.push(limit(FETCH_BATCH_SIZE))
          const snapshot = await getDocs(query(collection(db, 'activity_logs'), ...batchConstraints))
          if (cancelled) return

          snapshot.docs.some((activityDoc) => {
            const activity = {
              id: activityDoc.id,
              ...activityDoc.data(),
            }
            const matchesScope = filters.scope === 'all'
              || (filters.scope === 'admin'
                ? activity.school_scope === 'all'
                : activity.school_scope === filters.scope)
            const matchesAction = filters.action === 'all' || activity.action === filters.action
            if (matchesScope && matchesAction) {
              matchingLogs.push({ activity, cursor: activityDoc })
              return matchingLogs.length > PAGE_SIZE
            }
            return false
          })

          if (matchingLogs.length > PAGE_SIZE) break
          scanCursor = snapshot.docs.at(-1) || scanCursor
          exhausted = snapshot.docs.length < FETCH_BATCH_SIZE
        }

        const hasNextPage = matchingLogs.length > PAGE_SIZE
        setActivityLogs(matchingLogs.slice(0, PAGE_SIZE).map(({ activity }) => activity))
        setNextPageCursor(hasNextPage ? matchingLogs[PAGE_SIZE - 1].cursor : null)
      } catch (fetchError) {
        if (cancelled) return
        console.error('Failed to load system activity:', fetchError)
        setError('System activity could not be loaded. Check your access and connection.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPage()
    return () => {
      cancelled = true
    }
  }, [userProfile, filters, pageIndex, pageStartCursors])

  const handleApplyFilters = (event) => {
    event.preventDefault()
    setPageIndex(0)
    setPageStartCursors([null])
    setFilters({
      ...filterForm,
      appliedAt: Date.now(),
    })
  }

  const handleNextPage = () => {
    if (!nextPageCursor) return
    setPageStartCursors((cursors) => [
      ...cursors.slice(0, pageIndex + 1),
      nextPageCursor,
    ])
    setPageIndex((currentPage) => currentPage + 1)
  }

  const handlePreviousPage = () => {
    setPageIndex((currentPage) => Math.max(0, currentPage - 1))
  }

  const handleLogout = async () => {
    await recordActivity(userProfile, ACTIVITY_ACTIONS.LOGOUT, 'session')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (userProfile?.role !== 'superadmin') return <Navigate to="/sares/dashboard" replace />

  const availableActions = Object.values(ACTIVITY_ACTIONS)
    .map((action) => ({ value: action, label: getActivityActionLabel(action) }))
    .sort((left, right) => left.label.localeCompare(right.label))

  return (
    <div className="logs-page">
      <Sidebar activePage={location.pathname === '/sares/system-logs'} onLogout={handleLogout} />
      <main className="logs-content">
        <header className="logs-page-header">
          <div>
            <p className="logs-eyebrow">Administration</p>
            <h1>System Logs / Recent Activity</h1>
            <p>Successful sign-ins and in-app actions across both school scopes.</p>
          </div>
        </header>

        <form className="logs-filters" data-help-target="system-log-filter" onSubmit={handleApplyFilters}>
          <label className="logs-filter">
            <span>Date range</span>
            <select value={filterForm.dateRange} onChange={(event) => setFilterForm((current) => ({ ...current, dateRange: event.target.value }))}>
              <option value="30">Last 30 days</option>
              <option value="7">Last 7 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </label>
          <label className="logs-filter">
            <span>School scope</span>
            <select value={filterForm.scope} onChange={(event) => setFilterForm((current) => ({ ...current, scope: event.target.value }))}>
              <option value="all">All scopes</option>
              <option value="elementary">Elementary</option>
              <option value="high_school">High school</option>
              <option value="shared">Shared</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="logs-filter">
            <span>Activity type</span>
            <select value={filterForm.action} onChange={(event) => setFilterForm((current) => ({ ...current, action: event.target.value }))}>
              <option value="all">All activity</option>
              {availableActions.map((action) => (
                <option key={action.value} value={action.value}>{action.label}</option>
              ))}
            </select>
          </label>
          <div className="logs-filter-actions">
            <button type="submit" className="logs-filter-apply">Apply filters</button>
          </div>
        </form>

        <section className="logs-card" data-help-target="system-log-list" aria-label="Recent system activity">
          {loading ? (
            <p className="logs-state">Loading system activity…</p>
          ) : error ? (
            <p className="logs-state logs-state--error" role="alert">{error}</p>
          ) : activityLogs.length === 0 ? (
            <p className="logs-state">No activity found. Try adjusting the filters.</p>
          ) : (
            <div className="logs-table-wrap">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Account</th>
                    <th scope="col">School</th>
                    <th scope="col">Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.map((activity) => (
                    <tr key={activity.id}>
                      <td>{formatActivityDate(activity.created_at)}</td>
                      <td>{activity.actor_email || 'Unknown account'}</td>
                      <td>{activity.school_scope === 'high_school' ? 'High school' : activity.school_scope === 'elementary' ? 'Elementary' : activity.school_scope === 'all' ? 'Admin' : 'Shared'}</td>
                      <td>{getActivityActionLabel(activity.action)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && activityLogs.length > 0 && (
            <nav className="logs-pagination" aria-label="System log pages">
              <span>
                Showing {pageIndex * PAGE_SIZE + 1}–{pageIndex * PAGE_SIZE + activityLogs.length}
                {' · '}Page {pageIndex + 1}
              </span>
              <div>
                <button type="button" onClick={handlePreviousPage} disabled={pageIndex === 0}>
                  Previous
                </button>
                <button type="button" onClick={handleNextPage} disabled={!nextPageCursor}>
                  Next
                </button>
              </div>
            </nav>
          )}
        </section>
      </main>
    </div>
  )
}
