import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../css/Student.css';

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
              Violation
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

export default function Violation() {
  const location = useLocation();

  const [showToast, setShowToast] = useState(false);

  const [form, setForm] = useState({
    student: '',
    date: '2026-04-26',
    category: '',
    variety: '',
    description: '',
  });

  const students = [
    'Juan Dela Cruz',
    'Maria Santos',
    'Pedro Garcia',
    'Ana Reyes',
    'Jose Ramos',
  ];

  const offenseData = {
    'Behavioral Misconduct': [
      'Disrespect to Faculty',
      'Bullying',
      'Fighting',
      'Disruptive Behavior',
    ],
    'Academic Dishonesty': [
      'Cheating',
      'Plagiarism',
      'Copying Assignment',
    ],
    'Dress Code Violation': [
      'Improper Uniform',
      'No ID',
      'Improper Shoes',
    ],
    'Technology Misuse': [
      'Unauthorized Device Use',
      'Phone Use During Class',
      'Misuse of School Computer',
    ],
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'category') {
      setForm({
        ...form,
        category: value,
        variety: '',
      });
      return;
    }

    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.student || !form.category || !form.variety || !form.description) {
      alert('Please fill in all required fields.');
      return;
    }

    console.log('Violation submitted:', form);

    setShowToast(true);

    setForm({
      student: '',
      date: '2026-04-26',
      category: '',
      variety: '',
      description: '',
    });

    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  return (
    <div className="s-page">
      <Sidebar activePage={location.pathname} />

      <div className="s-main">
        <div className="s-back-bar">
          <Link to="/app" className="s-back-btn">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="s-main-header">
          <div>
            <h1 className="s-page-title">Log New Violation</h1>
            <p className="s-page-sub">Record a student disciplinary incident</p>
          </div>
        </div>

        <form className="s-directory-card lv-form-card" onSubmit={handleSubmit}>
          <div className="s-directory-header">
            <h2 className="s-directory-title">Violation Details</h2>
            <p className="s-directory-sub">Fill in all required information</p>
          </div>

          <div className="s-field-row">
            <div className="s-field">
              <label className="s-label">Student *</label>
              <select
                className="s-input s-select"
                name="student"
                value={form.student}
                onChange={handleChange}
              >
                <option value="">Select a student</option>
                {students.map((student) => (
                  <option key={student} value={student}>
                    {student}
                  </option>
                ))}
              </select>
            </div>

            <div className="s-field">
              <label className="s-label">Date of Incident *</label>
              <input
                className="s-input"
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="s-field-row">
            <div className="s-field">
              <label className="s-label">Offense Category *</label>
              <select
                className="s-input s-select"
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                <option value="">Select category</option>
                {Object.keys(offenseData).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="s-field">
              <label className="s-label">Offense Variety *</label>
              <select
                className="s-input s-select"
                name="variety"
                value={form.variety}
                onChange={handleChange}
                disabled={!form.category}
              >
                <option value="">
                  {form.category ? 'Select variety' : 'Select category first'}
                </option>

                {form.category &&
                  offenseData[form.category].map((variety) => (
                    <option key={variety} value={variety}>
                      {variety}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="s-field">
            <label className="s-label">Incident Description *</label>
            <textarea
              className="s-input lv-textarea"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Provide detailed description of the incident..."
              rows="3"
            />
            <p className="s-page-sub">
              Include relevant details such as witnesses, location, and circumstances
            </p>
          </div>

          <div className="lv-actions">
            <Link to="/app" className="s-btn-cancel lv-link-btn">
              Cancel
            </Link>

            <button type="submit" className="s-btn-submit">
              Submit Violation
            </button>
          </div>
        </form>
      </div>

      {showToast && (
        <div className="s-toast">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Violation logged successfully!
        </div>
      )}
    </div>
  );
}