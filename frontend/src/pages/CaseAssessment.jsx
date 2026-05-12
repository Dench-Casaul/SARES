import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '../css/CaseAssessment.css'
import wesleyLogo from '../assets/wesley-logo.png'
import { LayoutDashboard, Users, ClipboardList, ShieldCheck, BarChart3, LogOut } from 'lucide-react'

function Sidebar({ activePage, onLogout }) {
  return (
    <div className="ca-sidebar">
      <div className="ca-logo">
        <div className="ca-logo-icon">
          <img src={wesleyLogo} alt="Olongapo Wesley School Logo" className="school-logo" />
        </div>
        <h1>SARES</h1>
      </div>

      <nav className="ca-nav">
        <Link to="/sares/dashboard" className={`ca-nav-item${activePage === '/sares/dashboard' ? ' active' : ''}`}>
          <LayoutDashboard className="ca-nav-icon" />
          <span>Dashboard</span>
        </Link>
        <Link to="/sares/students" className={`ca-nav-item${activePage === '/sares/students' ? ' active' : ''}`}>
          <Users className="ca-nav-icon" />
          <span>Students</span>
        </Link>
        <Link to="/sares/violation" className={`ca-nav-item${activePage === '/sares/violation' ? ' active' : ''}`}>
          <ClipboardList className="ca-nav-icon" />
          <span>Log Violation</span>
        </Link>
        <Link to="/sares/rules" className={`ca-nav-item${activePage === '/sares/rules' ? ' active' : ''}`}>
          <ShieldCheck className="ca-nav-icon" />
          <span>Rule Management</span>
        </Link>
        <Link to="/sares/reports" className={`ca-nav-item${activePage === '/sares/reports' ? ' active' : ''}`}>
          <BarChart3 className="ca-nav-icon" />
          <span>Reports</span>
        </Link>
      </nav>

      <div className="ca-logout-section">
        <button className="ca-logout" onClick={onLogout}>
          <LogOut className="ca-nav-icon" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

export default function CaseAssessment() {
  const location = useLocation()
  const navigate = useNavigate()
  const caseData = location.state?.caseData || null

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!caseData) {
    return (
      <div className="ca-page">
        <Sidebar activePage="/sares/violation" onLogout={handleLogout} />
        <main className="ca-main">
          <section className="ca-card">
            <h1 className="ca-title">Case Assessment</h1>
            <p className="ca-sub">No submitted case context found.</p>
            <div className="ca-actions">
              <Link to="/sares/violation" className="ca-btn-primary">Back to Log Violation</Link>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="ca-page">
      <Sidebar activePage="/sares/violation" onLogout={handleLogout} />
      <main className="ca-main">
        <header className="ca-header">
          <h1 className="ca-title">Case Assessment</h1>
          <span className="ca-badge">Pending Review</span>
        </header>
        <p className="ca-sub">Submitted violation has been assessed using your rulebase engine.</p>

        <section className="ca-grid">
          <article className="ca-card">
            <h2>Student Profile</h2>
            <div className="ca-row"><span>Student</span><strong>{caseData.student_name || '-'}</strong></div>
            <div className="ca-row"><span>Student Number</span><strong>{caseData.student_number || '-'}</strong></div>
            <div className="ca-row"><span>Year Level</span><strong>{caseData.year_level || '-'}</strong></div>
          </article>

          <article className="ca-card">
            <h2>Current Violation</h2>
            <div className="ca-row"><span>Category</span><strong>{caseData.category_name || '-'}</strong></div>
            <div className="ca-row"><span>Offense Variety</span><strong>{caseData.offense_variety || '-'}</strong></div>
            <div className="ca-row"><span>Date</span><strong>{caseData.incident_date || '-'}</strong></div>
            <div className="ca-row"><span>Severity Score</span><strong>{caseData.severity ?? '-'} / 10</strong></div>
          </article>
        </section>

        <section className="ca-card">
          <h2>Incident Description</h2>
          <p className="ca-paragraph">{caseData.incident_description || '-'}</p>
        </section>

        <section className="ca-card">
          <h2>Recommended Sanction</h2>
          <p className="ca-paragraph ca-multiline">{caseData.recommended_sanction || '-'}</p>
          <div className="ca-row"><span>Provision</span><strong>{caseData.provision || '-'}</strong></div>
          <div className="ca-row"><span>Status</span><strong>{caseData.status || 'pending'}</strong></div>
        </section>

        <div className="ca-actions">
          <Link to="/sares/violation" className="ca-btn-secondary">Log Another Violation</Link>
          <Link to="/sares/reports" className="ca-btn-primary">Go to Reports</Link>
        </div>
      </main>
    </div>
  )
}

