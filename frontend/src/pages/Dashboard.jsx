import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '../css/Dashboard.css'
import heroImg from '../assets/hero.png'
const API_URL = 'http://127.0.0.1:5000';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    total_students: 0,
    total_violations: 0,
    pending_actions: 0,
    repeat_offenders: 0,
  });

  const [recentViolations, setRecentViolations] = useState([]);
  const [repeatOffenders, setRepeatOffenders] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [summaryRes, violationsRes] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/summary`),
        fetch(`${API_URL}/api/violations`),
      ]);

      const summaryData = await summaryRes.json();
      const violationsData = await violationsRes.json();

      setSummary(summaryData);
      setRecentViolations(violationsData.slice(0, 5));
      setRepeatOffenders(getRepeatOffenders(violationsData));
      setCategoryStats(getCategoryStats(violationsData));
    } catch (error) {
      console.error('Dashboard load error:', error);
    }
  };

  const getRepeatOffenders = (violations) => {
    const grouped = {};

    violations.forEach((v) => {
      if (!grouped[v.student_id]) {
        grouped[v.student_id] = {
          student_id: v.student_id,
          student_name: v.student_name,
          student_number: v.student_number,
          year_level: v.year_level,
          count: 0,
        };
      }

      grouped[v.student_id].count += 1;
    });

    return Object.values(grouped)
      .filter((student) => student.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const handleLogout = () => {
    // Clear any stored user data (e.g., tokens, user info)
    localStorage.removeItem('user');
    // Navigate to the login page
    navigate('/login');
  };


  const getCategoryStats = (violations) => {
    const grouped = {};

    violations.forEach((v) => {
      const category = v.category_name || 'Uncategorized';
      grouped[category] = (grouped[category] || 0) + 1;
    });

    const total = violations.length || 1;

    return Object.entries(grouped).map(([category, count]) => ({
      category,
      count,
      percent: Math.round((count / total) * 100),
    }));
  };





  return (
    <div className="dashboard-container">

      {/* menu */}
      <div className="mobile-menu-bar">
        <div className="logo-container">
          <div className="logo-icon-container">
            <span className="logo-letter">A</span>
          </div>
          <h1 className="admin-title">SARES</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mobile-menu-btn">
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon-container">
              <span className="logo-letter">S</span>
            </div>
            <h1 className="admin-title">SARES</h1>
          </div>
        </div>

        <nav className="navigation">
          <ul className="nav-list">
            <li>
              <Link to="/sares/dashboard" className={`nav-item${location.pathname === '/sares/dashboard' ? '-active' : ''}`}>
                <span className="nav-text">Dashboard</span>
              </Link>
            </li>
            <li>
              <Link to="/sares/students" className={`nav-item${location.pathname === '/sares/students' ? '-active' : ''}`}>
                <span className="nav-text">Students</span>
              </Link>
            </li>
            <li>
              <Link to="/sares/violation" className={`nav-item${location.pathname === '/sares/violation' ? '-active' : ''}`}>
                <span className="nav-text">Log Violation</span>
              </Link>
            </li>
            <li>
              <Link to="/sares/rules" className={`nav-item${location.pathname === '/sares/rules' ? '-active' : ''}`}>
                <span className="nav-text">Rule Management</span>
              </Link>
            </li>
            <li>
              <Link to="/sares/reports" className={`nav-item${location.pathname === '/sares/reports' ? '-active' : ''}`}>
                <span className="nav-text">Reports</span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className="logout-section">
          <button type="button" className="logout-button" onClick={handleLogout}>
            <span className="nav-text">Logout</span>
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="main-content">
        <div className="content-wrapper">

          {/* Welcome Card */}
          <div className="welcome-card">
            <div className="welcome-inner">
              <div className="welcome-grid">
                <div className="welcome-text-section">
                  <h1 className="welcome-title">Welcome Back, Admin!</h1>
                  <p className="welcome-subtitle">Here's what's happening today.</p>


                  <button className="cta-button" onClick={() => navigate('/sares/violation')}>
                    <svg className="button-icon" viewBox="0 0 20 20" fill="currentColor">
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

          {/* Stats Cards */}
          <div className="stats-cards-grid">
            <div className="stat-card">
              <div className="card-header">
                <h3 className="card-title">Total Violations</h3>
              </div>
              <p className="card-value">{summary.total_violations}</p>
              <p className="card-subtitle">All time recorded</p>
            </div>

            <div className="stat-card special-card">
              <div className="card-header">
                <h3 className="card-title special-card-title">Repeat Offenders</h3>
              </div>
              <p className="card-value special-card-value">{summary.repeat_offenders}</p>
              <p className="card-subtitle special-card-subtitle">Require attention</p>
            </div>

            <div className="stat-card">
              <div className="card-header">
                <h3 className="card-title">Total Students</h3>
              </div>
              <p className="card-value">{summary.total_students}</p>
              <p className="card-subtitle">In the system</p>
            </div>


            <div className="stat-card pending-card">
              <div className="card-header">
                <h3 className="card-title">Pending Actions</h3>
              </div>
              <p className="card-value pending-card-value">{summary.pending_actions}</p>
              <p className="card-subtitle">For review</p>
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
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Violations by Category</h3>
                <p className="chart-subtitle">Distribution of offense types</p>
              </div>
              <div className="chart-container pie-container">
                <div className="pie-legend">
                  {categoryStats.length === 0 ? (
                    <p className="card-subtitle">No category data yet.</p>
                  ) : (
                    categoryStats.map((item, index) => (
                      <div className="legend-item" key={item.category}>
                        <span className="legend-dot" style={{ background: `hsl(${index * 60}, 70%, 60%)` }} />
                        {item.category}: <strong>{item.percent}%</strong>
                      </div>
                    ))
                  )}
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
                {recentViolations.map((v) => (
                  <div className="violation-row" key={v.violation_id}>
                    <div className="avatar" style={{ background: '#7b9dff22', color: '#7b9dff' }}>
                      {v.student_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST'}
                    </div>

                    <div className="violation-info">
                      <div className="violation-name">{v.student_name}</div>
                      <div className="violation-type">{v.category_name}</div>
                      <div className="violation-date">{v.incident_date}</div>
                    </div>

                    <span className="badge badge--resolved">{v.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Repeat Offender Alerts */}
            <div className="bottom-card">
              <h3 className="bottom-card-title">Repeat Offender Alerts</h3>
              <p className="bottom-card-subtitle">Students with multiple violations</p>

              <div className="offender-list">
                {repeatOffenders.length === 0 ? (
                  <p className="card-subtitle">No repeat offenders yet.</p>
                ) : (
                  repeatOffenders.map((student) => (
                    <div className="offender-card offender-card--amber" key={student.student_id}>
                      <div className="avatar avatar--lg" style={{ background: '#d96eff22', color: '#d96eff' }}>
                        {student.student_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST'}
                      </div>

                      <div className="offender-info">
                        <div className="offender-name">{student.student_name}</div>
                        <div className="offender-id">
                          {student.student_number} • {student.year_level}
                        </div>
                      </div>

                      <span className="offense-tag offense-tag--amber">
                        {student.count} violations
                      </span>
                    </div>
                  ))
                )}


              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;