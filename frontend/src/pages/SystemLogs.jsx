import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { Activity, BarChart3, ClipboardList, KeyRound, LayoutDashboard, LogOut, ShieldCheck, Users } from 'lucide-react'
import { db } from '../firebase'
import { useAuthProfile } from '../authContext'
import { ACTIVITY_ACTIONS, getActivityActionLabel, recordActivity } from '../activityLog'
import '../css/SystemLogs.css'
import wesleyLogo from '../assets/wesley-logo.png'

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
  return date ? date.toLocaleString() : 'Time unavailable'
}

export default function SystemLogs() {
  const { userProfile } = useAuthProfile()
  const location = useLocation()
  const navigate = useNavigate()
  const [activityLogs, setActivityLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scopeFilter, setScopeFilter] = useState('all')

  useEffect(() => {
    if (userProfile?.role !== 'superadmin') return undefined
    const activityQuery = query(
      collection(db, 'activity_logs'),
      orderBy('created_at', 'desc'),
      limit(200)
    )
    return onSnapshot(
      activityQuery,
      (snapshot) => {
        setActivityLogs(snapshot.docs.map((activityDoc) => ({
          id: activityDoc.id,
          ...activityDoc.data(),
        })))
        setError('')
        setLoading(false)
      },
      (fetchError) => {
        console.error('Failed to load system activity:', fetchError)
        setError('System activity could not be loaded. Check your access and connection.')
        setLoading(false)
      }
    )
  }, [userProfile])

  const handleLogout = async () => {
    await recordActivity(userProfile, ACTIVITY_ACTIONS.LOGOUT, 'session')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (userProfile?.role !== 'superadmin') return <Navigate to="/sares/dashboard" replace />

  const visibleLogs = scopeFilter === 'all'
    ? activityLogs
    : activityLogs.filter((activity) => activity.school_scope === scopeFilter)

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
          <label className="logs-filter">
            <span>School scope</span>
            <select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value)}>
              <option value="all">All scopes</option>
              <option value="elementary">Elementary</option>
              <option value="high_school">High school</option>
            </select>
          </label>
        </header>

        <section className="logs-card" aria-label="Recent system activity">
          {loading ? (
            <p className="logs-state">Loading system activity…</p>
          ) : error ? (
            <p className="logs-state logs-state--error" role="alert">{error}</p>
          ) : visibleLogs.length === 0 ? (
            <p className="logs-state">No activity found for this scope.</p>
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
                  {visibleLogs.map((activity) => (
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
        </section>
      </main>
    </div>
  )
}
