import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import '../css/Student.css'
import wesleyLogo from '../assets/wesley-logo.png'
import { LayoutDashboard, Users, ClipboardList, ShieldCheck, BarChart3, LogOut, Menu, X } from 'lucide-react'

const YEARS = ["All Year", "Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade"]
const YEAR_LEVELS = ["Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade"]
/* sidebar */
function Sidebar({ activePage, isOpen, toggleSidebar }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className={`s-sidebar${isOpen ? ' s-sidebar--open' : ''}`}>
      <div className="s-sidebar-header">
        <div className="s-logo">
          <div className="s-logo-icon">
            <img
              src={wesleyLogo}
              alt="Olongapo Wesley School Logo"
              className="school-logo"
            />
          </div>
          <h1 className="s-logo-text">SARES</h1>
        </div>
      </div>

      <nav className="s-nav">
        <ul className="s-nav-list">
          <li>
            <Link
              to="/sares/dashboard"
              onClick={toggleSidebar}
              className={`s-nav-item${activePage === "/sares/dashboard" ? " s-nav-item--active" : ""}`}
            >
              <LayoutDashboard className="s-nav-icon" />
              <span>Dashboard</span>
            </Link>
          </li>

          <li>
            <Link
              to="/sares/students"
              onClick={toggleSidebar}
              className={`s-nav-item${activePage === "/sares/students" ? " s-nav-item--active" : ""}`}
            >
              <Users className="s-nav-icon" />
              <span>Students</span>
            </Link>
          </li>

          <li>
            <Link
              to="/sares/violation"
              onClick={toggleSidebar}
              className={`s-nav-item${activePage === "/sares/violation" ? " s-nav-item--active" : ""}`}
            >
              <ClipboardList className="s-nav-icon" />
              <span>Log Violation</span>
            </Link>
          </li>

          <li>
            <Link
              to="/sares/rules"
              onClick={toggleSidebar}
              className={`s-nav-item${activePage === "/sares/rules" ? " s-nav-item--active" : ""}`}
            >
              <ShieldCheck className="s-nav-icon" />
              <span>Rule Management</span>
            </Link>
          </li>

          <li>
            <Link
              to="/sares/reports"
              onClick={toggleSidebar}
              className={`s-nav-item${activePage === "/sares/reports" ? " s-nav-item--active" : ""}`}
            >
              <BarChart3 className="s-nav-icon" />
              <span>Reports</span>
            </Link>
          </li>
        </ul>
      </nav>

      <div className="s-sidebar-footer">
        <button className="s-logout-btn" onClick={handleLogout}>
          <LogOut className="s-nav-icon" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

/* Add Student Modal */
function AddStudentModal({ onClose, onAdd, initialForm, submitLabel = 'Add Student', title = 'Add New Student', subtitle = "Enter the student's information to create a new profile" }) {
  const [form, setForm] = useState({
    id: initialForm?.id || '',
    name: initialForm?.name || '',
    year: initialForm?.year || '',
    section: initialForm?.section || '',
    email: initialForm?.email || '',
    phone: initialForm?.phone || '',
  });

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    if (!form.name || !form.year || !form.section || !form.email) return;
    await onAdd(form);
  };

  return (
    <div className="s-modal-backdrop" onClick={onClose}>
      <div className="s-modal" onClick={(e) => e.stopPropagation()}>
        <div className="s-modal-header">
          <div>
            <h2 className="s-modal-title">{title}</h2>
            <p className="s-modal-sub">{subtitle}</p>
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
            <input
              className="s-input"
              name="id"
              value={form.id}
              onChange={handle}
              placeholder="Enter student's LRN / official student ID"
            />
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
              <input className="s-input" name="section" value={form.section} onChange={handle} placeholder="" />
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
          <button className="s-btn-submit" onClick={submit}>{submitLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* Student List View */
function StudentList({ students, onSelect, onAddStudent, onEditStudent, onDeleteStudent, location, sidebarOpen, setSidebarOpen }) {
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('All Year');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);
  const [toast, setToast] = useState(false);

  const filtered = students.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.includes(search);
    const matchYear = yearFilter === 'All Year' || s.year === yearFilter;
    return matchSearch && matchYear;
  });

  const handleAdd = async (form) => {
    await onAddStudent(form);
    setShowModal(false);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  const openEdit = (student) => {
    setEditingStudent(student);
    setShowEditModal(true);
    setOpenActionId(null);
  };

  const handleEdit = async (form) => {
    if (!editingStudent) return;
    await onEditStudent(editingStudent.docId, form);
    setShowEditModal(false);
    setEditingStudent(null);
  };

  const handleDelete = async (student) => {
    const confirmed = window.confirm(`Delete ${student.name}? This cannot be undone.`);
    if (!confirmed) return;
    await onDeleteStudent(student.docId);
    setOpenActionId(null);
  };

  return (
    <div className="s-page">
      <div className="s-mobile-menu-bar">
        <div className="s-logo">
          <div className="s-logo-icon">
            <img src={wesleyLogo} alt="Logo" className="school-logo" />
          </div>
          <h1 className="s-logo-text">SARES</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="s-mobile-menu-btn">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      <Sidebar activePage={location?.pathname || "/sares/students"} isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(false)} />

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
            <h2 className="s-directory-title">Student List</h2>
            <p className="s-directory-sub">Search and filter student records</p>
          </div>

          <div className="s-controls">
            <div className="s-search-wrap">
              <svg className="s-search-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                id="student-search"
                name="student-search"
                className="s-search"
                placeholder="Search by name or student ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="s-filter-wrap">
              <select
                id="year-filter"
                name="year-filter"
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

          <div className="s-table-wrap">
            <table className="s-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Student ID</th>
                  <th>Year Level & Section</th>
                  <th>Total Violations</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((student) => (
                  <tr key={student.docId || student.id} onClick={() => onSelect(student)}>
                    <td className="s-student-name">{student.name}</td>
                    <td>{student.id}</td>
                    <td>{student.year} - {student.section}</td>
                    <td>{student.violationCount}</td>
                    <td>

                    </td>
                    <td>
                      <button
                        type="button"
                        className="s-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenActionId((current) => (current === student.docId ? null : student.docId));
                        }}
                      >
                        ⋮
                      </button>
                      {openActionId === student.docId && (
                        <div
                          style={{
                            position: 'absolute',
                            right: '12px',
                            zIndex: 20,
                            background: '#fff',
                            border: '1px solid #dce7ff',
                            borderRadius: '8px',
                            boxShadow: '0 8px 24px rgba(12,39,95,0.12)',
                            overflow: 'hidden',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 12px',
                              background: '#ffffff',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#0f2553',
                              fontSize: '14px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                            onClick={() => openEdit(student)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 12px',
                              background: '#ffffff',
                              border: 'none',
                              color: '#c92020',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                            onClick={() => handleDelete(student)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="s-table-footer">
              <p>Showing 1 to {filtered.length} of {students.length} students</p>

              <div className="s-pagination">
                <button type="button">‹</button>
                <button type="button" className="active">1</button>
                <button type="button">›</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <AddStudentModal
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
        />
      )}

      {showEditModal && editingStudent && (
        <AddStudentModal
          onClose={() => {
            setShowEditModal(false);
            setEditingStudent(null);
          }}
          onAdd={handleEdit}
          initialForm={{
            id: editingStudent.id,
            name: editingStudent.name,
            year: editingStudent.year,
            section: editingStudent.section,
            email: editingStudent.email,
            phone: editingStudent.phone,
          }}
          submitLabel="Save Changes"
          title="Edit Student"
          subtitle="Update the student's profile information"
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
function StudentProfile({ student, onBack, onSelectViolation, onLogViolation, location, sidebarOpen, setSidebarOpen }) {
  return (
    <div className="s-page">
      <div className="s-mobile-menu-bar">
        <div className="s-logo">
          <div className="s-logo-icon">
            <img src={wesleyLogo} alt="Logo" className="school-logo" />
          </div>
          <h1 className="s-logo-text">SARES</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="s-mobile-menu-btn">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      <Sidebar activePage={location.pathname} isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(false)} />

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
          <button className="s-log-btn" onClick={onLogViolation}>
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
              <span className="s-violations-big">{student.violationCount}</span>
            </div>
          </div>

          {/* Disciplinary History */}
          <div className="s-history-card">
            <h2 className="s-card-title">Disciplinary History</h2>
            <p className="s-card-sub">Complete record of violations and sanctions</p>

            {student.violations.length === 0 ? (
              <div className="s-empty">No violations recorded.</div>
            ) : (
              <div className="s-history-list">
                {student.violations.map(v => (
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
function ViolationDetails({ violation, student, onBack, location, sidebarOpen, setSidebarOpen }) {
  return (
    <div className="s-page">
      <div className="s-mobile-menu-bar">
        <div className="s-logo">
          <div className="s-logo-icon">
            <img src={wesleyLogo} alt="Logo" className="school-logo" />
          </div>
          <h1 className="s-logo-text">SARES</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="s-mobile-menu-btn">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      <Sidebar activePage={location.pathname} isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(false)} />

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
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [view, setView] = useState('list');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedViolation, setSelectedViolation] = useState(null);

  const formatStudent = (student) => {
    const name = student.full_name || '';

    const initials = name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();

    const colors = ['#7b9dff', '#d96eff', '#5fe0b0', '#ffc85c', '#ff7864'];

    const violationList = Array.isArray(student.violations)
      ? student.violations
      : Array.isArray(student.history)
        ? student.history
        : [];

    const violationCount =
      typeof student.violation_count === 'number'
        ? student.violation_count
        : typeof student.violations === 'number'
          ? student.violations
          : violationList.length;

    return {
      docId: student.student_id || '',
      id: student.student_number,
      name: student.full_name,
      initials: initials || 'S',
      color: colors[(student.student_id || 0) % colors.length],
      year: student.year_level,
      section: student.section,
      email: student.email || '',
      phone: student.phone_number || '',
      violationCount,
      repeatOffender: student.repeat_offender || false,
      violations: violationList,
    };
  };

  const fetchStudents = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'students'));
      const data = snapshot.docs.map((studentDoc) => ({
        ...studentDoc.data(),
        student_id: studentDoc.id,
      }));
      setStudents(data.map(formatStudent));
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setView('profile');
  };

  const handleSelectViolation = (violation) => {
    setSelectedViolation(violation);
    setView('violation');
  };

  const handleLogViolationForStudent = () => {
    if (!selectedStudent) return;
    navigate('/sares/violation', {
      state: {
        prefillStudentId: selectedStudent.docId,
      },
    });
  };

  const handleAddStudent = async (form) => {
    const studentData = {
      student_id: '',
      student_number: form.id,
      full_name: form.name,
      year_level: form.year,
      section: form.section,
      email: form.email,
      phone_number: form.phone,
      violation_count: 0,
      violations: [],
      repeat_offender: false,
    };

    try {
      const newStudentRef = await addDoc(collection(db, 'students'), studentData);
      const createdStudent = {
        ...studentData,
        student_id: newStudentRef.id,
      };

      setStudents((prev) => [formatStudent(createdStudent), ...prev]);
    } catch (error) {
      console.error('Failed to add student:', error);
      alert('Failed to add student. Check Firebase permissions and connection.');
    }
  };

  const handleEditStudent = async (docId, form) => {
    if (!docId) return;
    const payload = {
      student_number: form.id,
      full_name: form.name,
      year_level: form.year,
      section: form.section,
      email: form.email,
      phone_number: form.phone,
    };
    await updateDoc(doc(db, 'students', docId), payload);
    setStudents((prev) =>
      prev.map((student) =>
        student.docId === docId
          ? {
              ...student,
              id: payload.student_number,
              name: payload.full_name,
              year: payload.year_level,
              section: payload.section,
              email: payload.email,
              phone: payload.phone_number,
            }
          : student
      )
    );
  };

  const handleDeleteStudent = async (docId) => {
    if (!docId) return;
    await deleteDoc(doc(db, 'students', docId));
    setStudents((prev) => prev.filter((student) => student.docId !== docId));
  };

  if (view === 'violation' && selectedViolation && selectedStudent) {
    return (
      <ViolationDetails
        violation={selectedViolation}
        student={selectedStudent}
        onBack={() => setView('profile')}
        location={location}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
    );
  }

  if (view === 'profile' && selectedStudent) {
    return (
      <StudentProfile
        student={selectedStudent}
        onBack={() => setView('list')}
        onSelectViolation={handleSelectViolation}
        onLogViolation={handleLogViolationForStudent}
        location={location}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
    );
  }

  return (
    <StudentList
      students={students}
      onSelect={handleSelectStudent}
      onAddStudent={handleAddStudent}
      onEditStudent={handleEditStudent}
      onDeleteStudent={handleDeleteStudent}
      location={location}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
    />
  );
}
