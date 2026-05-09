import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '../css/Reports.css'
import { LayoutDashboard, Users, ClipboardList, ShieldCheck, BarChart3, LogOut, TrendingUp, TriangleAlert, CheckCircle2 } from 'lucide-react'
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


export default function Report() {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('frequency');
  const [yearFilter, setYearFilter] = useState('All Year Level');
  const [monthFilter, setMonthFilter] = useState('All Months');
  const [toast, setToast] = useState('');

  const [categoryData, setCategoryData] = useState([]);
  const [yearLevelData, setYearLevelData] = useState([]);
  const [repeatOffenders, setRepeatOffenders] = useState([]);
  const [sanctionLogs, setSanctionLogs] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalViolations: 0,
    studentsWithViolations: 0,
    accepted: 0,
    overrideRate: 0,
  });
  const [loading, setLoading] = useState(true);



  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      setLoading(true);

      const response = await fetch('http://127.0.0.1:5000/api/reports/summary');

      if (!response.ok) {
        throw new Error('Failed to fetch reports data');
      }

      const data = await response.json();

      setCategoryData(data.categoryData || []);
      setYearLevelData(data.yearLevelData || []);
      setRepeatOffenders(data.repeatOffenders || []);
      setSanctionLogs(data.sanctionLogs || []);
      setTrendData(data.trendData || []);
      setSummaryStats(data.summaryStats || {
        totalViolations: 0,
        studentsWithViolations: 0,
        accepted: 0,
        overrideRate: 0,
      });
    } catch (error) {
      console.error('Reports fetch error:', error);
      showToast('Failed to load reports data.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    showToast('Report exported to PDF successfully!');
  };

  const handleExportExcel = () => {
    showToast('Report exported to Excel successfully!');
  };

  const mostCommonViolation =
    categoryData.length > 0
      ? categoryData.reduce((max, item) => item.count > max.count ? item : max, categoryData[0]).label
      : 'No data yet';

  const recommendationAcceptance =
    summaryStats.totalViolations > 0
      ? ((summaryStats.accepted / summaryStats.totalViolations) * 100).toFixed(1)
      : '0.0';

  const averageViolationsPerStudent =
    summaryStats.studentsWithViolations > 0
      ? (summaryStats.totalViolations / summaryStats.studentsWithViolations).toFixed(1)
      : '0.0';

  return (
    <div className="report-page">
      <Sidebar activePage={location.pathname} handleLogout={handleLogout} />

      <main className="report-main">
        <section className="report-hero">
          <div className="report-hero-content">
            <div>
              <h1>Reports & Analytics</h1>
              <p>Comprehensive violation statistics and trend analysis</p>
            </div>

            <div className="report-hero-actions">
              <button onClick={handleExportPDF} className="report-secondary-btn">
                Export PDF
              </button>

              <button onClick={handleExportExcel} className="report-secondary-btn">
                Export Excel
              </button>
            </div>
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

        {loading && (
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Loading reports data...
          </p>
        )}

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
                  {
                    categoryData.map((item) => (
                      <div className="report-bar-item" key={item.label}>
                        <div className="report-bar-wrap">
                          <div
                            className="report-bar"
                            style={{
                              height: `${Math.max(
                                (item.count / Math.max(...categoryData.map((c) => c.count), 1)) * 100,
                                5
                              )}%`,
                            }} />
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
                <h3>{summaryStats.totalViolations}</h3>
              </div>

              <div className="report-stat-card">
                <p>Accepted</p>
                <h3 className="green">{summaryStats.accepted}</h3>
              </div>

              <div className="report-stat-card">
                <p>Override Rate</p>
                <h3 className="orange">{summaryStats.overrideRate}%</h3>
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

              <div className="report-small-bars">
                {trendData.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '14px' }}>
                    No monthly trend data yet.
                  </p>
                ) : (
                  trendData.map((item) => {
                    const maxTrend = Math.max(...trendData.map((t) => t.value), 1);

                    return (
                      <div className="report-small-bar-row" key={item.month}>
                        <span>{item.month}</span>
                        <div>
                          <strong style={{ width: `${(item.value / maxTrend) * 100}%` }}></strong>
                        </div>
                        <p>{item.value}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <div className="report-bottom-grid">
              <section className="report-card">
                <div className="report-card-header">
                  <h2>Key Insights</h2>
                </div>

                <div className="report-insight-list">
                  <div className="report-insight blue">
                    <TrendingUp size={18} />
                    <div>
                      <h3>Most Common Violation</h3>
                      <p>{mostCommonViolation}</p>
                    </div>
                  </div>

                  <div className="report-insight orange">
                    <TriangleAlert size={18} />
                    <div>
                      <h3>Repeat Offenders</h3>
                      <p>{repeatOffenders.length} students require intervention</p>
                    </div>
                  </div>

                  <div className="report-insight green">
                    <CheckCircle2 size={18} />
                    <div>
                      <h3>Recommendation Acceptance</h3>
                      <p>{recommendationAcceptance}% of recommendations accepted</p>
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
                    <h3>{summaryStats.totalViolations}</h3>
                  </div>

                  <div>
                    <p>Students with Violations</p>
                    <h3>{summaryStats.studentsWithViolations}</h3>
                  </div>

                  <div>
                    <p>Average Violations per Student</p>
                    <h3>{averageViolationsPerStudent}</h3>
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