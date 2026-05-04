import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '../css/Reports.css'
import { LayoutDashboard, Users, ClipboardList, ShieldCheck, BarChart3, LogOut } from 'lucide-react'
import wesleyLogo from '../assets/wesley-logo.png'


function Sidebar({ activePage, handleLogout }) {
  return (
    <aside className="report-sidebar">
      <div className="report-sidebar-header">
        <div className="report-logo">
          <div className="report-logo-icon">
            <img
              src={wesleyLogo}
              alt="Olongapo Wesley School Logo"
              className="school-logo"
            />
          </div>
          <div>
            <h1 className="report-logo-text">SARES</h1>
          </div>
        </div>
      </div>

      <nav className="report-nav">
        <ul className="report-nav-list">
          <li>
            <Link
              to="/sares/dashboard"
              className={`report-nav-item${activePage === "/sares/dashboard" ? " report-nav-item--active" : ""}`}
            >
              <LayoutDashboard className="report-nav-icon" />
              <span>Dashboard</span>
            </Link>
          </li>

          <li>
            <Link
              to="/sares/students"
              className={`report-nav-item${activePage === "/sares/students" ? " report-nav-item--active" : ""}`}
            >
              <Users className="report-nav-icon" />
              <span>Students</span>
            </Link>
          </li>

          <li>
            <Link
              to="/sares/violation"
              className={`report-nav-item${activePage === "/sares/violation" ? " report-nav-item--active" : ""}`}
            >
              <ClipboardList className="report-nav-icon" />
              <span>Log Violation</span>
            </Link>
          </li>

          <li>
            <Link
              to="/sares/rules"
              className={`report-nav-item${activePage === "/sares/rules" ? " report-nav-item--active" : ""}`}
            >
              <ShieldCheck className="report-nav-icon" />
              <span>Rule Management</span>
            </Link>
          </li>

          <li>
            <Link
              to="/sares/reports"
              className={`report-nav-item${activePage === "/sares/reports" ? " report-nav-item--active" : ""}`}
            >
              <BarChart3 className="report-nav-icon" />
              <span>Reports</span>
            </Link>
          </li>
        </ul>
      </nav>

      <div className="report-sidebar-footer">
        <button type="button" className="report-logout-btn" onClick={handleLogout}>
          <LogOut className="report-nav-icon" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

const categoryData = [
  { label: 'Academic Dishonesty', count: 1 },
  { label: 'Behavioral Misconduct', count: 1 },
  { label: 'Dress Code Violation', count: 1 },
  { label: 'Attendance Violation', count: 1 },
  { label: 'Technology Misuse', count: 1 },
];

const yearLevelData = [
  { label: '1st Year', count: 1 },
  { label: '2nd Year', count: 2 },
  { label: '3rd Year', count: 1 },
  { label: '4th Year', count: 1 },
];

const repeatOffenders = [
  {
    name: 'Jose Ramos',
    id: '2024-00005',
    year: '3rd Year',
    section: 'B',
    violations: 7,
    records: [
      {
        category: 'Dress Code Violation',
        detail: '2026-04-01 • Warning and parent notification',
      },
    ],
  },
  {
    name: 'Maria Santos',
    id: '2024-00002',
    year: '2nd Year',
    section: 'B',
    violations: 5,
    records: [
      {
        category: 'Academic Dishonesty',
        detail: '2026-04-05 • Zero grade on assignment and one-week suspension',
      },
      {
        category: 'Attendance Violation',
        detail: '2026-03-28 • Parent conference and written warning',
      },
    ],
  },
];

const sanctionLogs = [
  {
    student: 'Maria Santos',
    offense: 'Academic Dishonesty - Plagiarism',
    recommended: 'Zero grade on assignment and written warning',
    final: 'Zero grade on assignment and one-week suspension',
    status: 'Accepted',
  },
  {
    student: 'Juan Dela Cruz',
    offense: 'Behavioral Misconduct - Disrespect to Faculty',
    recommended: 'Two-day suspension and parent conference',
    final: 'Written apology and counseling session',
    status: 'Overridden',
  },
];

const trendData = [
  { month: 'January', value: 8 },
  { month: 'February', value: 12 },
  { month: 'March', value: 10 },
  { month: 'April', value: 5 },
];

export default function Report() {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('frequency');
  const [yearFilter, setYearFilter] = useState('All Year Level');
  const [monthFilter, setMonthFilter] = useState('All Months');
  const [toast, setToast] = useState('');

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const handleExportPDF = () => {
    showToast('Report exported to PDF successfully!');
  };

  const handleExportExcel = () => {
    showToast('Report exported to Excel successfully!');
  };

  return (
    <div className="report-page">
      <Sidebar activePage={location.pathname} />

      <main className="report-main">
        <section className="report-hero">
          <div className="report-hero-content">
            <h1>Reports & Analytics</h1>
            <p>Comprehensive violation statistics and trend analysis</p>

            <div className="report-hero-actions">
              <button onClick={handleExportPDF} className="report-secondary-btn">
                Export PDF
              </button>

              <button onClick={handleExportExcel} className="report-secondary-btn">
                Export Excel
              </button>
            </div>
          </div>

          <div className="report-hero-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 3v4M16 3v4M4 9h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
        </section>

        <section className="report-filter-card">
          <h2>Report Filters</h2>

          <div className="report-filter-row">
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option>All Year Level</option>
              <option>Kinder</option>
              <option>Grade 1</option>
              <option>Grade 2</option>
              <option>Grade 3</option>
              <option>Grade 4</option>
              <option>Grade 5</option>
              <option>Grade 6</option>
              <option>Grade 7</option>
              <option>Grade 8</option>
              <option>Grade 9</option>
              <option>Grade 10</option>
            </select>

            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              <option>All Months</option>
              <option>January</option>
              <option>February</option>
              <option>March</option>
              <option>April</option>
            </select>
          </div>
        </section>

        <div className="report-tabs">
          <button
            className={activeTab === 'frequency' ? 'active' : ''}
            onClick={() => setActiveTab('frequency')}
          >
            Frequency
          </button>

          <button
            className={activeTab === 'offenders' ? 'active' : ''}
            onClick={() => setActiveTab('offenders')}
          >
            Repeat Offenders
          </button>

          <button
            className={activeTab === 'consistency' ? 'active' : ''}
            onClick={() => setActiveTab('consistency')}>
            Consistency
          </button>

          <button
            className={activeTab === 'trends' ? 'active' : ''}
            onClick={() => setActiveTab('trends')}
          >
            Trends
          </button>
        </div>

        {activeTab === 'frequency' && (
          <div className="report-tab-content">
            <section className="report-card">
              <div className="report-card-header">
                <h2>Violations by Category</h2>
                <p>Distribution of violation types</p>
              </div>

              <div className="report-bar-chart">
                <div className="report-y-axis">
                  <span>1</span>
                  <span>0.75</span>
                  <span>0.5</span>
                  <span>0.25</span>
                  <span>0</span>
                </div>

                <div className="report-bars-area">
                  {categoryData.map((item) => (
                    <div className="report-bar-item" key={item.label}>
                      <div className="report-bar-wrap">
                        <div
                          className="report-bar"
                          style={{ height: `${item.count * 100}%` }} />
                      </div>
                      <p className="report-bar-label">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="report-card">
              <div className="report-card-header">
                <h2>Violations by Year Level</h2>
                <p>Distribution across student year levels</p>
              </div>

              <div className="report-small-bars">
                {yearLevelData.map((item) => (
                  <div className="report-small-bar-row" key={item.label}>
                    <span>{item.label}</span>
                    <div>
                      <strong style={{ width: `${item.count * 25}%` }}></strong>
                    </div>
                    <p>{item.count}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'offenders' && (
          <section className="report-card">
            <div className="report-card-header">
              <h2>Repeat Offender List</h2>
              <p>Students with multiple violations requiring attention</p>
            </div>

            <div className="report-offender-list">
              {repeatOffenders.map((student) => (
                <article className="report-offender-card" key={student.id}>
                  <div className="report-offender-top">
                    <div>
                      <h3>{student.name}</h3>
                      <p>{student.id} • {student.year} - {student.section}</p>
                    </div>

                    <span>{student.violations} Violations</span>
                  </div>

                  <div className="report-offender-records">
                    {student.records.map((record, index) => (
                      <div className="report-offender-record" key={index}>
                        <span>⚠</span>
                        <div>
                          <h4>{record.category}</h4>
                          <p>{record.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'consistency' && (
          <div className="report-tab-content">
            <div className="report-stat-grid">
              <div className="report-stat-card">
                <p>Total Sanctions</p>
                <h3>5</h3>
              </div>

              <div className="report-stat-card">
                <p>Accepted</p>
                <h3 className="green">4</h3>
              </div>

              <div className="report-stat-card">
                <p>Override Rate</p>
                <h3 className="orange">20.0%</h3>
              </div>
            </div>

            <section className="report-card">
              <div className="report-card-header">
                <h2>Sanction Decision Log</h2>
                <p>Comparison of recommended vs. final sanctions</p>
              </div>

              <div className="report-log-list">
                {sanctionLogs.map((item, index) => (
                  <article className="report-log-card" key={index}>
                    <div className="report-log-top">
                      <div>
                        <h3>{item.student}</h3>
                        <p>{item.offense}</p>
                      </div>

                      <span className={item.status === 'Overridden' ? 'overridden' : 'accepted'}>
                        {item.status}
                      </span>
                    </div>

                    <div className="report-decision-grid">
                      <div className="report-decision-box recommended">
                        <p>Recommended:</p>
                        <h4>{item.recommended}</h4>
                      </div>

                      <div className={`report-decision-box ${item.status === 'Overridden' ? 'final-overridden' : 'final-accepted'}`}>
                        <p>Final Decision:</p>
                        <h4>{item.final}</h4>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="report-tab-content">
            <section className="report-card">
              <div className="report-card-header">
                <h2>Monthly Violation Trends</h2>
                <p>Violation count over the past months</p>
              </div>

              <div className="report-line-chart">
                <svg viewBox="0 0 700 260" preserveAspectRatio="none">
                  <line x1="40" y1="20" x2="40" y2="220" />
                  <line x1="40" y1="220" x2="670" y2="220" />

                  <line x1="40" y1="20" x2="670" y2="20" className="grid" />
                  <line x1="40" y1="70" x2="670" y2="70" className="grid" />
                  <line x1="40" y1="120" x2="670" y2="120" className="grid" />
                  <line x1="40" y1="170" x2="670" y2="170" className="grid" />

                  <polyline
                    points="40,86 250,20 460,53 670,136"
                    fill="none"
                    stroke="#6d6bff"
                    strokeWidth="3"
                  />

                  <circle cx="40" cy="86" r="4" />
                  <circle cx="250" cy="20" r="4" />
                  <circle cx="460" cy="53" r="4" />
                  <circle cx="670" cy="136" r="4" />
                </svg>

                <div className="report-line-labels">
                  {trendData.map((item) => (
                    <span key={item.month}>{item.month}</span>
                  ))}
                </div>

                <p className="report-line-legend">• Violations</p>
              </div>
            </section>

            <div className="report-bottom-grid">
              <section className="report-card">
                <div className="report-card-header">
                  <h2>Key Insights</h2>
                </div>

                <div className="report-insight-list">
                  <div className="report-insight blue">
                    <span>↗</span>
                    <div>
                      <h3>Most Common Violation</h3>
                      <p>Academic Dishonesty</p>
                    </div>
                  </div>

                  <div className="report-insight orange">
                    <span>⚠</span>
                    <div>
                      <h3>Repeat Offenders</h3>
                      <p>2 students require intervention</p>
                    </div>
                  </div>

                  <div className="report-insight green">
                    <span>▧</span>
                    <div>
                      <h3>Recommendation Acceptance</h3>
                      <p>80.0% of recommendations accepted</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="report-card">
                <div className="report-card-header">
                  <h2>Summary Statistics</h2>
                </div>

                <div className="report-summary-list">
                  <div>
                    <p>Total Violations This Year</p>
                    <h3>5</h3>
                  </div>

                  <div>
                    <p>Students with Violations</p>
                    <h3>4</h3>
                  </div>

                  <div>
                    <p>Average Violations per Student</p>
                    <h3>1.3</h3>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div className="report-toast">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}