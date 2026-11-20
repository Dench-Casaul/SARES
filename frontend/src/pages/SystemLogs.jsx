import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { collection, getDocs, limit, orderBy, query, startAfter, Timestamp, where, writeBatch } from 'firebase/firestore'
import { Trash2 } from 'lucide-react'
import { db } from '../firebase'
import { useAuthProfile } from '../authContext'
import {
  ACTIVITY_ACTIONS,
  LOG_RETENTION_DAYS,
  getActivityActionLabel,
  getFailedLoginReasonLabel,
  recordActivity,
} from '../activityLog'
import AppShell from '../AppShell'
import { getCaseStatusLabel } from '../caseStatus'
import { getPageItems } from '../pagination'
import { isMissingIndexError } from '../violationQueries'
import '../css/SystemLogs.css'

const PAGE_SIZE = 25
const SCAN_BATCH_SIZE = 100
const PURGE_BATCH_SIZE = 250
// Caps one cleanup run so it stays well inside the free daily delete quota (20,000).
const MAX_PURGE_PER_RUN = 5000
const DAY_MS = 24 * 60 * 60 * 1000

const activityLogs = () => collection(db, 'activity_logs')

function formatActivityDescription(activity) {
  const label = getActivityActionLabel(activity.action)
  if (activity.action === ACTIVITY_ACTIONS.VIOLATION_STATUS_UPDATED && activity.from_status && activity.to_status) {
    return `${label} (${getCaseStatusLabel(activity.from_status)} → ${getCaseStatusLabel(activity.to_status)})`
  }
  if (activity.action === ACTIVITY_ACTIONS.ACTIVITY_LOGS_PURGED && activity.target_id) {
    return `${label} (${activity.target_id} entries)`
  }
  if (activity.action !== ACTIVITY_ACTIONS.LOGIN_FAILED) return label
  const details = [
    getFailedLoginReasonLabel(activity.target_id),
    activity.ip_address ? `IP ${activity.ip_address}` : '',
  ].filter(Boolean)
  return details.length ? `${label} (${details.join(' · ')})` : label
}

function formatActivityDate(timestamp) {
  const date = timestamp?.toDate?.()
    || (timestamp instanceof Date ? timestamp : null)
  return date ? date.toLocaleString() : 'Time unavailable'
}

function getDateConstraints(filters) {
  if (filters.dateRange === 'all') return []
  const cutoff = new Date(filters.appliedAt || Date.now())
  cutoff.setDate(cutoff.getDate() - Number(filters.dateRange))
  return [where('created_at', '>=', Timestamp.fromDate(cutoff))]
}

function matchesFilters(activity, filters) {
  const matchesScope = filters.scope === 'all'
    || (filters.scope === 'admin' ? activity.school_scope === 'all' : activity.school_scope === filters.scope)
  const matchesAction = filters.action === 'all' || activity.action === filters.action
  return matchesScope && matchesAction
}

/**
 * One page of logs, filtered by Firestore itself, so a page costs about
 * PAGE_SIZE reads however large the log grows. Needs the activity_logs indexes
 * in firestore.indexes.json.
 */
async function fetchFilteredPage(filters, startCursor) {
  const constraints = [
    ...(filters.action !== 'all' ? [where('action', '==', filters.action)] : []),
    ...(filters.scope !== 'all' ? [where('school_scope', '==', filters.scope === 'admin' ? 'all' : filters.scope)] : []),
    ...getDateConstraints(filters),
    orderBy('created_at', 'desc'),
    ...(startCursor ? [startAfter(startCursor)] : []),
    limit(PAGE_SIZE + 1),
  ]
  const snapshot = await getDocs(query(activityLogs(), ...constraints))
  return {
    logs: snapshot.docs.slice(0, PAGE_SIZE).map((logDoc) => ({ id: logDoc.id, ...logDoc.data() })),
    nextCursor: snapshot.docs.length > PAGE_SIZE ? snapshot.docs[PAGE_SIZE - 1] : null,
  }
}

/** Fallback before the indexes are deployed: reads logs in batches and filters them here. */
async function fetchScannedPage(filters, startCursor, isCancelled) {
  const constraints = [...getDateConstraints(filters), orderBy('created_at', 'desc')]
  let scanCursor = startCursor
  let exhausted = false
  const matches = []

  while (matches.length <= PAGE_SIZE && !exhausted) {
    const snapshot = await getDocs(query(
      activityLogs(),
      ...constraints,
      ...(scanCursor ? [startAfter(scanCursor)] : []),
      limit(SCAN_BATCH_SIZE)
    ))
    if (isCancelled()) return null
    for (const logDoc of snapshot.docs) {
      const activity = { id: logDoc.id, ...logDoc.data() }
      if (matchesFilters(activity, filters)) matches.push({ activity, cursor: logDoc })
      if (matches.length > PAGE_SIZE) break
    }
    scanCursor = snapshot.docs.at(-1) || scanCursor
    exhausted = snapshot.docs.length < SCAN_BATCH_SIZE
  }

  return {
    logs: matches.slice(0, PAGE_SIZE).map(({ activity }) => activity),
    nextCursor: matches.length > PAGE_SIZE ? matches[PAGE_SIZE - 1].cursor : null,
  }
}

export default function SystemLogs() {
  const { userProfile } = useAuthProfile()
  const [logs, setLogs] = useState([])
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
  const [purging, setPurging] = useState(false)
  const [purgeMessage, setPurgeMessage] = useState('')
  const [purgeError, setPurgeError] = useState('')

  useEffect(() => {
    if (userProfile?.role !== 'superadmin') return undefined

    let cancelled = false
    const loadPage = async () => {
      setLoading(true)
      setError('')
      setLogs([])
      setNextPageCursor(null)

      const startCursor = pageStartCursors[pageIndex] || null
      try {
        let page
        try {
          page = await fetchFilteredPage(filters, startCursor)
        } catch (queryError) {
          if (!isMissingIndexError(queryError)) throw queryError
          console.warn('System Logs: Firestore indexes not deployed yet, so logs are filtered in the browser. Deploy firestore.indexes.json to fix.', queryError)
          page = await fetchScannedPage(filters, startCursor, () => cancelled)
        }
        if (cancelled || !page) return
        setLogs(page.logs)
        setNextPageCursor(page.nextCursor)
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

  const reloadFromFirstPage = (nextFilters) => {
    setPageIndex(0)
    setPageStartCursors([null])
    setFilters({ ...nextFilters, appliedAt: Date.now() })
  }

  const handleApplyFilters = (event) => {
    event.preventDefault()
    reloadFromFirstPage(filterForm)
  }

  // Deletes logs older than the retention period. Firestore rules enforce the same
  // limit, so newer entries can't be deleted even by a modified client.
  const handlePurgeOldLogs = async () => {
    // One extra day of margin so clock differences never touch an entry the rules protect.
    const cutoff = new Date(Date.now() - (LOG_RETENTION_DAYS + 1) * DAY_MS)
    const cutoffLabel = cutoff.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const confirmed = window.confirm(
      `Permanently delete all activity logs from before ${cutoffLabel}?\n\nDeleted logs cannot be recovered. Newer logs are not affected.`
    )
    if (!confirmed) return

    setPurging(true)
    setPurgeMessage('')
    setPurgeError('')
    let deleted = 0
    let reachedLimit = false
    try {
      for (;;) {
        const snapshot = await getDocs(query(
          activityLogs(),
          where('created_at', '<', Timestamp.fromDate(cutoff)),
          orderBy('created_at'),
          limit(PURGE_BATCH_SIZE)
        ))
        if (snapshot.empty) break
        const batch = writeBatch(db)
        snapshot.docs.forEach((logDoc) => batch.delete(logDoc.ref))
        await batch.commit()
        deleted += snapshot.size
        if (snapshot.size < PURGE_BATCH_SIZE) break
        if (deleted >= MAX_PURGE_PER_RUN) {
          reachedLimit = true
          break
        }
      }

      if (deleted > 0) {
        await recordActivity(userProfile, ACTIVITY_ACTIONS.ACTIVITY_LOGS_PURGED, 'activity_log', String(deleted))
        reloadFromFirstPage(filters)
      }
      setPurgeMessage(deleted === 0
        ? `There are no logs older than one year (before ${cutoffLabel}).`
        : `Deleted ${deleted.toLocaleString()} log ${deleted === 1 ? 'entry' : 'entries'} from before ${cutoffLabel}.${reachedLimit ? ' More remain: run the cleanup again (tomorrow if today\'s free database limit is close).' : ''}`)
    } catch (purgeFailure) {
      console.error('Failed to delete old activity logs:', purgeFailure)
      setPurgeError(deleted > 0
        ? `Deleted ${deleted.toLocaleString()} entries, then the cleanup stopped. Try again later.`
        : 'Old logs could not be deleted. Check your connection, and that the latest database rules are deployed.')
    } finally {
      setPurging(false)
    }
  }

  // Logs are read from Firestore page by page, so the total is unknown. Page
  // buttons cover every page reached so far, plus the next page when one exists.
  const knownPageCount = pageStartCursors.length
  const onLastKnownPage = pageIndex === knownPageCount - 1
  const pageButtonCount = knownPageCount + (onLastKnownPage && nextPageCursor ? 1 : 0)
  const hasNextPage = pageIndex + 1 < knownPageCount || Boolean(nextPageCursor)

  const goToPage = (pageNumber) => {
    const targetIndex = pageNumber - 1
    if (targetIndex < 0 || targetIndex === pageIndex) return
    if (targetIndex < knownPageCount) {
      setPageIndex(targetIndex)
      return
    }
    if (targetIndex === knownPageCount && onLastKnownPage && nextPageCursor) {
      setPageStartCursors((cursors) => [...cursors, nextPageCursor])
      setPageIndex(targetIndex)
    }
  }

  if (userProfile?.role !== 'superadmin') return <Navigate to="/sares/dashboard" replace />

  const availableActions = Object.values(ACTIVITY_ACTIONS)
    .map((action) => ({ value: action, label: getActivityActionLabel(action) }))
    .sort((left, right) => left.label.localeCompare(right.label))

  return (
    <AppShell>
        <header className="app-page-heading">
          <h1 className="app-page-title">System Logs</h1>
          <p className="app-page-sub">Recent activity: sign-ins, failed sign-in attempts, sign-outs, and in-app actions across both school scopes.</p>
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
          ) : logs.length === 0 ? (
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
                  {logs.map((activity) => (
                    <tr key={activity.id}>
                      <td>{formatActivityDate(activity.created_at)}</td>
                      <td>{activity.actor_email || 'Unknown account'}</td>
                      <td>{activity.school_scope === 'high_school' ? 'High school' : activity.school_scope === 'elementary' ? 'Elementary' : activity.school_scope === 'all' ? 'Admin' : 'Shared'}</td>
                      <td>{formatActivityDescription(activity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && logs.length > 0 && (
            <div className="logs-pagination">
              <span>
                Showing {pageIndex * PAGE_SIZE + 1}–{pageIndex * PAGE_SIZE + logs.length}
              </span>
              {pageButtonCount > 1 && (
                <nav className="logs-pagination-pages" aria-label="System log pages">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={pageIndex === 0}
                    onClick={() => goToPage(pageIndex)}
                  >
                    ‹
                  </button>
                  {getPageItems(pageIndex + 1, pageButtonCount).map((item, index) => (
                    item === 'ellipsis' ? (
                      <span key={`ellipsis-${index}`} className="logs-pagination-ellipsis" aria-hidden="true">…</span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        className={item === pageIndex + 1 ? 'active' : ''}
                        aria-label={`Page ${item}`}
                        aria-current={item === pageIndex + 1 ? 'page' : undefined}
                        onClick={() => goToPage(item)}
                      >
                        {item}
                      </button>
                    )
                  ))}
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={!hasNextPage}
                    onClick={() => goToPage(pageIndex + 2)}
                  >
                    ›
                  </button>
                </nav>
              )}
            </div>
          )}
        </section>

        <section className="logs-retention" aria-labelledby="logs-retention-title">
          <div className="logs-retention-text">
            <h2 id="logs-retention-title">Log retention</h2>
            <p>
              Activity logs are kept for one year. Deleting older entries keeps the log fast and within the free
              database limits, and follows the Data Privacy Act principle of keeping personal data no longer than
              needed. Only entries older than one year can be deleted, and deleted logs cannot be recovered.
            </p>
            {purgeMessage && <p className="logs-retention-message" role="status">{purgeMessage}</p>}
            {purgeError && <p className="logs-retention-error" role="alert">{purgeError}</p>}
          </div>
          <button type="button" className="logs-retention-btn" onClick={handlePurgeOldLogs} disabled={purging}>
            <Trash2 size={16} aria-hidden="true" />
            {purging ? 'Deleting old logs…' : 'Delete logs older than one year'}
          </button>
        </section>
    </AppShell>
  )
}
