import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../css/Rule.css';

function Sidebar({ activePage }) {
  return (
    <aside className="rule-sidebar">
      <div className="rule-sidebar-header">
        <div className="rule-logo">
          <div className="rule-logo-icon">
            <span>S</span>
          </div>
          <div>
            <h1 className="rule-logo-text">SARES</h1>
          </div>
        </div>
      </div>

      <nav className="rule-nav">
        <ul className="rule-nav-list">
          <li>
            <Link to="/app" className={`s-nav-item${activePage === '/app' ? ' s-nav-item--active' : ''}`}>
              <svg className="s-nav-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4a1 1 0 001-1v-3h2v3a1 1 0 001 1h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Dashboard
            </Link>
          </li>

          <li>
            <Link to="/app/students" className={`rule-nav-item${activePage === '/app/students' ? ' rule-nav-item--active' : ''}`}>
              <svg className="rule-nav-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              Students
            </Link>
          </li>

          <li>
            <Link to="/app/violations/new" className={`rule-nav-item${activePage === '/app/violations/new' ? ' rule-nav-item--active' : ''}`}>
              <svg className="rule-nav-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Log Violation
            </Link>
          </li>

          <li>
            <Link to="/app/rules" className={`rule-nav-item${activePage === '/app/rules' ? ' rule-nav-item--active' : ''}`}>
              <svg className="rule-nav-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 01.894.553l.894 1.789 1.975.287a1 1 0 01.554 1.706l-1.429 1.393.337 1.967a1 1 0 01-1.451 1.054L10 9.816l-1.774.933a1 1 0 01-1.451-1.054l.337-1.967-1.429-1.393a1 1 0 01.554-1.706l1.975-.287.894-1.789A1 1 0 0110 2z" clipRule="evenodd" />
              </svg>
              Rule Management
            </Link>
          </li>

          <li>
            <Link to="/app/reports" className={`rule-nav-item${activePage === '/app/reports' ? ' rule-nav-item--active' : ''}`}>
              <svg className="rule-nav-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v6H2v-6zM8 7a1 1 0 011-1h2a1 1 0 011 1v10H8V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v13h-4V4z" />
              </svg>
              Reports
            </Link>
          </li>
        </ul>
      </nav>

      <div className="rule-sidebar-footer">
        <button className="rule-logout-btn">
          <svg className="rule-nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}

const OFFENSES = {
  'Academic Dishonesty': ['Cheating', 'Plagiarism', 'Copying Assignment'],
  'Behavioral Misconduct': ['Fighting', 'Disrespect to Faculty', 'Bullying'],
  'Dress Code Violation': ['Improper Uniform', 'No ID', 'Improper Shoes'],
  'Technology Misuse': ['Unauthorized Device Use', 'Phone Use During Class'],
};

const INITIAL_RULES = [
  {
    id: 1,
    category: 'Academic Dishonesty',
    variety: 'Cheating',
    severity: 9,
    sanction: 'Zero score for assessment, written warning, and parent conference.',
    provision: 'Article III, Section 5.1',
    modified: '2026-01-15',
    active: true,
  },
  {
    id: 2,
    category: 'Academic Dishonesty',
    variety: 'Plagiarism',
    severity: 8,
    sanction: 'Resubmission with citation, written warning, and counseling session.',
    provision: 'Article III, Section 5.2',
    modified: '2026-01-15',
    active: true,
  },
  {
    id: 3,
    category: 'Behavioral Misconduct',
    variety: 'Fighting',
    severity: 8,
    sanction: 'Parent conference, written apology, and possible suspension.',
    provision: 'Article II, Section 3.1',
    modified: '2026-01-14',
    active: true,
  },
];

function AddRuleModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    category: '',
    variety: '',
    severity: 5,
    sanction: '',
    provision: '',
    active: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

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
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const submit = (e) => {
    e.preventDefault();

    if (!form.category || !form.variety || !form.severity || !form.sanction || !form.provision) {
      alert('Please fill in all required fields.');
      return;
    }

    onAdd(form);
  };

  return (
    <div className="rule-modal-backdrop">
      <form className="rule-modal" onSubmit={submit}>
        <div className="rule-modal-header">
          <div>
            <h2>Add New Rule</h2>
            <p>Create a new handbook rule with sanction mapping</p>
          </div>

          <button type="button" className="rule-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="rule-modal-body">
          <div className="rule-field-row">
            <div className="rule-field">
              <label>Offense Category *</label>
              <select name="category" value={form.category} onChange={handleChange}>
                <option value="">Select category</option>
                {Object.keys(OFFENSES).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="rule-field">
              <label>Offense Variety *</label>
              <select
                name="variety"
                value={form.variety}
                onChange={handleChange}
                disabled={!form.category}
              >
                <option value="">
                  {form.category ? 'Select variety' : 'Select category first'}
                </option>
                {form.category &&
                  OFFENSES[form.category].map((variety) => (
                    <option key={variety} value={variety}>{variety}</option>
                  ))}
              </select>
            </div>
          </div>

          <div className="rule-field">
            <label>Severity Level (1-10) *</label>
            <input
              type="number"
              min="1"
              max="10"
              name="severity"
              value={form.severity}
              onChange={handleChange}
            />
          </div>

          <div className="rule-field">
            <label>Recommended Sanction *</label>
            <textarea
              name="sanction"
              value={form.sanction}
              onChange={handleChange}
              placeholder="Describe the recommended sanction..."
              rows="3"
            />
          </div>

          <div className="rule-field">
            <label>Handbook Provision *</label>
            <input
              name="provision"
              value={form.provision}
              onChange={handleChange}
              placeholder="e.g., Article III, Section 5.1"
            />
          </div>

          <div className="rule-active-row">
            <span>Active</span>

            <label className="rule-switch">
              <input
                type="checkbox"
                name="active"
                checked={form.active}
                onChange={handleChange}
              />
              <span></span>
            </label>
          </div>
        </div>

        <div className="rule-modal-footer">
          <button type="button" className="rule-cancel-btn" onClick={onClose}>
            Cancel
          </button>

          <button type="submit" className="rule-submit-btn">
            Add Rule
          </button>
        </div>
      </form>
    </div>
  );
}

function EditRuleModal({ rule, onClose, onSave }) {
  const [form, setForm] = useState({
    category: rule.category,
    variety: rule.variety,
    severity: rule.severity,
    sanction: rule.sanction,
    provision: rule.provision,
    active: rule.active,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

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
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const submit = (e) => {
    e.preventDefault();

    if (!form.category || !form.variety || !form.severity || !form.sanction || !form.provision) {
      alert('Please fill in all required fields.');
      return;
    }

    onSave({
      ...rule,
      ...form,
      severity: Number(form.severity),
      modified: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div className="rule-modal-backdrop">
      <form className="rule-modal" onSubmit={submit}>
        <div className="rule-modal-header">
          <div>
            <h2>Edit Rule</h2>
            <p>Update handbook rule and sanction mapping</p>
          </div>

          <button type="button" className="rule-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="rule-modal-body">
          <div className="rule-field-row">
            <div className="rule-field">
              <label>Offense Category *</label>
              <select name="category" value={form.category} onChange={handleChange}>
                <option value="">Select category</option>
                {Object.keys(OFFENSES).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="rule-field">
              <label>Offense Variety *</label>
              <select
                name="variety"
                value={form.variety}
                onChange={handleChange}
                disabled={!form.category}
              >
                <option value="">
                  {form.category ? 'Select variety' : 'Select category first'}
                </option>
                {form.category &&
                  OFFENSES[form.category].map((variety) => (
                    <option key={variety} value={variety}>{variety}</option>
                  ))}
              </select>
            </div>
          </div>

          <div className="rule-field">
            <label>Severity Level (1-10) *</label>
            <input
              type="number"
              min="1"
              max="10"
              name="severity"
              value={form.severity}
              onChange={handleChange}
            />
          </div>

          <div className="rule-field">
            <label>Recommended Sanction *</label>
            <textarea
              name="sanction"
              value={form.sanction}
              onChange={handleChange}
              placeholder="Describe the recommended sanction..."
              rows="3"
            />
          </div>

          <div className="rule-field">
            <label>Handbook Provision *</label>
            <input
              name="provision"
              value={form.provision}
              onChange={handleChange}
              placeholder="e.g., Article III, Section 5.1"
            />
          </div>

          <div className="rule-active-row">
            <span>Active</span>

            <label className="rule-switch">
              <input
                type="checkbox"
                name="active"
                checked={form.active}
                onChange={handleChange}
              />
              <span></span>
            </label>
          </div>
        </div>

        <div className="rule-modal-footer">
          <button type="button" className="rule-cancel-btn" onClick={onClose}>
            Cancel
          </button>

          <button type="submit" className="rule-submit-btn">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Rule() {
  const location = useLocation();
  const [rules, setRules] = useState(INITIAL_RULES);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const filteredRules = rules.filter((rule) => {
    const matchSearch =
      rule.category.toLowerCase().includes(search.toLowerCase()) ||
      rule.variety.toLowerCase().includes(search.toLowerCase()) ||
      rule.provision.toLowerCase().includes(search.toLowerCase());

    const matchCategory =
      categoryFilter === 'All Categories' || rule.category === categoryFilter;

    return matchSearch && matchCategory;
  });

  const handleAddRule = (form) => {
    const newRule = {
      id: Date.now(),
      category: form.category,
      variety: form.variety,
      severity: Number(form.severity),
      sanction: form.sanction,
      provision: form.provision,
      modified: new Date().toISOString().slice(0, 10),
      active: form.active,
    };

    setRules([newRule, ...rules]);
    setShowModal(false);
    showToast('Rule added successfully!');
  };

  const openEditModal = (rule) => {
    setSelectedRule(rule);
    setShowEditModal(true);
  };

  const handleSaveEdit = (updatedRule) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === updatedRule.id ? updatedRule : rule
      )
    );

    setShowEditModal(false);
    setSelectedRule(null);
    showToast('Rule updated successfully!');
  };

  const toggleRule = (id) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id ? { ...rule, active: !rule.active } : rule
      )
    );

    showToast('Rule status updated successfully!');
  };

  return (
    <div className="rule-page">
      <Sidebar activePage={location.pathname} />

      <main className="rule-main">
        <section className="rule-hero">
          <div className="rule-hero-content">
            <h1>Rule Base Management</h1>
            <p>Configure handbook rules and sanction mappings with version tracking</p>

            <div className="rule-hero-actions">
              <button className="rule-primary-btn" onClick={() => setShowModal(true)}>
                <span>+</span>
                Add New Rule
              </button>

              <button className="rule-secondary-btn">
                <span>↻</span>
                Version History
              </button>
            </div>
          </div>

          <div className="rule-hero-image"></div>
        </section>

        <section className="rule-card">
          <div className="rule-card-header">
            <h2>Handbook Rules</h2>
            <p>Search and manage all encoded rules</p>
          </div>

          <div className="rule-controls">
            <div className="rule-search-wrap">
              <svg className="rule-search-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>

              <input
                type="text"
                placeholder="Search rules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option>All Categories</option>
              {Object.keys(OFFENSES).map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="rule-list">
            {filteredRules.map((rule) => (
              <article className="rule-item" key={rule.id}>
                <div className="rule-item-top">
                  <div>
                    <div className="rule-title-row">
                      <h3>{rule.category}</h3>
                      <span>{rule.variety}</span>
                    </div>

                    <div className="rule-severity-row">
                      <p>Severity:</p>
                      <div className="rule-severity-bar">
                        <div style={{ width: `${rule.severity * 10}%` }}></div>
                      </div>
                      <strong>{rule.severity}/10</strong>
                    </div>
                  </div>

                  <div className="rule-item-actions">
                    <button
                      className="rule-edit-btn"
                      title="Edit rule"
                      onClick={() => openEditModal(rule)}
                    >
                      ✎
                    </button>

                    <button
                      className={`rule-toggle${rule.active ? ' active' : ''}`}
                      onClick={() => toggleRule(rule.id)}
                      title="Toggle rule"
                    >
                      <span></span>
                    </button>
                  </div>
                </div>

                <div className="rule-item-body">
                  <p className="rule-label">Recommended Sanction:</p>
                  <div className="rule-sanction">{rule.sanction}</div>

                  <div className="rule-meta">
                    <span>▧ {rule.provision}</span>
                    <span>Last modified: {rule.modified}</span>
                    <span>By: Admin User</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {showModal && (
        <AddRuleModal
          onClose={() => setShowModal(false)}
          onAdd={handleAddRule}
        />
      )}

      {showEditModal && selectedRule && (
        <EditRuleModal
          rule={selectedRule}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRule(null);
          }}
          onSave={handleSaveEdit}
        />
      )}

      {toast && (
        <div className="rule-toast">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}