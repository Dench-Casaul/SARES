import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import '../css/Dashboard.css'
import heroImg from '../assets/hero.png'
import wesleyLogo from '../assets/wesley-logo.png'
import { LayoutDashboard, Users, ClipboardList, ShieldCheck, BarChart3, LogOut, Menu, X } from 'lucide-react'

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    total_students: 0,
    total_violations: 0,
    repeat_offenders: 0,
  });

  const [recentViolations, setRecentViolations] = useState([]);
  const [repeatOffenders, setRepeatOffenders] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [violationTrends, setViolationTrends] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [studentsSnapshot, violationsSnapshot] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'violations')),
      ]);
      const studentsData = studentsSnapshot.docs.map((studentDoc) => studentDoc.data());
      const violationsData = violationsSnapshot.docs.map((violationDoc) => ({
        violation_id: violationDoc.id,
        ...violationDoc.data(),
      }));

      const repeatOffendersCount = new Set(
        violationsData
          .map((violation) => String(violation.student_id || ''))
          .filter(Boolean)
          .filter((studentId, _, all) => all.filter((id) => id === studentId).length >= 2)
      ).size;

      setSummary({
        total_students: studentsData.length,
        total_violations: violationsData.length,
        repeat_offenders: repeatOffendersCount,
      });
      setRecentViolations(
        [...violationsData]
          .sort((a, b) => {
            const timeA = a.created_at?.seconds || 0;
            const timeB = b.created_at?.seconds || 0;
            return timeB - timeA;
          })
          .slice(0, 5)
      );
      setRepeatOffenders(getRepeatOffenders(violationsData));
      setCategoryStats(getCategoryStats(violationsData));
      setViolationTrends(getViolationTrends(violationsData));
      setMonthlyTrends(getMonthlyTrends(violationsData));
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

  const getMonthlyTrends = (violations) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const stats = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      const key = `${months[m]} ${y}`;
      stats[key] = 0;
    }

    violations.forEach(v => {
      if (!v.incident_date) return;
      const d = new Date(v.incident_date);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      if (stats.hasOwnProperty(key)) {
        stats[key]++;
      }
    });

    return Object.entries(stats).map(([month, count]) => ({ month, count }));
  };

  const handleLogout = () => {
    // Clear any stored user data (e.g., tokens, user info)
    localStorage.removeItem('user');
    // Navigate to the login page
    navigate('/login');
  };


  const getCategoryStats = (violations) => {
    const labels = {
      light: 'Light',
      less_serious: 'Less Serious',
      serious: 'Serious',
      very_serious: 'Very Serious'
    };
    
    const grouped = { light: 0, less_serious: 0, serious: 0, very_serious: 0 };

    violations.forEach((v) => {
      const sub = v.subcategory_id;
      if (grouped.hasOwnProperty(sub)) {
        grouped[sub]++;
      }
    });

    const total = violations.length || 1;

    return Object.entries(grouped).map(([id, count]) => ({
      category: labels[id],
      count,
      percent: Math.round((count / total) * 100),
    }));
  };

  const getViolationTrends = (violations) => {
    const grouped = {};
    violations.forEach((v) => {
      const variety = v.offense_variety || v.category_name || 'Unspecified';
      grouped[variety] = (grouped[variety] || 0) + 1;
    });
    const total = violations.length || 1;
    return Object.entries(grouped)
      .map(([variety, count]) => ({
        variety,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'ST';
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'ST';
  };





  return (
    <div className="dashboard-container">

      {/* menu */}
      <div className="mobile-menu-bar">
        <div className="logo-container">
          <div className="logo-icon-container">
            <span className="logo-letter">S</span>
          </div>
          <h1 className="admin-title">SARES</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mobile-menu-btn">
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

        <nav className="navigation">
          <ul className="nav-list">
            <li>
              <Link to="/sares/dashboard" onClick={() => setSidebarOpen(false)} className={`nav-item${location.pathname === '/sares/dashboard' ? '-active' : ''}`}>
                <LayoutDashboard className="nav-icon" />
                <span className="nav-text">Dashboard</span>
              </Link>
            </li>
            <li>
              <Link to="/sares/students" onClick={() => setSidebarOpen(false)} className={`nav-item${location.pathname === '/sares/students' ? '-active' : ''}`}>
                <Users className="nav-icon" />
                <span className="nav-text">Students</span>
              </Link>
            </li>
            <li>
              <Link to="/sares/rules" onClick={() => setSidebarOpen(false)} className={`nav-item${location.pathname === '/sares/rules' ? '-active' : ''}`}>
                <ShieldCheck className="nav-icon" />
                <span className="nav-text">Rule Management</span>
              </Link>
            </li>
            <li>
              <Link to="/sares/reports" onClick={() => setSidebarOpen(false)} className={`nav-item${location.pathname === '/sares/reports' ? '-active' : ''}`}>
                <BarChart3 className="nav-icon" />
                <span className="nav-text">Reports</span>
              </Link>
            </li>
            <li>
              <Link to="/sares/violation" onClick={() => setSidebarOpen(false)} className={`nav-item${location.pathname === '/sares/violation' ? '-active' : ''}`}>
                <ClipboardList className="nav-icon" />
                <span className="nav-text">Log Violation</span>
              </Link>
            </li>
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
            <div className="stat-card">
              <div className="card-header">
                <h3 className="card-title">Top Violation</h3>
              </div>
              <p className="card-value" style={{ fontSize: '18px', marginTop: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {violationTrends[0]?.variety || 'None'}
              </p>
              <p className="card-subtitle">{violationTrends[0]?.count || 0} occurrences</p>
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
                <div className="trend-bar-container">
                  {monthlyTrends.map((data, i) => {
                    const maxCount = Math.max(...monthlyTrends.map(t => t.count), 1);
                    return (
                      <div key={data.month} className="trend-bar-wrapper">
                        <div 
                          className="trend-bar" 
                          style={{ height: `${Math.max((data.count / maxCount) * 100, 5)}%` }}
                        >
                          <span className="trend-tooltip">{data.count} violations</span>
                        </div>
                        <span className="trend-month">{data.month.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                </div>
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

            {/* Violation Trend Ranking (Moved inside) */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Trend Ranking</h3>
                <p className="chart-subtitle">Top violations by frequency</p>
              </div>
              <div style={{ padding: '4px 0' }}>
                {violationTrends.length === 0 ? (
                  <p className="card-subtitle">No data yet.</p>
                ) : (
                  violationTrends.slice(0, 5).map((item, index) => (
                    <div key={item.variety} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '18px', height: '18px', borderRadius: '50%', fontSize: '10px', fontWeight: 800,
                            background: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#c97c2b' : '#e2e8f0',
                            color: index < 3 ? '#fff' : '#64748b',
                          }}>{index + 1}</span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>{item.variety}</span>
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1198e8' }}>{item.percent}%</span>
                      </div>
                      <div style={{ height: '4px', background: '#e8f0fb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${item.percent}%`,
                          borderRadius: '4px',
                          background: index === 0 ? '#f59e0b' : index === 1 ? '#64748b' : index === 2 ? '#c97c2b' : '#1198e8',
                        }} />
                      </div>
                    </div>
                  ))
                )}
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
                      {getInitials(v.student_name)}
                    </div>

                    <div className="violation-info">
                      <div className="violation-name">{v.student_name}</div>
                      <div className="violation-type">{v.offense_variety || v.category_name}</div>
                      <div className="violation-date">{v.incident_date}</div>
                    </div>


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
                        {getInitials(student.student_name)}
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