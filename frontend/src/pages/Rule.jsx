import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { addDoc, collection, getDocs, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'
import '../css/Rule.css'
import wesleyLogo from '../assets/wesley-logo.png'
import { LayoutDashboard, Users, ClipboardList, ShieldCheck, BarChart3, LogOut, Menu, X } from 'lucide-react'

function Sidebar({ activePage, handleLogout, isOpen, toggleSidebar }) {
  return (
    <aside className={`rule-sidebar${isOpen ? ' rule-sidebar--open' : ''}`}>
      <div className="rule-sidebar-header">
        <div className="rule-logo">
          <div className="rule-logo-icon">
            <img src={wesleyLogo} alt="Olongapo Wesley School Logo" className="school-logo" />
          </div>
          <div>
            <h1 className="rule-logo-text">SARES</h1>
          </div>
        </div>
      </div>

      <nav className="rule-nav">
        <ul className="rule-nav-list">
          <li>
            <Link to="/sares/dashboard" onClick={toggleSidebar} className={`rule-nav-item${activePage === '/sares/dashboard' ? ' rule-nav-item--active' : ''}`}>
              <LayoutDashboard className="rule-nav-icon" />
              Dashboard
            </Link>
          </li>

          <li>

            <Link to="/sares/students" onClick={toggleSidebar} className={`rule-nav-item${activePage === '/sares/students' ? ' rule-nav-item--active' : ''}`}>
              <Users className="rule-nav-icon" />
              Students
            </Link>
          </li>

          <li>
            <Link to="/sares/violation" onClick={toggleSidebar} className={`rule-nav-item${activePage === '/sares/violation' ? ' rule-nav-item--active' : ''}`}>
              <ClipboardList className="rule-nav-icon" />
              Log Violation
            </Link>
          </li>

          <li>

            <Link to="/sares/rules" onClick={toggleSidebar} className={`rule-nav-item${activePage === '/sares/rules' ? ' rule-nav-item--active' : ''}`}>
              <ShieldCheck className="rule-nav-icon" />
              Rule Management
            </Link>
          </li>

          <li>

            <Link to="/sares/reports" onClick={toggleSidebar} className={`rule-nav-item${activePage === '/sares/reports' ? ' rule-nav-item--active' : ''}`}>
              <BarChart3 className="rule-nav-icon" />
              Reports
            </Link>
          </li>
        </ul>
      </nav>

      <div className="rule-sidebar-footer">
        <button className="rule-logout-btn" onClick={handleLogout}>
          <LogOut className="rule-logout-icon" />
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

function AddRuleModal({ onClose, onAdd, categories }) {
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
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_name}>
                    {category.category_name}
                  </option>
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
                  (OFFENSES[form.category] || []).map((variety) => (
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

function EditRuleModal({ rule, onClose, onSave, categories }) {
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
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_name}>
                    {category.category_name}
                  </option>
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
                  (OFFENSES[form.category] || []).map((variety) => (
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
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rules, setRules] = useState(INITIAL_RULES);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [toast, setToast] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState([]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    loadRules();
    loadCategories();
  }, []);

  const loadRules = async () => {
    const snapshot = await getDocs(collection(db, 'rules'));
    const data = snapshot.docs.map((ruleDoc) => {
      const rule = ruleDoc.data();
      return {
        id: ruleDoc.id,
        rule_id: rule.rule_id || ruleDoc.id,
        category_id: rule.category_id || '',
        category: rule.category_name || '',
        variety: rule.offense_variety || '',
        severity: rule.severity || 0,
        sanction: rule.recommended_sanction || '',
        provision: rule.provision || '',
        modified: rule.modified_date || new Date().toISOString().slice(0, 10),
        active: Boolean(rule.is_active),
      };
    });
    setRules(data.sort((a, b) => String(b.modified).localeCompare(String(a.modified))));
  };

  const loadCategories = async () => {
    const snapshot = await getDocs(collection(db, 'offense_categories'));
    const data = snapshot.docs.map((categoryDoc) => ({
      ...categoryDoc.data(),
      category_id: categoryDoc.data().category_id || categoryDoc.id,
    }));
    setCategories(data);
  };

  const openHistory = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'rule_versions'));
      const data = snapshot.docs.map((historyDoc) => ({
        version_id: historyDoc.id,
        ...historyDoc.data(),
      }));

      setHistory(data.sort((a, b) => String(b.changed_at || '').localeCompare(String(a.changed_at || ''))));
      setShowHistory(true);
    } catch (error) {
      console.error('Error loading rule history:', error);
      alert('Failed to load version history.');
    }
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

  const handleAddRule = async (form) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const selectedCategory = categories.find((category) => category.category_name === form.category);
    const modifiedDate = new Date().toISOString().slice(0, 10);

    const ruleRef = await addDoc(collection(db, 'rules'), {
      rule_id: '',
      category_id: selectedCategory?.category_id || '',
      category_name: form.category,
      offense_variety: form.variety,
      severity: Number(form.severity),
      recommended_sanction: form.sanction,
      provision: form.provision,
      is_active: Boolean(form.active),
      modified_date: modifiedDate,
      changed_by: user?.user_id || 'system',
      created_at: serverTimestamp(),
    });

    await addDoc(collection(db, 'rule_versions'), {
      rule_id: ruleRef.id,
      action_type: 'created',
      rule_name: form.variety,
      category_name: form.category,
      description: 'Rule was created.',
      changed_by: user?.full_name || user?.email || 'Unknown',
      changed_at: new Date().toISOString(),
    });

    await loadRules();
    setShowModal(false);
    showToast('Rule added successfully!');
  };

  const openEditModal = (rule) => {
    setSelectedRule(rule);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedRule) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const selectedCategory = categories.find((category) => category.category_name === updatedRule.category);

    await updateDoc(doc(db, 'rules', updatedRule.id), {
      category_id: selectedCategory?.category_id || '',
      category_name: updatedRule.category,
      offense_variety: updatedRule.variety,
      severity: Number(updatedRule.severity),
      recommended_sanction: updatedRule.sanction,
      provision: updatedRule.provision,
      is_active: Boolean(updatedRule.active),
      modified_date: new Date().toISOString().slice(0, 10),
      changed_by: user?.user_id || 'system',
      updated_at: serverTimestamp(),
    });

    await addDoc(collection(db, 'rule_versions'), {
      rule_id: updatedRule.id,
      action_type: 'updated',
      rule_name: updatedRule.variety,
      category_name: updatedRule.category,
      description: 'Rule was updated.',
      changed_by: user?.full_name || user?.email || 'Unknown',
      changed_at: new Date().toISOString(),
    });

    await loadRules();
    setShowEditModal(false);
    setSelectedRule(null);
    showToast('Rule updated successfully!');
  };
  const toggleRule = async (id) => {
    const currentRule = rules.find((rule) => rule.id === id);
    if (!currentRule) return;
    await updateDoc(doc(db, 'rules', id), { is_active: !currentRule.active });
    await loadRules();
    showToast('Rule status updated successfully!');
  };

  return (
    <div className="rule-page">
      <div className="mobile-menu-bar">
        <div className="rule-logo">
          <div className="rule-logo-icon">
            <img src={wesleyLogo} alt="Olongapo Wesley School Logo" className="school-logo" />
          </div>
          <h1 className="rule-logo-text">SARES</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mobile-menu-btn">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <Sidebar
        activePage={location.pathname}
        handleLogout={handleLogout}
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(false)}
      />

      <main className="rule-main">
        <h1>Rule Base Management</h1>
        <p>Configure handbook rules and sanction mappings with version tracking</p>

        <div className="rule-hero-actions">
          <button className="rule-primary-btn" onClick={() => setShowModal(true)}>
            <span>+</span>
            Add New Rule
          </button>

          <button className="rule-secondary-btn" onClick={openHistory}>
            View Version History
          </button>
        </div>

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
              {categories.map((category) => (
                <option key={category.category_id}>{category.category_name}</option>
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
          categories={categories}
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
          categories={categories}
        />
      )}

      {showHistory && (
        <div className="rule-modal-backdrop">
          <div className="rule-modal">
            <div className="rule-modal-header">
              <div>
                <h2>Version History</h2>
                <p>Recent changes made to handbook rules</p>
              </div>

              <button
                type="button"
                className="rule-modal-close"
                onClick={() => setShowHistory(false)}
              >
                ×
              </button>
            </div>

            <div className="rule-modal-body">
              {history.length === 0 ? (
                <p>No version history yet.</p>
              ) : (
                history.map((item) => (
                  <div className="rule-history-item" key={item.version_id}>
                    <div className="rule-history-top">
                      <strong>{item.rule_name}</strong>
                      <span>{item.action_type}</span>
                    </div>

                    <p>{item.category_name}</p>
                    <small>
                      {item.description} • By {item.changed_by || 'Unknown'} • {item.changed_at}
                    </small>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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