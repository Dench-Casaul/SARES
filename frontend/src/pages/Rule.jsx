import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '../css/Rule.css'
import wesleyLogo from '../assets/wesley-logo.png'
import { LayoutDashboard, Users, ClipboardList, ShieldCheck, BarChart3, LogOut, Menu, X, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import handbook from '../data/generalizedHandbook.json'

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

  const handleApplyFilters = () => {
    setActiveType(tempType);
    setActiveSubcategory(tempSubcategory);
    setCategoryFilter(tempCategoryFilter);
    setSearchQuery(tempSearchQuery);
  };

  // Reactively auto-reset subcategory and category dropdowns when their available choices change
  useEffect(() => {
    // 1. Reset severity if it's no longer valid under tempType
    if (tempType !== 'all') {
      const allowedSeverityIds = SEVERITY_OPTIONS.filter(s => s.category === tempType).map(s => s.id);
      if (tempSubcategory && tempSubcategory !== 'all' && !allowedSeverityIds.includes(tempSubcategory)) {
        setTempSubcategory('all');
        return;
      }
    }

    // 2. Reset category filter if the currently selected one is no longer in available categories
    const allowedCategories = [...new Set(
      handbook.offenseGroups
        .filter(g => {
          const matchType = tempType === 'all' || g.categoryId === tempType;
          const matchSub = !tempSubcategory || tempSubcategory === 'all' || g.subcategoryId === tempSubcategory;
          return matchType && matchSub;
        })
        .map(g => g.groupTitle)
    )];
    if (tempCategoryFilter !== 'all' && !allowedCategories.includes(tempCategoryFilter)) {
      setTempCategoryFilter('all');
    }
  }, [tempType, tempSubcategory, tempCategoryFilter]);

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

  // Get all unique categories for dropdown
  const allCategories = [...new Set(handbook.offenseGroups.map(g => g.groupTitle))].sort();

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
        <p>Browse the complete handbook of offenses, classifications, and sanctions</p>

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
              }}>
                <option value="all">All Types</option>
                <option value="minor">Minor Offenses</option>
                <option value="major">Major Offenses</option>
              </select>
            </div>

            <div className="rm-filter-item">
              <label>Severity</label>
              <select value={tempSubcategory || 'all'} onChange={(e) => setTempSubcategory(e.target.value)}>
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
                            <th style={{ width: '80px' }}>Illegal</th>
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
                              <td>
                                {offense.isIllegal ? (
                                  <span className="rm-illegal-badge">
                                    <AlertTriangle size={10} /> Yes
                                  </span>
                                ) : (
                                  <span className="rm-legal-badge">No</span>
                                )}
                              </td>
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
      </main>
    </div>
  );
}
