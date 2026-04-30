import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../css/Violation.css';
const API_URL = 'http://127.0.0.1:5000';

function Sidebar({ activePage, handleLogout }) {
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
            <Link to="/sares/dashboard" className={`s-nav-item${activePage === '/sares/dashboard' ? ' s-nav-item--active' : ''}`}>
              Dashboard
            </Link>
          </li>

          <li>
            <Link to="/sares/students" className={`s-nav-item${activePage === '/sares/students' ? ' s-nav-item--active' : ''}`}>
              Students
            </Link>
          </li>

          <li>
            <Link to="/sares/violation" className={`s-nav-item${activePage === '/sares/violation' ? ' s-nav-item--active' : ''}`}>
              Log Violation
            </Link>
          </li>

          <li>
            <Link to="/sares/rules" className={`s-nav-item${activePage === '/sares/rules' ? ' s-nav-item--active' : ''}`}>
              Rule Management
            </Link>
          </li>

          <li>
            <Link to="/sares/reports" className={`s-nav-item${activePage === '/sares/reports' ? ' s-nav-item--active' : ''}`}>
              Reports
            </Link>
          </li>
        </ul>
      </nav>

      <div className="s-sidebar-footer">
        <button className="s-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default function Violation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);
  const [students, setStudents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);
  const today = new Date().toISOString().split('T')[0];

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };



  const [form, setForm] = useState({
    student_id: '',
    incident_date: today,
    category_id: '',
    rule_id: '',
    incident_description: '',
  });

  useEffect(() => {
    fetchStudents();
    fetchCategories();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/students`);
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
      alert('Failed to load students.');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      alert('Failed to load categories.');
    }
  };

  const fetchRulesByCategory = async (categoryId) => {
    try {
      const response = await fetch(`${API_URL}/api/rules?category_id=${categoryId}`);
      const data = await response.json();
      setRules(data);
    } catch (error) {
      console.error('Error fetching rules:', error);
      alert('Failed to load offense varieties.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'category_id') {
      setForm({
        ...form,
        category_id: value,
        rule_id: '',
      });

      if (value) {
        fetchRulesByCategory(value);
      } else {
        setRules([]);
      }

      return;
    }

    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.student_id ||
      !form.rule_id ||
      !form.incident_date ||
      !form.incident_description
    ) {
      alert('Please fill in all required fields.');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user'));

    const violationData = {
      student_id: form.student_id,
      rule_id: form.rule_id,
      incident_date: form.incident_date,
      incident_description: form.incident_description,
      created_by: user?.user_id || 1,
    };

    try {
      const response = await fetch('http://127.0.0.1:5000/api/violations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(violationData),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || 'Failed to submit violation.');
        return;
      }

      console.log('Saved violation:', data);

      setShowToast(true);

      setForm({
        student_id: '',
        incident_date: today,
        category_id: '',
        rule_id: '',
        incident_description: '',
      });

      setRules([]);

      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving violation:', error);
      alert('Cannot connect to backend. Make sure Flask is running.');
    }
  };

  return (
    <div className="s-page">
      <Sidebar activePage={location.pathname} handleLogout={handleLogout} />

      <div className="s-main">

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
                name="student_id"
                value={form.student_id}
                onChange={handleChange}
              >
                <option value="">Select a student</option>
                {students.map((student) => (
                  <option key={student.student_id} value={student.student_id}>
                    {student.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="s-field">
              <label className="s-label">Date of Incident *</label>
              <input
                className="s-input"
                type="date"
                name="incident_date"
                value={form.incident_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="s-field-row">
            <div className="s-field">
              <label className="s-label">Offense Category *</label>
              <select
                className="s-input s-select"
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="s-field">
              <label className="s-label">Offense Variety *</label>
              <select
                className="s-input s-select"
                name="rule_id"
                value={form.rule_id}
                onChange={handleChange}
                disabled={!form.category_id}
              >
                <option value="">
                  {form.category_id ? 'Select variety' : 'Select category first'}
                </option>

                {rules.map((rule) => (
                  <option key={rule.rule_id} value={rule.rule_id}>
                    {rule.offense_variety}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="s-field">
            <label className="s-label">Incident Description *</label>
            <textarea
              className="s-input lv-textarea"
              name="incident_description"
              value={form.incident_description}
              onChange={handleChange}
              placeholder="Provide detailed description of the incident..."
              rows="3"
            />
            <p className="s-page-sub">
              Include relevant details such as witnesses, location, and circumstances
            </p>
          </div>

          <div className="lv-actions">
            <Link to="/sares/dashboard" className="s-btn-cancel lv-link-btn">
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