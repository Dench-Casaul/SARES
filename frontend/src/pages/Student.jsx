import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../css/Student.css';

/* static data */
const STUDENTS = [
  {
    id: '2024-00001',
    name: 'Juan Dela Cruz',
    initials: 'JDC',
    color: '#7b9dff',
    year: '3rd Year',
    section: 'A',
    email: 'juan.delacruz@school.edu',
    phone: '+63 912 345 6789',
    violations: 3,
    repeatOffender: false,
    history: [
      {
        id: 'v1',
        category: 'Behavioral Misconduct',
        variety: 'Disrespect to Faculty',
        description: 'Used inappropriate language when speaking to a teacher during class discussion.',
        date: '2026-04-03',
        severity: 6,
        sanction: 'Written apology and two days suspension',
        provision: 'Article II, Section 3.4 – Student Conduct',
        status: 'overridden',
        overrideJustification: 'First-time offense with immediate remorse shown.',
        finalSanction: 'Written apology and counseling session',
      },
    ],
  },
  {
    id: '2024-00002',
    name: 'Maria Santos',
    initials: 'MS',
    color: '#d96eff',
    year: '2nd Year',
    section: 'B',
    email: 'maria.santos@school.edu',
    phone: '+63 917 654 3210',
    violations: 5,
    repeatOffender: true,
    history: [
      {
        id: 'v2',
        category: 'Academic Dishonesty',
        variety: 'Plagiarism',
        description: 'Submitted a report copied from an online source without citation.',
        date: '2026-03-15',
        severity: 8,
        sanction: 'Zero mark on assignment and written warning',
        provision: 'Article III, Section 1.2 – Academic Integrity',
        status: 'resolved',
        overrideJustification: '',
        finalSanction: 'Zero mark on assignment and written warning',
      },
    ],
  },
  {
    id: '2024-00003',
    name: 'Pedro Garcia',
    initials: 'PG',
    color: '#5fe0b0',
    year: '4th Year',
    section: 'A',
    email: 'pedro.garcia@school.edu',
    phone: '+63 920 111 2222',
    violations: 1,
    repeatOffender: false,
    history: [
      {
        id: 'v3',
        category: 'Dress Code Violation',
        variety: 'Improper Uniform',
        description: 'Wore non-regulation shoes during school hours.',
        date: '2026-02-10',
        severity: 3,
        sanction: 'Verbal warning',
        provision: 'Article I, Section 2.1 – Dress Code',
        status: 'resolved',
        overrideJustification: '',
        finalSanction: 'Verbal warning',
      },
    ],
  },
  {
    id: '2024-00004',
    name: 'Ana Reyes',
    initials: 'AR',
    color: '#ffc85c',
    year: '1st Year',
    section: 'C',
    email: 'ana.reyes@school.edu',
    phone: '+63 908 333 4444',
    violations: 0,
    repeatOffender: false,
    history: [],
  },
  {
    id: '2024-00005',
    name: 'Jose Ramos',
    initials: 'JR',
    color: '#ff7864',
    year: '3rd Year',
    section: 'B',
    email: 'jose.ramos@school.edu',
    phone: '+63 915 777 8888',
    violations: 7,
    repeatOffender: true,
    history: [
      {
        id: 'v4',
        category: 'Technology Misuse',
        variety: 'Unauthorized Device Use',
        description: 'Used mobile phone during examinations.',
        date: '2026-04-01',
        severity: 7,
        sanction: 'Confiscation of device and parent conference',
        provision: 'Article IV, Section 5.1 – Technology Policy',
        status: 'pending',
        overrideJustification: '',
        finalSanction: '',
      },
    ],
  },
];

const YEARS = ['All Year', '1st Year', '2nd Year', '3rd Year', '4th Year'];

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

/* sidebar */
function Sidebar({ activePage }) {
  return (
    <div className="s-sidebar">
      <div className="s-sidebar-header">
        <div className="s-logo">
          <div className="s-logo-icon"><span>S</span></div>
          <h1 className="s-logo-text">SARES</h1>
        </div>
      </div>

      <nav className="s-nav">
        <ul className="s-nav-list">
         <li>
  <Link to="/app" className={`s-nav-item${activePage === '/app' ? ' s-nav-item--active' : ''}`}>
    <svg className="s-nav-icon" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4a1 1 0 001-1v-3h2v3a1 1 0 001 1h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
    Dashboard
  </Link>
</li>

<li>
  <Link to="/app/students" className={`s-nav-item${activePage === '/app/students' ? ' s-nav-item--active' : ''}`}>
    <svg className="s-nav-icon" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
    Students
  </Link>
</li>

<li>
  <Link to="/app/violations/new" className={`s-nav-item${activePage === '/app/violations/new' ? ' s-nav-item--active' : ''}`}>
    <svg className="s-nav-icon" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
    Log Violation
  </Link>
</li>

<li>
  <Link to="/app/rules" className={`s-nav-item${activePage === '/app/rules' ? ' s-nav-item--active' : ''}`}>
    <svg className="s-nav-icon" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
    </svg>
    Rule Management
  </Link>
</li>

<li>
  <Link to="/app/reports" className={`s-nav-item${activePage === '/app/reports' ? ' s-nav-item--active' : ''}`}>
    <svg className="s-nav-icon" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
    </svg>
    Reports
  </Link>
</li>
        </ul>
      </nav>

      <div className="s-sidebar-footer">
        <button className="s-logout-btn">
          <svg className="s-nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
}

/* Add Student Modal */
function AddStudentModal({ onClose, onAdd, nextId }) {
  const [form, setForm] = useState({
    id: nextId,
    name: '',
    year: '',
    section: '',
    email: '',
    phone: '',
  });

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = () => {
    if (!form.name || !form.year || !form.section || !form.email) return;
    onAdd(form);
  };

  return (
    <div className="s-modal-backdrop" onClick={onClose}>
      <div className="s-modal" onClick={(e) => e.stopPropagation()}>
        <div className="s-modal-header">
          <div>
            <h2 className="s-modal-title">Add New Student</h2>
            <p className="s-modal-sub">Enter the student's information to create a new profile</p>
          </div>
          <button className="s-modal-close" onClick={onClose}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="s-modal-body">
          <div className="s-field">
            <label className="s-label">Student ID</label>
            <input className="s-input" name="id" value={form.id} readOnly />
          </div>

          <div className="s-field">
            <label className="s-label">Full Name</label>
            <input className="s-input" name="name" value={form.name} onChange={handle} placeholder="Juan Dela Cruz" />
          </div>

          <div className="s-field-row">
            <div className="s-field">
              <label className="s-label">Year Level</label>
              <select className="s-input s-select" name="year" value={form.year} onChange={handle}>
                <option value="">Select</option>
                {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="s-field">
              <label className="s-label">Section</label>
              <input className="s-input" name="section" value={form.section} onChange={handle} placeholder="A" />
            </div>
          </div>

          <div className="s-field">
            <label className="s-label">Email</label>
            <input className="s-input" name="email" value={form.email} onChange={handle} placeholder="student@school.edu" />
          </div>

          <div className="s-field">
            <label className="s-label">Phone Number</label>
            <input className="s-input" name="phone" value={form.phone} onChange={handle} placeholder="+63 912 345 6789" />
          </div>
        </div>

        <div className="s-modal-footer">
          <button className="s-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="s-btn-submit" onClick={submit}>Add Student</button>
        </div>
      </div>
    </div>
  );
}

/* Student List View */
function StudentList({ students, onSelect, onAddStudent }) {
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('All Year');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(false);

  const filtered = students.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.includes(search);
    const matchYear = yearFilter === 'All Year' || s.year === yearFilter;
    return matchSearch && matchYear;
  });

  const nextId = `2024-${String(students.length + 1).padStart(5, '0')}`;

  const handleAdd = (form) => {
    onAddStudent(form);
    setShowModal(false);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  return (
    <div className="s-page">
      <Sidebar activePage={location.pathname} />

      <div className="s-main">
        <div className="s-main-header">
          <div>
            <h1 className="s-page-title">Student Profile</h1>
            <p className="s-page-sub">Manage student profiles and disciplinary records</p>
          </div>
          <button className="s-add-btn" onClick={() => setShowModal(true)}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Student
          </button>
        </div>

        <div className="s-directory-card">
          <div className="s-directory-header">
            <h2 className="s-directory-title">Student Directory</h2>
            <p className="s-directory-sub">Search and filter student records</p>
          </div>

          <div className="s-controls">
            <div className="s-search-wrap">
              <svg className="s-search-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                className="s-search"
                placeholder="Search by name or student ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="s-filter-wrap">
              <select
                className="s-filter"
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
              >
                {YEARS.map(y => <option key={y}>{y}</option>)}
              </select>
              <svg className="s-filter-arrow" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          <div className="s-list">
            {filtered.map(student => (
              <div key={student.id} className="s-row" onClick={() => onSelect(student)}>
                <div className="s-avatar" style={{ background: student.color + '22', color: student.color }}>
                  {student.initials}
                </div>
                <div className="s-row-info">
                  <div className="s-row-name-wrap">
                    <span className="s-row-name">{student.name}</span>
                    {student.repeatOffender && (
                      <span className="s-repeat-badge">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="10" height="10">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Repeat Offender
                      </span>
                    )}
                  </div>
                  <div className="s-row-meta">{student.id} • {student.year} – {student.section}</div>
                  <div className="s-row-email">{student.email}</div>
                </div>
                <div className="s-row-violations">
                  <span className="s-violations-label">Violations</span>
                  <span className={`s-violations-count${student.violations === 0 ? ' zero' : ''}`}>
                    {student.violations}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <AddStudentModal
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
          nextId={nextId}
        />
      )}

      {toast && (
        <div className="s-toast">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Student added successfully!
        </div>
      )}
    </div>
  );
}

/* Student Profile */
function StudentProfile({ student, onBack, onSelectViolation, location }) {
  return (
    <div className="s-page">
      <Sidebar activePage={location.pathname} />

      <div className="s-main">
        <div className="s-back-bar">
          <button className="s-back-btn" onClick={onBack}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Students
          </button>
        </div>

        <div className="s-profile-hero">
          <div className="s-profile-left">
            <div className="s-profile-avatar" style={{ background: student.color + '33', color: student.color }}>
              {student.initials}
            </div>
            <div>
              <h1 className="s-profile-name">{student.name}</h1>
              <p className="s-profile-id">{student.id}</p>
            </div>
          </div>
          <button className="s-log-btn">
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            Log Violation
          </button>
        </div>

        <div className="s-profile-grid">
          {/* Student Info */}
          <div className="s-info-card">
            <h2 className="s-card-title">Student Information</h2>

            <div className="s-info-field">
              <span className="s-info-label">Year Level</span>
              <span className="s-info-value">{student.year}</span>
            </div>
            <div className="s-divider" />

            <div className="s-info-field">
              <span className="s-info-label">Section</span>
              <span className="s-info-value">{student.section}</span>
            </div>
            <div className="s-divider" />

            <div className="s-info-field">
              <div className="s-info-label-icon">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                Email
              </div>
              <span className="s-info-value">{student.email}</span>
            </div>
            <div className="s-divider" />

            <div className="s-info-field">
              <div className="s-info-label-icon">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                Phone
              </div>
              <span className="s-info-value">{student.phone}</span>
            </div>
            <div className="s-divider" />

            <div className="s-info-field">
              <span className="s-info-label">Total Violations</span>
              <span className="s-violations-big">{student.violations}</span>
            </div>
          </div>

          {/* Disciplinary History */}
          <div className="s-history-card">
            <h2 className="s-card-title">Disciplinary History</h2>
            <p className="s-card-sub">Complete record of violations and sanctions</p>

            {student.history.length === 0 ? (
              <div className="s-empty">No violations recorded.</div>
            ) : (
              <div className="s-history-list">
                {student.history.map(v => (
                  <div
                    key={v.id}
                    className="s-history-item"
                    onClick={() => onSelectViolation(v)}
                  >
                    <div className="s-history-item-header">
                      <span className="s-history-category">{v.category}</span>
                      <span className={`s-status-badge s-status-badge--${v.status}`}>{v.status}</span>
                    </div>
                    <p className="s-history-variety">{v.variety}</p>
                    <p className="s-history-desc">{v.description}</p>
                    <div className="s-history-meta">
                      <span>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12" style={{ marginRight: 4, verticalAlign: 'middle' }}>
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        {v.date}
                      </span>
                      <span>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12" style={{ marginRight: 4, verticalAlign: 'middle' }}>
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Severity: {v.severity}/10
                      </span>
                    </div>
                    <div className="s-history-sanction-label">Final Sanction:</div>
                    <div className="s-history-sanction">{v.finalSanction || v.sanction}</div>
                    {v.status === 'overridden' && (
                      <div className="s-override-box">
                        <span className="s-override-label">Override Justification:</span>
                        <span className="s-override-text">{v.overrideJustification}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Violation Details*/
function ViolationDetails({ violation, student, onBack, location }) {
  return (
    <div className="s-page">
      <Sidebar activePage={location.pathname} />

      <div className="s-main s-main--scrollable">
        <div className="s-back-bar">
          <button className="s-back-btn" onClick={onBack}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back
          </button>
        </div>

        <div className="s-vd-hero">
          <div>
            <h1 className="s-vd-title">Violation Details</h1>
            <p className="s-vd-sub">Review violation and sanction recommendation</p>
          </div>
          <span className={`s-status-badge s-status-badge--${violation.status}`}>{violation.status}</span>
        </div>

        {/* Violation Information */}
        <div className="s-vd-card">
          <h2 className="s-vd-card-title">Violation Information</h2>

          <div className="s-vd-row">
            <div className="s-vd-field">
              <div className="s-vd-field-label">
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                Student
              </div>
              <div className="s-vd-field-value">{student.name}</div>
            </div>
            <div className="s-vd-field">
              <div className="s-vd-field-label">
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                Date of Incident
              </div>
              <div className="s-vd-field-value">{violation.date}</div>
            </div>
          </div>
          <div className="s-divider" />

          <div className="s-vd-field s-vd-field--full">
            <div className="s-vd-field-label">Offense Category</div>
            <div className="s-vd-field-value s-vd-field-value--lg">{violation.category}</div>
          </div>
          <div className="s-divider" />

          <div className="s-vd-field s-vd-field--full">
            <div className="s-vd-field-label">Offense Variety</div>
            <div className="s-vd-field-value s-vd-field-value--lg">{violation.variety}</div>
          </div>
          <div className="s-divider" />

          <div className="s-vd-field s-vd-field--full">
            <div className="s-vd-field-label">Description</div>
            <div className="s-vd-desc-box">{violation.description}</div>
          </div>
        </div>

        {/* Sanction Recommendation */}
        <div className="s-vd-card s-vd-card--sanction">
          <div className="s-vd-sanction-header">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style={{ color: '#ffa830' }}>
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h2 className="s-vd-card-title">Sanction Recommendation</h2>
              <p className="s-vd-card-sub">AI-generated recommendation based on school handbook</p>
            </div>
          </div>

          <div className="s-divider" />

          <div className="s-vd-field s-vd-field--full">
            <div className="s-vd-field-label">Severity Score</div>
            <div className="s-severity-row">
              <span className="s-severity-score">{violation.severity}/10</span>
              <span className={`s-severity-badge ${violation.severity >= 7 ? 'high' : violation.severity >= 4 ? 'medium' : 'low'}`}>
                {violation.severity >= 7 ? 'High Severity' : violation.severity >= 4 ? 'Medium Severity' : 'Low Severity'}
              </span>
            </div>
          </div>
          <div className="s-divider" />

          <div className="s-vd-field s-vd-field--full">
            <div className="s-vd-field-label">Recommended Sanction</div>
            <div className="s-vd-sanction-box">{violation.sanction}</div>
          </div>
          <div className="s-divider" />

          <div className="s-vd-field s-vd-field--full">
            <div className="s-vd-field-label">Handbook Provision</div>
            <div className="s-vd-provision-box">
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{ flexShrink: 0, color: 'rgba(180,190,240,0.5)' }}>
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              {violation.provision}
            </div>
          </div>
          <div className="s-divider" />

          <div className="s-vd-field s-vd-field--full">
            <div className="s-vd-field-label">Override Justification</div>
            <textarea
              className="s-vd-override-input"
              defaultValue={violation.overrideJustification}
              placeholder="Enter justification for overriding the recommended sanction..."
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Students */
export default function Students() {
  const location = useLocation();
  const [view, setView] = useState('list'); // 'list' | 'profile' | 'violation'
  const [students, setStudents] = useState(STUDENTS);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedViolation, setSelectedViolation] = useState(null);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setView('profile');
  };

  const handleSelectViolation = (violation) => {
    setSelectedViolation(violation);
    setView('violation');
  };

  const handleAddStudent = (form) => {
    const initials = form.name
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
    const colors = ['#7b9dff', '#d96eff', '#5fe0b0', '#ffc85c', '#ff7864'];
    const newStudent = {
      id: form.id,
      name: form.name,
      initials,
      color: colors[students.length % colors.length],
      year: form.year,
      section: form.section,
      email: form.email,
      phone: form.phone,
      violations: 0,
      repeatOffender: false,
      history: [],
    };
    setStudents([...students, newStudent]);
  };

  if (view === 'violation' && selectedViolation && selectedStudent) {
    return (
      <ViolationDetails
        violation={selectedViolation}
        student={selectedStudent}
        onBack={() => setView('profile')}
        location={location}
      />
    );
  }

  if (view === 'profile' && selectedStudent) {
    return (
      <StudentProfile
        student={selectedStudent}
        onBack={() => setView('list')}
        onSelectViolation={handleSelectViolation}
        location={location}
      />
    );
  }

  return (
    <StudentList
      students={students}
      onSelect={handleSelectStudent}
      onAddStudent={handleAddStudent}
    />
  );
}