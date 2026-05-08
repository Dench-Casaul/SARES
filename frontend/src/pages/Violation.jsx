import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '../css/Violation.css'
import wesleyLogo from '../assets/wesley-logo.png'
import { LayoutDashboard, Users, ClipboardList, ShieldCheck, BarChart3, LogOut, Menu, X, ChevronDown } from 'lucide-react'
const API_URL = 'http://127.0.0.1:5000'

function Sidebar({ activePage, handleLogout, isOpen, toggleSidebar }) {
  return (
    <div className={`v-sidebar${isOpen ? ' v-sidebar--open' : ''}`}>
      <div className="v-logo">
        <div className="v-logo-icon">
          <img
            src={wesleyLogo}
            alt="Olongapo Wesley School Logo"
            className="school-logo"
          />
        </div>
        <h1>SARES</h1>
      </div>

      <nav className="v-nav">
        <Link
          to="/sares/dashboard"
          onClick={toggleSidebar}
          className={`v-nav-item${activePage === "/sares/dashboard" ? " active" : ""}`}
        >
          <LayoutDashboard className="v-nav-icon" />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/sares/students"
          onClick={toggleSidebar}
          className={`v-nav-item${activePage === "/sares/students" ? " active" : ""}`}
        >
          <Users className="v-nav-icon" />
          <span>Students</span>
        </Link>

        <Link
          to="/sares/violation"
          onClick={toggleSidebar}
          className={`v-nav-item${activePage === "/sares/violation" ? " active" : ""}`}
        >
          <ClipboardList className="v-nav-icon" />
          <span>Log Violation</span>
        </Link>

        <Link
          to="/sares/rules"
          onClick={toggleSidebar}
          className={`v-nav-item${activePage === "/sares/rules" ? " active" : ""}`}
        >
          <ShieldCheck className="v-nav-icon" />
          <span>Rule Management</span>
        </Link>

        <Link
          to="/sares/reports"
          onClick={toggleSidebar}
          className={`v-nav-item${activePage === "/sares/reports" ? " active" : ""}`}
        >
          <BarChart3 className="v-nav-icon" />
          <span>Reports</span>
        </Link>
      </nav>

      <div className="v-logout-section">
        <button className="v-logout" onClick={handleLogout}>
          <LogOut className="v-nav-icon" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default function Violation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [students, setStudents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);
  const studentBlurTimer = useRef(null);

  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const categoryBlurTimer = useRef(null);

  const [ruleQuery, setRuleQuery] = useState('');
  const [ruleMenuOpen, setRuleMenuOpen] = useState(false);
  const ruleBlurTimer = useRef(null);

  const today = new Date().toISOString().split('T')[0];

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        (s.full_name && s.full_name.toLowerCase().includes(q)) ||
        String(s.student_number ?? '').toLowerCase().includes(q)
    );
  }, [students, studentQuery]);

  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) => c.category_name && c.category_name.toLowerCase().includes(q)
    );
  }, [categories, categoryQuery]);

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

  const filteredRules = useMemo(() => {
    if (!form.category_id) return [];
    const q = ruleQuery.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter(
      (r) =>
        (r.offense_variety && r.offense_variety.toLowerCase().includes(q)) ||
        (r.severity && String(r.severity).toLowerCase().includes(q))
    );
  }, [rules, ruleQuery, form.category_id]);

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

  const clearStudentBlurTimer = () => {
    if (studentBlurTimer.current) {
      clearTimeout(studentBlurTimer.current);
      studentBlurTimer.current = null;
    }
  };

  const openStudentMenu = () => {
    clearStudentBlurTimer();
    setStudentMenuOpen(true);
  };

  const scheduleCloseStudentMenu = () => {
    clearStudentBlurTimer();
    studentBlurTimer.current = setTimeout(() => setStudentMenuOpen(false), 175);
  };

  const pickStudent = (student) => {
    setForm((f) => ({
      ...f,
      student_id: String(student.student_id),
    }));
    setStudentQuery(student.full_name);
    setStudentMenuOpen(false);
  };

  const onStudentInputChange = (e) => {
    const value = e.target.value;
    setStudentQuery(value);
    openStudentMenu();
    setForm((f) => {
      if (!value.trim()) return { ...f, student_id: '' };
      if (!f.student_id) return f;
      const current = students.find((s) => String(s.student_id) === String(f.student_id));
      if (current && value === current.full_name) return f;
      return { ...f, student_id: '' };
    });
  };

  const toggleStudentMenu = () => {
    clearStudentBlurTimer();
    setStudentMenuOpen((open) => !open);
  };

  const clearCategoryBlurTimer = () => {
    if (categoryBlurTimer.current) {
      clearTimeout(categoryBlurTimer.current);
      categoryBlurTimer.current = null;
    }
  };

  const openCategoryMenu = () => {
    clearCategoryBlurTimer();
    setCategoryMenuOpen(true);
  };

  const scheduleCloseCategoryMenu = () => {
    clearCategoryBlurTimer();
    categoryBlurTimer.current = setTimeout(() => setCategoryMenuOpen(false), 175);
  };

  const pickCategory = (category) => {
    const id = String(category.category_id);
    setRules([]);
    setForm((f) => ({
      ...f,
      category_id: id,
      rule_id: '',
    }));
    setCategoryQuery(category.category_name);
    setCategoryMenuOpen(false);
    setRuleQuery('');
    fetchRulesByCategory(id);
  };

  const onCategoryInputChange = (e) => {
    const value = e.target.value;
    setCategoryQuery(value);
    openCategoryMenu();
    setForm((f) => {
      if (!value.trim()) return { ...f, category_id: '', rule_id: '' };
      if (!f.category_id) return f;
      const current = categories.find((c) => String(c.category_id) === String(f.category_id));
      if (current && value === current.category_name) return f;
      return { ...f, category_id: '', rule_id: '' };
    });
  };

  const toggleCategoryMenu = () => {
    clearCategoryBlurTimer();
    setCategoryMenuOpen((open) => !open);
  };

  const clearRuleBlurTimer = () => {
    if (ruleBlurTimer.current) {
      clearTimeout(ruleBlurTimer.current);
      ruleBlurTimer.current = null;
    }
  };

  const openRuleMenu = () => {
    if (!form.category_id) return;
    clearRuleBlurTimer();
    setRuleMenuOpen(true);
  };

  const scheduleCloseRuleMenu = () => {
    clearRuleBlurTimer();
    ruleBlurTimer.current = setTimeout(() => setRuleMenuOpen(false), 175);
  };

  const pickRule = (rule) => {
    setForm((f) => ({ ...f, rule_id: String(rule.rule_id) }));
    setRuleQuery(rule.offense_variety);
    setRuleMenuOpen(false);
  };

  const onRuleInputChange = (e) => {
    if (!form.category_id) return;
    const value = e.target.value;
    setRuleQuery(value);
    openRuleMenu();
    setForm((f) => {
      if (!value.trim()) return { ...f, rule_id: '' };
      if (!f.rule_id) return f;
      const current = rules.find((r) => String(r.rule_id) === String(f.rule_id));
      if (current && value === current.offense_variety) return f;
      return { ...f, rule_id: '' };
    });
  };

  const toggleRuleMenu = () => {
    if (!form.category_id) return;
    clearRuleBlurTimer();
    setRuleMenuOpen((open) => !open);
  };

  useEffect(() => {
    if (!form.category_id) {
      setRules([]);
      setRuleQuery('');
    }
  }, [form.category_id]);

  useEffect(
    () => () => {
      clearStudentBlurTimer();
      clearCategoryBlurTimer();
      clearRuleBlurTimer();
    },
    []
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.student_id ||
      !form.category_id ||
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

      setStudentQuery('');
      setStudentMenuOpen(false);

      setCategoryQuery('');
      setCategoryMenuOpen(false);
      setRuleQuery('');
      setRuleMenuOpen(false);

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
    <div className="v-page">
      <div className="v-mobile-menu-bar">
        <div className="v-logo">
          <div className="v-logo-icon">
            <img src={wesleyLogo} alt="Logo" className="school-logo" />
          </div>
          <h1>SARES</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="v-mobile-menu-btn">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <Sidebar 
        activePage={location.pathname} 
        handleLogout={handleLogout} 
        isOpen={sidebarOpen} 
        toggleSidebar={() => setSidebarOpen(false)} 
      />

      <div className="v-main">

        <div className="v-main-header">
          <div>
            <h1 className="v-page-title">Log New Violation</h1>
            <p className="v-page-sub">Record a student disciplinary incident</p>
          </div>
        </div>

        <form className="v-directory-card v-form-card" onSubmit={handleSubmit}>
          <div className="v-directory-header">
            <h2 className="v-directory-title">Violation Details</h2>
            <p className="v-directory-sub">Fill in all required information</p>
          </div>

          <div className="v-field-row">
            <div className="v-field">
              <label className="v-label" id="v-student-label">
                Student *
              </label>
              <div
                className="v-student-combobox"
                role="combobox"
                aria-expanded={studentMenuOpen}
                aria-haspopup="listbox"
                aria-labelledby="v-student-label"
              >
                <div className="v-student-combobox-inner">
                  <input
                    type="text"
                    className="v-input v-student-input"
                    autoComplete="off"
                    placeholder="Search or select a student"
                    value={studentQuery}
                    onChange={onStudentInputChange}
                    onFocus={openStudentMenu}
                    onBlur={scheduleCloseStudentMenu}
                    aria-controls="v-student-listbox"
                    aria-autocomplete="list"
                  />
                  <button
                    type="button"
                    className={`v-student-chevron-btn${studentMenuOpen ? ' v-student-chevron-btn--open' : ''}`}
                    aria-label={studentMenuOpen ? 'Close student list' : 'Open student list'}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={toggleStudentMenu}
                  >
                    <ChevronDown size={20} strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
                {studentMenuOpen && (
                  <ul
                    className="v-student-dropdown"
                    id="v-student-listbox"
                    role="listbox"
                  >
                    {filteredStudents.length === 0 ? (
                      <li className="v-student-option v-student-option--empty">
                        {students.length === 0 ? 'No students loaded.' : 'No matching students.'}
                      </li>
                    ) : (
                      filteredStudents.map((student) => (
                        <li
                          key={student.student_id}
                          role="option"
                          aria-selected={String(student.student_id) === String(form.student_id)}
                          className="v-student-option"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pickStudent(student)}
                        >
                          <span className="v-student-option-name">{student.full_name}</span>
                          {student.student_number ? (
                            <span className="v-student-option-meta">{student.student_number}</span>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div className="v-field">
              <label className="v-label">Date of Incident *</label>
              <input
                className="v-input"
                type="date"
                name="incident_date"
                value={form.incident_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="v-field-row">
            <div className="v-field">
              <label className="v-label" id="v-category-label">
                Offense Category *
              </label>
              <div
                className="v-student-combobox"
                role="combobox"
                aria-expanded={categoryMenuOpen}
                aria-haspopup="listbox"
                aria-labelledby="v-category-label"
              >
                <div className="v-student-combobox-inner">
                  <input
                    type="text"
                    className="v-input v-student-input"
                    autoComplete="off"
                    placeholder="Search or select a category"
                    value={categoryQuery}
                    onChange={onCategoryInputChange}
                    onFocus={openCategoryMenu}
                    onBlur={scheduleCloseCategoryMenu}
                    aria-controls="v-category-listbox"
                    aria-autocomplete="list"
                  />
                  <button
                    type="button"
                    className={`v-student-chevron-btn${categoryMenuOpen ? ' v-student-chevron-btn--open' : ''}`}
                    aria-label={categoryMenuOpen ? 'Close category list' : 'Open category list'}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={toggleCategoryMenu}
                  >
                    <ChevronDown size={20} strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
                {categoryMenuOpen && (
                  <ul
                    className="v-student-dropdown"
                    id="v-category-listbox"
                    role="listbox"
                  >
                    {filteredCategories.length === 0 ? (
                      <li className="v-student-option v-student-option--empty">
                        {categories.length === 0 ? 'No categories loaded.' : 'No matching categories.'}
                      </li>
                    ) : (
                      filteredCategories.map((category) => (
                        <li
                          key={category.category_id}
                          role="option"
                          aria-selected={String(category.category_id) === String(form.category_id)}
                          className="v-student-option"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pickCategory(category)}
                        >
                          <span className="v-student-option-name">{category.category_name}</span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div className="v-field">
              <label className="v-label" id="v-rule-label">
                Offense Variety *
              </label>
              <div
                className={`v-student-combobox${!form.category_id ? ' v-student-combobox--disabled' : ''}`}
                role="combobox"
                aria-expanded={ruleMenuOpen}
                aria-haspopup="listbox"
                aria-labelledby="v-rule-label"
              >
                <div className="v-student-combobox-inner">
                  <input
                    type="text"
                    className="v-input v-student-input"
                    autoComplete="off"
                    placeholder={form.category_id ? 'Search or select a variety' : 'Select category first'}
                    value={ruleQuery}
                    onChange={onRuleInputChange}
                    onFocus={openRuleMenu}
                    onBlur={scheduleCloseRuleMenu}
                    aria-controls="v-rule-listbox"
                    aria-autocomplete="list"
                    disabled={!form.category_id}
                  />
                  <button
                    type="button"
                    className={`v-student-chevron-btn${ruleMenuOpen ? ' v-student-chevron-btn--open' : ''}`}
                    aria-label={ruleMenuOpen ? 'Close variety list' : 'Open variety list'}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={toggleRuleMenu}
                    disabled={!form.category_id}
                  >
                    <ChevronDown size={20} strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
                {ruleMenuOpen && form.category_id && (
                  <ul
                    className="v-student-dropdown"
                    id="v-rule-listbox"
                    role="listbox"
                  >
                    {filteredRules.length === 0 ? (
                      <li className="v-student-option v-student-option--empty">
                        {rules.length === 0 ? 'Loading varieties…' : 'No matching varieties.'}
                      </li>
                    ) : (
                      filteredRules.map((rule) => (
                        <li
                          key={rule.rule_id}
                          role="option"
                          aria-selected={String(rule.rule_id) === String(form.rule_id)}
                          className="v-student-option"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pickRule(rule)}
                        >
                          <span className="v-student-option-name">{rule.offense_variety}</span>
                          {rule.severity ? (
                            <span className="v-student-option-meta">{rule.severity}</span>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="v-field">
            <label className="v-label">Incident Description *</label>
            <textarea
              className="v-input v-textarea"
              name="incident_description"
              value={form.incident_description}
              onChange={handleChange}
              placeholder="Provide detailed description of the incident..."
              rows="3"
            />
            <p className="v-page-sub">
              Include relevant details such as witnesses, location, and circumstances
            </p>
          </div>

          <div className="v-actions">
            <Link to="/sares/dashboard" className="v-btn-cancel v-link-btn">
              Cancel
            </Link>

            <button type="submit" className="v-btn-submit">
              Submit Violation
            </button>
          </div>
        </form>
      </div>

      {showToast && (
        <div className="v-toast">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Violation logged successfully!
        </div>
      )}
    </div>
  );
}