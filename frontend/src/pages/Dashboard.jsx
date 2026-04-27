import React, { useState } from 'react';
import '../css/Dashboard.css';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-container">

      {/* ── Mobile top bar ── */}
      <div className="mobile-menu-bar">
        <div className="logo-container">
          <div className="logo-icon-container">
            <span className="logo-letter">A</span>
          </div>
          <h1 className="admin-title">ADMIN</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mobile-menu-btn">
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* ── Sidebar ── */}
      <div className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon-container">
              <span className="logo-letter">A</span>
            </div>
            <h1 className="admin-title">SARES</h1>
          </div>
        </div>

        <nav className="navigation">
          <ul className="nav-list">
            <li>
              <a href="#" className="nav-item-active">
                <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4a1 1 0 001-1v-3h2v3a1 1 0 001 1h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span className="nav-text">Dashboard</span>
              </a>
            </li>
            <li>
              <a href="#" className="nav-item">
                <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span className="nav-text">Students</span>
              </a>
            </li>
            <li>
              <a href="#" className="nav-item">
                <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="nav-text">Log Violation</span>
              </a>
            </li>
            <li>
              <a href="#" className="nav-item">
                <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                <span className="nav-text">Rule Management</span>
              </a>
            </li>
            <li>
              <a href="#" className="nav-item">
                <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                <span className="nav-text">Reports</span>
              </a>
            </li>
          </ul>
        </nav>

        <div className="logout-section">
          <button className="logout-button">
            <svg className="button-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            <span className="nav-text">Logout</span>
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="main-content">
        <div className="content-wrapper">

          {/* Welcome Card */}
          <div className="welcome-card">
            <div className="welcome-inner">
              <div className="welcome-grid">
                <div className="welcome-text-section">
                  <h1 className="welcome-title">Welcome Back, Admin!</h1>
                  <p className="welcome-subtitle">Here's what's happening with student violations today</p>

                  <div className="stats-grid">
                    <div>
                      <p className="stat-label">Pending Actions</p>
                      <p className="stat-value-pending">0</p>
                    </div>
                    <div>
                      <p className="stat-label">This Month</p>
                      <p className="stat-value-month">5</p>
                    </div>
                  </div>

                  <button className="cta-button">
                    <svg className="button-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    <span className="button-text">Log New Violation</span>
                    <svg className="button-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div className="image-container">
                  <div className="image-overlay" />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="stats-cards-grid">
            <div className="stat-card">
              <div className="card-header">
                <h3 className="card-title">Total Violations</h3>
                <svg className="card-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="card-value">5</p>
              <p className="card-subtitle">All time recorded</p>
            </div>

            <div className="stat-card">
              <div className="card-header">
                <h3 className="card-title">This Month</h3>
                <svg className="card-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="card-value">5</p>
              <p className="card-subtitle positive">-12% from last month</p>
            </div>

            <div className="stat-card special-card">
              <div className="card-header">
                <h3 className="card-title special-card-title">Repeat Offenders</h3>
                <svg className="card-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="card-value special-card-value">2</p>
              <p className="card-subtitle special-card-subtitle">Require attention</p>
            </div>

            <div className="stat-card">
              <div className="card-header">
                <h3 className="card-title">Total Students</h3>
                <svg className="card-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <p className="card-value">5</p>
              <p className="card-subtitle">In the system</p>
            </div>
          </div>

          {/* Charts */}
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Violation Trends</h3>
                <p className="chart-subtitle">Monthly violation count over time</p>
              </div>
              <div className="chart-container">
                <svg viewBox="0 0 520 220" className="chart-svg" aria-hidden="true">
                  <defs>
                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%"   stopColor="#7b9dff" />
                      <stop offset="100%" stopColor="#5fa8ff" />
                    </linearGradient>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#7b9dff" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#7b9dff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <g stroke="rgba(255,255,255,0.07)" strokeWidth="1">
                    <line x1="30"  y1="170" x2="500" y2="170" />
                    <line x1="30"  y1="128" x2="500" y2="128" />
                    <line x1="30"  y1="85"  x2="500" y2="85"  />
                    <line x1="30"  y1="42"  x2="500" y2="42"  />
                    <line x1="30"  y1="10"  x2="30"  y2="185" />
                    <line x1="148" y1="10"  x2="148" y2="185" />
                    <line x1="266" y1="10"  x2="266" y2="185" />
                    <line x1="384" y1="10"  x2="384" y2="185" />
                    <line x1="500" y1="10"  x2="500" y2="185" />
                  </g>
                  <path d="M30 170 C90 120 148 80 230 100 C290 118 360 95 500 185 L500 185 L30 185 Z" fill="url(#areaGrad)" stroke="none" />
                  <path d="M30 170 C90 120 148 80 230 100 C290 118 360 95 500 185" fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="30"  cy="170" r="5" fill="#7b9dff" stroke="#0f1422" strokeWidth="2" />
                  <circle cx="118" cy="120" r="5" fill="#7b9dff" stroke="#0f1422" strokeWidth="2" />
                  <circle cx="230" cy="80"  r="5" fill="#7b9dff" stroke="#0f1422" strokeWidth="2" />
                  <circle cx="340" cy="100" r="5" fill="#7b9dff" stroke="#0f1422" strokeWidth="2" />
                  <circle cx="420" cy="95"  r="5" fill="#7b9dff" stroke="#0f1422" strokeWidth="2" />
                  <circle cx="500" cy="185" r="5" fill="#7b9dff" stroke="#0f1422" strokeWidth="2" />
                  <g fill="rgba(180,190,240,0.4)" fontSize="11" fontFamily="sans-serif">
                    <text x="22"  y="200">Jan</text>
                    <text x="108" y="200">Feb</text>
                    <text x="218" y="200">Mar</text>
                    <text x="326" y="200">Apr</text>
                    <text x="408" y="200">May</text>
                  </g>
                  <g fill="rgba(180,190,240,0.3)" fontSize="10" fontFamily="monospace">
                    <text x="18" y="174" textAnchor="end">0</text>
                    <text x="18" y="132" textAnchor="end">5</text>
                    <text x="18" y="89"  textAnchor="end">10</text>
                    <text x="18" y="46"  textAnchor="end">15</text>
                  </g>
                </svg>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Violations by Category</h3>
                <p className="chart-subtitle">Distribution of offense types</p>
              </div>
              <div className="chart-container pie-container">
                <svg viewBox="0 0 180 180" className="pie-svg" aria-hidden="true">
                  <circle cx="90" cy="90" r="60" fill="transparent" stroke="#7b9dff" strokeWidth="36" strokeDasharray="60 317" strokeDashoffset="0"    transform="rotate(-90 90 90)" />
                  <circle cx="90" cy="90" r="60" fill="transparent" stroke="#d96eff" strokeWidth="36" strokeDasharray="60 317" strokeDashoffset="-63"   transform="rotate(-90 90 90)" />
                  <circle cx="90" cy="90" r="60" fill="transparent" stroke="#ffc85c" strokeWidth="36" strokeDasharray="60 317" strokeDashoffset="-126"  transform="rotate(-90 90 90)" />
                  <circle cx="90" cy="90" r="60" fill="transparent" stroke="#5fe0b0" strokeWidth="36" strokeDasharray="60 317" strokeDashoffset="-189"  transform="rotate(-90 90 90)" />
                  <circle cx="90" cy="90" r="60" fill="transparent" stroke="#ff7864" strokeWidth="36" strokeDasharray="60 317" strokeDashoffset="-252"  transform="rotate(-90 90 90)" />
                  <circle cx="90" cy="90" r="40" fill="#141927" />
                </svg>
                <div className="pie-legend">
                  <div className="legend-item"><span className="legend-dot" style={{ background: '#7b9dff' }} />Academic Dishonesty: <strong>20%</strong></div>
                  <div className="legend-item"><span className="legend-dot" style={{ background: '#d96eff' }} />Behavioral Misconduct: <strong>20%</strong></div>
                  <div className="legend-item"><span className="legend-dot" style={{ background: '#ffc85c' }} />Attendance Violation: <strong>20%</strong></div>
                  <div className="legend-item"><span className="legend-dot" style={{ background: '#5fe0b0' }} />Dress Code Violation: <strong>20%</strong></div>
                  <div className="legend-item"><span className="legend-dot" style={{ background: '#ff7864' }} />Technology Misuse: <strong>20%</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Recent Activity + Repeat Offender Alerts */}
          <div className="bottom-grid">

            {/* Recent Violation Activity */}
            <div className="bottom-card">
              <h3 className="bottom-card-title">Recent Violation Activity</h3>
              <p className="bottom-card-subtitle">Latest recorded violations</p>

              <div className="violation-list">
                <div className="violation-row">
                  <div className="avatar" style={{ background: '#7b9dff22', color: '#7b9dff' }}>MS</div>
                  <div className="violation-info">
                    <div className="violation-name">Maria Santos</div>
                    <div className="violation-type">Academic Dishonesty</div>
                    <div className="violation-date">2026-04-05</div>
                  </div>
                  <span className="badge badge--resolved">resolved</span>
                </div>

                <div className="violation-row">
                  <div className="avatar" style={{ background: '#d96eff22', color: '#d96eff' }}>JD</div>
                  <div className="violation-info">
                    <div className="violation-name">Juan Dela Cruz</div>
                    <div className="violation-type">Behavioral Misconduct</div>
                    <div className="violation-date">2026-04-03</div>
                  </div>
                  <span className="badge badge--overridden">overridden</span>
                </div>

                <div className="violation-row">
                  <div className="avatar" style={{ background: '#5fe0b022', color: '#5fe0b0' }}>JR</div>
                  <div className="violation-info">
                    <div className="violation-name">Jose Ramos</div>
                    <div className="violation-type">Dress Code Violation</div>
                    <div className="violation-date">2026-04-01</div>
                  </div>
                  <span className="badge badge--resolved">resolved</span>
                </div>

                <div className="violation-row">
                  <div className="avatar" style={{ background: '#7b9dff22', color: '#7b9dff' }}>MS</div>
                  <div className="violation-info">
                    <div className="violation-name">Maria Santos</div>
                    <div className="violation-type">Attendance Violation</div>
                    <div className="violation-date">2026-03-28</div>
                  </div>
                  <span className="badge badge--resolved">resolved</span>
                </div>

                <div className="violation-row">
                  <div className="avatar" style={{ background: '#ff786422', color: '#ff7864' }}>PG</div>
                  <div className="violation-info">
                    <div className="violation-name">Pedro Garcia</div>
                    <div className="violation-type">Technology Misuse</div>
                    <div className="violation-date">2026-03-25</div>
                  </div>
                  <span className="badge badge--resolved">resolved</span>
                </div>
              </div>
            </div>

            {/* Repeat Offender Alerts */}
            <div className="bottom-card">
              <h3 className="bottom-card-title">Repeat Offender Alerts</h3>
              <p className="bottom-card-subtitle">Students with multiple violations</p>

              <div className="offender-list">
                <div className="offender-card offender-card--amber">
                  <div className="avatar avatar--lg" style={{ background: '#d96eff22', color: '#d96eff' }}>MS</div>
                  <div className="offender-info">
                    <div className="offender-name">Maria Santos</div>
                    <div className="offender-id">2024-00002 • 2nd Year</div>
                  </div>
                  <span className="offense-tag offense-tag--amber">5 violations</span>
                </div>

                <div className="offender-card offender-card--red">
                  <div className="avatar avatar--lg" style={{ background: '#ff786422', color: '#ff7864' }}>JR</div>
                  <div className="offender-info">
                    <div className="offender-name">Juan Ramos</div>
                    <div className="offender-id">2024-00005 • 3rd Year</div>
                  </div>
                  <span className="offense-tag offense-tag--red">7 violations</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;