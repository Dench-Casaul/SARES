import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import '../css/Rule.css'
import wesleyLogo from '../assets/wesley-logo.png'
import { LayoutDashboard, Users, ClipboardList, ShieldCheck, BarChart3, LogOut, Menu, X, ChevronDown, ChevronRight, Save, Pencil } from 'lucide-react'
import handbook from '../data/generalizedHandbook.json'
import { applySanctionOverrides, getSanctionOverrides } from '../data/handbookIndex'
import { db } from '../firebase'
import { formatIdentifiedSanction } from '../engine/sanctionLabel'

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

          <li>
            <Link to="/sares/violation" onClick={toggleSidebar} className={`rule-nav-item${activePage === '/sares/violation' ? ' rule-nav-item--active' : ''}`}>
              <ClipboardList className="rule-nav-icon" />
              Log Violation
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

const SUBCATEGORY_COLORS = {
  light: { bg: '#eaf4ff', color: '#006ed0', border: '#b9d9fb' },
  less_serious: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  serious: { bg: '#fef2f2', color: '#be123c', border: '#fecaca' },
  very_serious: { bg: '#7f1d1d', color: '#ffffff', border: '#b91c1c' },
}

const SUBCATEGORY_LABELS = {
  light: 'Light',
  less_serious: 'Less Serious',
  serious: 'Serious',
  very_serious: 'Very Serious',
}

const SEVERITY_OPTIONS = [
  { id: 'light', label: 'Light', category: 'minor' },
  { id: 'less_serious', label: 'Less Serious', category: 'minor' },
  { id: 'serious', label: 'Serious', category: 'major' },
  { id: 'very_serious', label: 'Very Serious', category: 'major' },
];

export default function Rule() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeType, setActiveType] = useState('minor');
  const [activeSubcategory, setActiveSubcategory] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Draft filter states
  const [tempType, setTempType] = useState('minor');
  const [tempSubcategory, setTempSubcategory] = useState(null);
  const [tempCategoryFilter, setTempCategoryFilter] = useState('all');
  const [tempSearchQuery, setTempSearchQuery] = useState('');
  const [activePanel, setActivePanel] = useState('browse');
  const [sanctionDraft, setSanctionDraft] = useState(getSanctionOverrides);
  const [violationRows, setViolationRows] = useState([]);
  const [violationQuery, setViolationQuery] = useState('');
  const [editingViolation, setEditingViolation] = useState(null);
  const [panelMessage, setPanelMessage] = useState('');
  const [panelError, setPanelError] = useState('');
  const [savingPanel, setSavingPanel] = useState(false);

  useEffect(() => {
    const unsubscribeRules = onSnapshot(doc(db, 'rules', 'handbook_sanctions'), (snapshot) => {
      const overrides = snapshot.exists() ? snapshot.data() : {};
      applySanctionOverrides(overrides);
      setSanctionDraft(getSanctionOverrides());
    }, (error) => {
      console.error('Failed to load sanction rules:', error);
      setPanelError('Unable to load saved sanction overrides.');
    });
    const unsubscribeViolations = onSnapshot(collection(db, 'violations'), (snapshot) => {
      setViolationRows(snapshot.docs.map((record) => ({ id: record.id, ...record.data() }))
        .sort((left, right) => String(right.incident_date || '').localeCompare(String(left.incident_date || ''))));
    }, (error) => {
      console.error('Failed to load violations for editing:', error);
      setPanelError('Unable to load violation records.');
    });
    return () => {
      unsubscribeRules();
      unsubscribeViolations();
    };
  }, []);

  const saveSanctionRules = async (event) => {
    event.preventDefault();
    setSavingPanel(true);
    setPanelError('');
    setPanelMessage('');
    try {
      await setDoc(doc(db, 'rules', 'handbook_sanctions'), {
        ...sanctionDraft,
        updated_at: serverTimestamp(),
      });
      applySanctionOverrides(sanctionDraft);
      setPanelMessage('Sanction rules saved. New recommendations will use these values.');
    } catch (error) {
      console.error('Failed to save sanction rules:', error);
      setPanelError('Could not save sanction rules. Check your access and try again.');
    } finally {
      setSavingPanel(false);
    }
  };

  const saveViolation = async (event) => {
    event.preventDefault();
    if (!editingViolation) return;
    setSavingPanel(true);
    setPanelError('');
    setPanelMessage('');
    const isMediation = String(editingViolation.intervention_type || '').toLowerCase() === 'mediation';
    const mediationStatus = !isMediation
      ? editingViolation.mediation_status || null
      : editingViolation.status === 'resolved'
        ? 'resolved'
        : editingViolation.status === 'recorded'
          ? 'proceeded_to_sanction'
          : 'pending';
    const payload = {
      incident_date: editingViolation.incident_date || '',
      group_title: editingViolation.group_title || '',
      category_name: editingViolation.group_title || editingViolation.category_name || '',
      offense_variety: editingViolation.offense_variety || '',
      incident_description: editingViolation.incident_description || '',
      witnesses: editingViolation.witnesses || '',
      reported_by: editingViolation.reported_by || '',
      reporter_role: editingViolation.reporter_role || '',
      reporter_contact: editingViolation.reporter_contact || '',
      recommended_sanction: editingViolation.recommended_sanction || '',
      status: editingViolation.status || 'recorded',
      mediation_status: mediationStatus,
      identified_sanction: formatIdentifiedSanction({
        ...editingViolation,
        recommended_sanction: editingViolation.recommended_sanction,
        status: editingViolation.status,
        mediation_status: mediationStatus,
      }),
      updated_at: serverTimestamp(),
    };
    try {
      await updateDoc(doc(db, 'violations', editingViolation.id), payload);
      setEditingViolation(null);
      setPanelMessage('Violation record updated.');
    } catch (error) {
      console.error('Failed to update violation record:', error);
      setPanelError('Could not update this violation. Check your access and try again.');
    } finally {
      setSavingPanel(false);
    }
  };

  const handleApplyFilters = () => {
    setActiveType(tempType);
    setActiveSubcategory(tempSubcategory);
    setCategoryFilter(tempCategoryFilter);
    setSearchQuery(tempSearchQuery);
  };

  // Dynamic available categories for the dropdown based on selected tempType and tempSubcategory
  const availableCategories = [...new Set(
    handbook.offenseGroups
      .filter(g => {
        const matchType = tempType === 'all' || g.categoryId === tempType;
        const matchSub = !tempSubcategory || tempSubcategory === 'all' || g.subcategoryId === tempSubcategory;
        return matchType && matchSub;
      })
      .map(g => g.groupTitle)
  )].sort();

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const offenseTypes = handbook.offenseTypes;
  const currentType = offenseTypes.find(t => t.id === activeType);

  const toggleGroup = (num) => {
    setExpandedGroup(expandedGroup === num ? null : num);
  };

  // Unified filtering logic
  const filteredGroups = handbook.offenseGroups.filter(g => {
    const matchType = activeType === 'all' || g.categoryId === activeType;
    const matchSub = !activeSubcategory || activeSubcategory === 'all' || g.subcategoryId === activeSubcategory;
    const matchCat = categoryFilter === 'all' || g.groupTitle === categoryFilter;
    
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = searchQuery === '' || 
      g.groupTitle.toLowerCase().includes(searchLower) ||
      g.offenses.some(o => o.title.toLowerCase().includes(searchLower));

    return matchType && matchSub && matchCat && matchSearch;
  });
  const filteredViolationRows = violationRows.filter((record) => {
    const query = violationQuery.trim().toLowerCase();
    if (!query) return true;
    return [record.student_name, record.student_number, record.group_title, record.offense_variety, record.incident_description]
      .some((value) => String(value || '').toLowerCase().includes(query));
  });

  const updateSanctionDraft = (key, index, value) => {
    setSanctionDraft((previous) => ({
      ...previous,
      [key]: previous[key].map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, sanction: value } : rule
      ),
    }));
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
        <h1>Rule Management</h1>
        <p>Review handbook rules, update sanctions, and maintain incident records</p>

        <div className="rm-tabs" role="tablist" aria-label="Rule and violation management">
          <button type="button" role="tab" aria-selected={activePanel === 'browse'} className={activePanel === 'browse' ? 'active' : ''} onClick={() => setActivePanel('browse')}>Handbook</button>
          <button type="button" role="tab" aria-selected={activePanel === 'rules'} className={activePanel === 'rules' ? 'active' : ''} onClick={() => setActivePanel('rules')}>Update Rules</button>
          <button type="button" role="tab" aria-selected={activePanel === 'violations'} className={activePanel === 'violations' ? 'active' : ''} onClick={() => setActivePanel('violations')}>Update Violations</button>
        </div>

        {panelMessage && <p className="rm-panel-message" role="status">{panelMessage}</p>}
        {panelError && <p className="rm-panel-error" role="alert">{panelError}</p>}

        {activePanel === 'browse' && <>
        {/* Search and Filters Bar */}
        <div className="rm-filter-bar">
          <div className="rm-search-wrap">
            <svg className="rm-search-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input 
              type="text" 
              placeholder="Search violations or categories..." 
              value={tempSearchQuery}
              onChange={(e) => setTempSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplyFilters();
                }
              }}
            />
          </div>

          <div className="rm-filters">
            <div className="rm-filter-item">
              <label>Offense Type</label>
              <select value={tempType} onChange={(e) => {
                setTempType(e.target.value);
                setTempSubcategory('all');
                setTempCategoryFilter('all');
              }}>
                <option value="all">All Types</option>
                <option value="minor">Minor Offenses</option>
                <option value="major">Major Offenses</option>
              </select>
            </div>

            <div className="rm-filter-item">
              <label>Severity</label>
              <select value={tempSubcategory || 'all'} onChange={(e) => {
                setTempSubcategory(e.target.value);
                setTempCategoryFilter('all');
              }}>
                <option value="all">All Severities</option>
                {SEVERITY_OPTIONS.filter(s => tempType === 'all' || s.category === tempType).map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="rm-filter-item">
              <label>Category</label>
              <select value={tempCategoryFilter} onChange={(e) => setTempCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="rm-filter-item">
              <label>&nbsp;</label>
              <button className="rm-apply-btn" onClick={handleApplyFilters}>
                Apply
              </button>
            </div>
          </div>
        </div>



        {/* Offense Groups */}
        <div className="rm-groups">
          {filteredGroups.length === 0 ? (
            <div className="rm-empty">No offenses found matching your current filters.</div>
          ) : (
            filteredGroups.map(group => {
              const isExpanded = expandedGroup === group.handbookNumber;
              const subColors = SUBCATEGORY_COLORS[group.subcategoryId] || {};
              return (
                <div className={`rm-group${isExpanded ? ' rm-group--open' : ''}`} key={`${group.categoryId}-${group.subcategoryId}-${group.handbookNumber}`}>
                  <button className="rm-group-header" onClick={() => toggleGroup(group.handbookNumber)}>
                    <div className="rm-group-left">
                      <span className="rm-group-number" style={{ background: subColors.bg, color: subColors.color, border: `1px solid ${subColors.border}` }}>
                        {group.handbookNumber}
                      </span>
                      <div>
                        <h3 className="rm-group-title">{group.groupTitle}</h3>
                        <span className="rm-group-meta">{group.offenses.length} specific violations</span>
                      </div>
                    </div>
                    <div className="rm-group-right">
                      <span className="rm-group-badge" style={{ background: subColors.bg, color: subColors.color, border: `1px solid ${subColors.border}` }}>
                        {SUBCATEGORY_LABELS[group.subcategoryId]}
                      </span>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="rm-group-body">
                      <table className="rm-offense-table">
                        <thead>
                          <tr>
                            <th style={{ width: '50px' }}>#</th>
                            <th>Violation</th>
                            {activeType === 'minor' && (
                              <>
                                <th>1st Offense</th>
                                <th>2nd Offense</th>
                                <th>3rd Offense</th>
                              </>
                            )}
                            {activeType === 'major' && (
                              <>
                                <th>Score 1–3</th>
                                <th>Score 4–6</th>
                                <th>Score 7–8</th>
                                <th>Score 9–10</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {group.offenses.map((offense, idx) => (
                            <tr key={offense.id}>
                              <td className="rm-offense-idx">{idx + 1}</td>
                              <td className="rm-offense-title">{offense.title}</td>
                              {activeType === 'minor' && currentType?.sanctionSchedule?.map((s) => (
                                <td key={s.offenseNumber} className="rm-sanction-cell">{s.sanction}</td>
                              ))}
                              {activeType === 'major' && currentType?.severitySanctionMap?.map((s, i) => (
                                <td key={i} className="rm-sanction-cell">{s.sanction}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        </>}

        {activePanel === 'rules' && (
          <form className="rm-editor-panel" onSubmit={saveSanctionRules}>
            <div className="rm-editor-heading">
              <div><h2>Sanction Rules</h2><p>Saved values apply to new recommendations. Existing case records are not rewritten.</p></div>
              <button className="rm-apply-btn rm-save-btn" type="submit" disabled={savingPanel}><Save size={16} /> {savingPanel ? 'Saving...' : 'Save Rules'}</button>
            </div>
            <h3>Minor offense schedule</h3>
            <div className="rm-sanction-edit-grid">
              {sanctionDraft.minorSanctionSchedule.map((rule, index) => (
                <label key={rule.offenseNumber}>
                  <span>{rule.label}</span>
                  <textarea rows="3" required value={rule.sanction} onChange={(event) => updateSanctionDraft('minorSanctionSchedule', index, event.target.value)} />
                </label>
              ))}
            </div>
            <h3>Major offense severity map</h3>
            <div className="rm-sanction-edit-grid rm-major-edit-grid">
              {sanctionDraft.majorSeveritySanctionMap.map((rule, index) => (
                <label key={rule.min}>
                  <span>Severity {rule.min}–{rule.max}</span>
                  <textarea rows="3" required value={rule.sanction} onChange={(event) => updateSanctionDraft('majorSeveritySanctionMap', index, event.target.value)} />
                </label>
              ))}
            </div>
          </form>
        )}

        {activePanel === 'violations' && (
          <section className="rm-editor-panel">
            <div className="rm-editor-heading">
              <div><h2>Incident Records</h2><p>Edit report details or the saved sanction/status. Each student record is updated separately.</p></div>
              <input className="rm-violation-search" type="search" placeholder="Search student or incident" value={violationQuery} onChange={(event) => setViolationQuery(event.target.value)} />
            </div>
            <div className="rm-violation-table-wrap">
              <table className="rm-violation-table">
                <thead><tr><th>Date</th><th>Student</th><th>Incident</th><th>Status</th><th aria-label="Actions"></th></tr></thead>
                <tbody>{filteredViolationRows.map((record) => (
                  <tr key={record.id}>
                    <td>{record.incident_date || '—'}</td>
                    <td>{record.student_name || record.student_number || 'Unknown'}</td>
                    <td>{record.offense_variety || record.group_title || 'Unspecified'}</td>
                    <td>{record.status || 'recorded'}</td>
                    <td><button type="button" className="rm-edit-btn" onClick={() => { setEditingViolation({ ...record }); setPanelError(''); }}><Pencil size={14} /> Edit</button></td>
                  </tr>
                ))}</tbody>
              </table>
              {filteredViolationRows.length === 0 && <p className="rm-empty">No incident records match this search.</p>}
            </div>
          </section>
        )}

        {editingViolation && (
          <div className="rm-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingViolation(null); }}>
            <form className="rm-edit-modal" onSubmit={saveViolation}>
              <div className="rm-editor-heading"><div><h2>Edit Incident Record</h2><p>{editingViolation.student_name || 'Unknown student'} · {editingViolation.id}</p></div><button type="button" className="rm-modal-close" aria-label="Close" onClick={() => setEditingViolation(null)}>×</button></div>
              <div className="rm-edit-fields">
                <label>Date of incident<input type="date" value={editingViolation.incident_date || ''} onChange={(event) => setEditingViolation({ ...editingViolation, incident_date: event.target.value })} /></label>
                <label>Offense group<input value={editingViolation.group_title || editingViolation.category_name || ''} onChange={(event) => setEditingViolation({ ...editingViolation, group_title: event.target.value })} /></label>
                <label className="rm-edit-field-full">Specific violation<input value={editingViolation.offense_variety || ''} onChange={(event) => setEditingViolation({ ...editingViolation, offense_variety: event.target.value })} /></label>
                <label>Reported by<input value={editingViolation.reported_by || ''} onChange={(event) => setEditingViolation({ ...editingViolation, reported_by: event.target.value })} /></label>
                <label>Reporter role<select value={editingViolation.reporter_role || ''} onChange={(event) => setEditingViolation({ ...editingViolation, reporter_role: event.target.value })}><option value="">Unspecified</option><option value="staff">Staff</option><option value="teacher">Teacher</option><option value="student">Student</option><option value="parent">Parent / Guardian</option><option value="other">Other</option></select></label>
                <label>Reporter contact<input value={editingViolation.reporter_contact || ''} onChange={(event) => setEditingViolation({ ...editingViolation, reporter_contact: event.target.value })} /></label>
                <label>Status<select value={editingViolation.status || 'recorded'} onChange={(event) => setEditingViolation({ ...editingViolation, status: event.target.value })}><option value="recorded">Recorded</option><option value="pending">Pending</option><option value="served">Served</option><option value="resolved">Resolved through mediation</option><option value="no-readmission">No-readmission</option></select></label>
                <label className="rm-edit-field-full">Incident description<textarea rows="4" value={editingViolation.incident_description || ''} onChange={(event) => setEditingViolation({ ...editingViolation, incident_description: event.target.value })} /></label>
                <label className="rm-edit-field-full">Witnesses<textarea rows="3" value={editingViolation.witnesses || ''} onChange={(event) => setEditingViolation({ ...editingViolation, witnesses: event.target.value })} /></label>
                <label className="rm-edit-field-full">Recommended sanction<textarea rows="3" value={editingViolation.recommended_sanction || ''} onChange={(event) => setEditingViolation({ ...editingViolation, recommended_sanction: event.target.value })} /></label>
              </div>
              <div className="rm-modal-actions"><button type="button" className="rm-modal-cancel" onClick={() => setEditingViolation(null)}>Cancel</button><button className="rm-apply-btn" type="submit" disabled={savingPanel}><Save size={16} /> {savingPanel ? 'Saving...' : 'Save Changes'}</button></div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
