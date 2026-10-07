import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDocs, increment, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthProfile } from '../authContext'
import { queryForUserScope } from '../firestoreAccess'
import { canAccessSchoolScope, getSchoolScopeForYear } from '../schoolScope'
import { doesViolationCount, evaluateSaresRecommendation, isViolationServed } from '../engine/ruleEngine'
import '../css/Student.css'
import wesleyLogo from '../assets/wesley-logo.png'
import { Activity, LayoutDashboard, Users, ClipboardList, ShieldCheck, BarChart3, LogOut, Menu, X, Calendar, Download, KeyRound } from 'lucide-react'
import { getSubcategories, listOffenseGroups, listOffensesByGroup } from '../data/handbookIndex'
import { ACTIVITY_ACTIONS, recordActivity } from '../activityLog'

const normalizeViolationStatus = (status) => {
  const normalized = String(status || '').toLowerCase().trim();
  if (normalized === 'no-readmission') return 'no-readmission';
  return normalized === 'served' ? 'served' : 'pending';
};

const isNoReadmissionSanction = (sanctionText) =>
  String(sanctionText || '').toLowerCase().includes('no-readmission');

const YEARS = ["All Year", "Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade"]
const YEAR_LEVELS = ["Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade"]

const splitStudentName = (fullName = '') => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' ') || '',
  }
}
/* sidebar */
function Sidebar({ activePage, isOpen, toggleSidebar }) {
  const navigate = useNavigate();
  const { userProfile } = useAuthProfile();

  const handleLogout = async () => {
    await recordActivity(userProfile, ACTIVITY_ACTIONS.LOGOUT, 'session');
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
              to="/sares/account"
              onClick={toggleSidebar}
              className={`s-nav-item${activePage === "/sares/account" ? " s-nav-item--active" : ""}`}
            >
              <KeyRound className="s-nav-icon" />
              <span>Account Security</span>
            </Link>
          </li>
          {userProfile?.role === 'superadmin' && (
            <li>
              <Link
                to="/sares/system-logs"
                onClick={toggleSidebar}
                className={`s-nav-item${activePage === "/sares/system-logs" ? " s-nav-item--active" : ""}`}
              >
                <Activity className="s-nav-icon" />
                <span>System Logs</span>
              </Link>
            </li>
          )}
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
  const initialNameParts = (initialForm?.name || '').trim().split(/\s+/).filter(Boolean);

  const [form, setForm] = useState({
    id: initialForm?.id || '',
    first_name: initialForm?.first_name || initialNameParts[0] || '',
    middle_name: initialForm?.middle_name || '',
    last_name: initialForm?.last_name || initialNameParts.slice(1).join(' ') || '',
    year: initialForm?.year || '',
    section: initialForm?.section || '',
    email: initialForm?.email || '',
    phone: initialForm?.phone || '',
  });

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    const fullName = [form.first_name, form.middle_name, form.last_name]
      .map((name) => String(name || '').trim())
      .filter(Boolean)
      .join(' ');
    if (!form.first_name || !form.last_name || !form.year || !form.section || !form.email) return;
    await onAdd({ ...form, name: fullName });
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

          <div className="s-field-row s-field-row--name">
            <div className="s-field">
              <label className="s-label">First Name</label>
              <input className="s-input" name="first_name" value={form.first_name} onChange={handle} placeholder="Juan" />
            </div>
            <div className="s-field">
              <label className="s-label">Middle Name (Optional)</label>
              <input className="s-input" name="middle_name" value={form.middle_name} onChange={handle} placeholder="Santos" />
            </div>
            <div className="s-field">
              <label className="s-label">Last Name</label>
              <input className="s-input" name="last_name" value={form.last_name} onChange={handle} placeholder="Dela Cruz" />
            </div>
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

function AddViolationModal({ onClose, onSubmit, initialForm }) {
  const [form, setForm] = useState({
    offense_type: initialForm?.offense_type || '',
    subcategory_id: initialForm?.subcategory_id || '',
    group_number: initialForm?.group_number ? String(initialForm.group_number) : '',
    offense_id: initialForm?.offense_id || '',
    offense_title: initialForm?.offense_title || '',
    group_title: initialForm?.group_title || '',
    severity_score: initialForm?.severity_score ?? 5,
    handling_path: initialForm?.handling_path || 'sanction',
    incident_description: initialForm?.incident_description || '',
  });

  const subcategories = form.offense_type ? getSubcategories(form.offense_type) : [];
  const offenseGroups = (form.offense_type && form.subcategory_id)
    ? listOffenseGroups(form.offense_type, form.subcategory_id)
    : [];

  const handleOffenseType = (value) => {
    setForm((prev) => ({
      ...prev,
      offense_type: value,
      subcategory_id: '',
      group_number: '',
      offense_id: '',
      offense_title: '',
      group_title: '',
    }));
  };

  const handleSubcategory = (value) => {
    setForm((prev) => ({
      ...prev,
      subcategory_id: value,
      group_number: '',
      offense_id: '',
      offense_title: '',
      group_title: '',
    }));
  };

  const handleViolation = (value) => {
    const matchedGroup = offenseGroups.find((group) =>
      listOffensesByGroup(form.offense_type, form.subcategory_id, group.handbookNumber)
        .some((offense) => offense.id === value)
    );
    const selected = matchedGroup
      ? listOffensesByGroup(form.offense_type, form.subcategory_id, matchedGroup.handbookNumber)
          .find((offense) => offense.id === value)
      : null;
    setForm((prev) => ({
      ...prev,
      offense_id: value,
      offense_title: selected?.title || '',
      group_number: matchedGroup ? String(matchedGroup.handbookNumber) : '',
      group_title: matchedGroup?.groupTitle || '',
    }));
  };

  const submit = () => {
    if (form.offense_type === 'major' && (!form.severity_score || Number(form.severity_score) < 1 || Number(form.severity_score) > 10)) return;
    if (!form.offense_type || !form.subcategory_id || !form.offense_id || !form.incident_description.trim()) return;
    onSubmit({
      ...form,
      group_number: Number(form.group_number),
      severity_score: form.offense_type === 'major' ? Number(form.severity_score) : null,
      incident_description: form.incident_description.trim(),
    });
  };

  return (
    <div className="s-modal-backdrop" onClick={onClose}>
      <div className="s-modal" onClick={(e) => e.stopPropagation()}>
        <div className="s-modal-header">
          <div>
            <h2 className="s-modal-title">Add Violation</h2>
            <p className="s-modal-sub">Start logging a violation for this student</p>
          </div>
          <button className="s-modal-close" onClick={onClose}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="s-modal-body">
          <div className="s-field">
            <label className="s-label">Offense Type</label>
            <select className="s-input s-select" value={form.offense_type} onChange={(e) => handleOffenseType(e.target.value)}>
              <option value="">Select</option>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
            </select>
          </div>

          <div className="s-field">
            <label className="s-label">Subcategory</label>
            <select
              className="s-input s-select"
              value={form.subcategory_id}
              onChange={(e) => handleSubcategory(e.target.value)}
              disabled={!form.offense_type}
            >
              <option value="">Select</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>{subcategory.label}</option>
              ))}
            </select>
          </div>

          <div className="s-field">
            <label className="s-label">Violation</label>
            <select
              className="s-input s-select"
              value={form.offense_id}
              onChange={(e) => handleViolation(e.target.value)}
              disabled={!form.subcategory_id}
            >
              <option value="">Select violation</option>
              {offenseGroups.map((group) => (
                <optgroup key={group.handbookNumber} label={group.groupTitle}>
                  {listOffensesByGroup(form.offense_type, form.subcategory_id, group.handbookNumber).map((offense) => (
                    <option key={offense.id} value={offense.id}>{offense.title}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {form.offense_type === 'major' && (
            <div className="s-field">
              <label className="s-label">Severity Score (1-10)</label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                className="s-input"
                value={form.severity_score}
                onChange={(e) => setForm((prev) => ({ ...prev, severity_score: Number(e.target.value) }))}
              />
              <div className="s-modal-sub">Selected score: <strong>{form.severity_score}</strong></div>
            </div>
          )}

          <div className="s-field">
            <label className="s-label">Handling Path</label>
            <select
              className="s-input s-select"
              value={form.handling_path}
              onChange={(e) => setForm((prev) => ({ ...prev, handling_path: e.target.value }))}
            >
              <option value="sanction">Proceed with sanction recommendation</option>
              <option value="mediation">Route to mediation first</option>
            </select>
            {form.handling_path === 'mediation' && (
              <p className="s-modal-sub">This case will be saved as pending mediation.</p>
            )}
          </div>

          <div className="s-field">
            <label className="s-label">Description</label>
            <textarea
              className="s-input"
              rows={4}
              placeholder="Describe what happened..."
              value={form.incident_description}
              onChange={(e) => setForm((prev) => ({ ...prev, incident_description: e.target.value }))}
            />
          </div>
        </div>

        <div className="s-modal-footer">
          <button className="s-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="s-btn-submit" onClick={submit}>Continue</button>
        </div>
      </div>
    </div>
  );
}

function SuspensionDateModal({ initialStart, initialEnd, onClose, onSave, saving }) {
  const [startDate, setStartDate] = useState(initialStart || '');
  const [endDate, setEndDate] = useState(initialEnd || '');
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  const openDatePicker = (inputRef) => {
    if (!inputRef?.current) return;
    inputRef.current.focus();
    if (typeof inputRef.current.showPicker === 'function') {
      inputRef.current.showPicker();
    }
  };

  const handleSubmit = () => {
    if (!startDate || !endDate) return;
    if (new Date(endDate).getTime() < new Date(startDate).getTime()) return;
    onSave(startDate, endDate);
  };

  return (
    <div className="s-modal-backdrop" onClick={onClose}>
      <div className="s-modal" onClick={(e) => e.stopPropagation()}>
        <div className="s-modal-header">
          <div>
            <h2 className="s-modal-title">Set Suspension Date</h2>
            <p className="s-modal-sub">Select the start and end dates of suspension</p>
          </div>
          <button className="s-modal-close" onClick={onClose}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="s-modal-body">
          <div className="s-field">
            <label className="s-label">Suspension Start</label>
            <div className="s-date-input-wrap">
              <input ref={startInputRef} type="date" className="s-input s-input--date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <button type="button" className="s-date-icon-btn" onClick={() => openDatePicker(startInputRef)} aria-label="Open suspension start date picker">
                <Calendar size={16} />
              </button>
            </div>
          </div>
          <div className="s-field">
            <label className="s-label">Suspension End</label>
            <div className="s-date-input-wrap">
              <input ref={endInputRef} type="date" className="s-input s-input--date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              <button type="button" className="s-date-icon-btn" onClick={() => openDatePicker(endInputRef)} aria-label="Open suspension end date picker">
                <Calendar size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="s-modal-footer">
          <button className="s-btn-cancel" onClick={onClose}>Back</button>
          <button className="s-btn-submit" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Save Suspension'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CaseManagementModal({ student, violationDraft, onClose, onSaved }) {
  const { userProfile } = useAuthProfile();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!student || !violationDraft) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const violationsSnapshot = await getDocs(queryForUserScope(collection(db, 'violations'), userProfile));
      const existingViolations = violationsSnapshot.docs.map((violationDoc) => ({
        id: violationDoc.id,
        ...violationDoc.data(),
      }));

      const recommendation = evaluateSaresRecommendation({
        offenseType: violationDraft.offense_type,
        offenseId: violationDraft.offense_id,
        studentId: student.docId,
        incidentDate: today,
        severityScore: violationDraft.offense_type === 'major' ? Number(violationDraft.severity_score || 5) : 5,
        existingViolations,
      });

      const recommendedSanction = recommendation?.recommendedSanction || 'No recommendation available.';
      const counselorExplanation = `Based on the recorded incident, this case is classified as ${violationDraft?.group_title || 'Unspecified Category'} (${violationDraft?.offense_title || 'Unspecified Violation'}). The recommended sanction is ${recommendedSanction}. This entry is for counselor review and may be refined after due process.`;
      const isMediation = violationDraft.handling_path === 'mediation';

      const payload = {
        student_id: student.docId,
        student_name: student.name,
        student_number: student.id || '',
        year_level: student.year || '',
        school_scope: student.school_scope,
        incident_date: today,
        incident_description: violationDraft.incident_description,
        offense_type: violationDraft.offense_type,
        intervention_type: isMediation ? 'mediation' : 'sanction',
        mediation_status: isMediation ? 'pending' : null,
        subcategory_id: violationDraft.subcategory_id,
        group_number: violationDraft.group_number,
        group_title: violationDraft.group_title,
        offense_id: violationDraft.offense_id,
        offense_variety: violationDraft.offense_title,
        category_name: violationDraft.group_title,
        offense_number: violationDraft.offense_type === 'minor' ? recommendation?.cumulativeOffenseNumber || recommendation?.offenseNumber || 1 : null,
        cumulative_offense_number: violationDraft.offense_type === 'minor' ? recommendation?.cumulativeOffenseNumber || recommendation?.offenseNumber || 1 : null,
        suspension_eligible: violationDraft.offense_type === 'minor' ? Boolean(recommendation?.suspensionEligible) : false,
        severity_score: violationDraft.offense_type === 'major' ? Number(violationDraft.severity_score || 5) : null,
        recommended_sanction: recommendedSanction,
        generated_explanation: counselorExplanation,
        explanation_source: 'manual_template',
        school_year_key: recommendation?.schoolYearKey || '',
        status: isMediation ? 'pending' : isNoReadmissionSanction(recommendedSanction) ? 'no-readmission' : 'recorded',
        created_at: serverTimestamp(),
      };

      const savedViolation = await addDoc(collection(db, 'violations'), payload);
      await recordActivity(userProfile, ACTIVITY_ACTIONS.VIOLATION_RECORDED, 'violation', savedViolation.id);

      const studentViolationEntry = {
        id: `${Date.now()}`,
        recorded_at_ms: Date.now(),
        category: violationDraft.group_title,
        variety: violationDraft.offense_title,
        description: violationDraft.incident_description,
        date: today,
        offense_number: violationDraft.offense_type === 'minor' ? recommendation?.cumulativeOffenseNumber || recommendation?.offenseNumber || 1 : null,
        cumulative_offense_number: violationDraft.offense_type === 'minor' ? recommendation?.cumulativeOffenseNumber || recommendation?.offenseNumber || 1 : null,
        suspension_eligible: violationDraft.offense_type === 'minor' ? Boolean(recommendation?.suspensionEligible) : false,
        severity: violationDraft.offense_type === 'major' ? Number(violationDraft.severity_score || 5) : 3,
        sanction: recommendedSanction,
        generated_explanation: counselorExplanation,
        intervention_type: isMediation ? 'mediation' : 'sanction',
        mediation_status: isMediation ? 'pending' : null,
        status: isMediation ? 'pending' : isNoReadmissionSanction(recommendedSanction) ? 'no-readmission' : 'recorded',
      };

      await updateDoc(doc(db, 'students', student.docId), {
        violations: arrayUnion(studentViolationEntry),
        violation_count: increment(1),
        school_scope: student.school_scope,
      });
      await recordActivity(userProfile, ACTIVITY_ACTIONS.CASE_RECORDED, 'violation', savedViolation.id);
      await onSaved();
    } catch (error) {
      console.error('Failed to save case:', error);
      alert('Failed to save case management record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="s-modal-backdrop" onClick={onClose}>
      <div className="s-modal" onClick={(e) => e.stopPropagation()}>
        <div className="s-modal-header">
          <div>
            <h2 className="s-modal-title">Case Management</h2>
            <p className="s-modal-sub">Review and finalize this violation case</p>
          </div>
          <button className="s-modal-close" onClick={onClose}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="s-modal-body">
          <div className="s-field">
            <label className="s-label">Student</label>
            <input className="s-input" value={student?.name || ''} readOnly />
          </div>
          <div className="s-field-row">
            <div className="s-field">
              <label className="s-label">Offense Type</label>
              <input className="s-input" value={violationDraft?.offense_type || ''} readOnly />
            </div>
            <div className="s-field">
              <label className="s-label">Subcategory</label>
              <input className="s-input" value={violationDraft?.subcategory_id || ''} readOnly />
            </div>
          </div>
          <div className="s-field">
            <label className="s-label">Violation</label>
            <input className="s-input" value={violationDraft?.offense_title || ''} readOnly />
          </div>
          <div className="s-field">
            <label className="s-label">Recommended Sanction</label>
            <textarea className="s-input" rows={3} value="Will be generated from Rule Management on save." readOnly />
          </div>
        </div>

        <div className="s-modal-footer">
          <button className="s-btn-cancel" onClick={onClose}>Back</button>
          <button className="s-btn-submit" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Case'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Student List View */
function StudentList({ students, onSelect, onAddStudent, onEditStudent, location, sidebarOpen, setSidebarOpen }) {
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('All Year');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);
  const [toast, setToast] = useState(false);

  const filtered = students.filter((s) => {
    const studentName = String(s?.name || '').toLowerCase();
    const studentId = String(s?.id || '');

    const matchSearch =
      studentName.includes(search.toLowerCase()) ||
      studentId.includes(search);
    const matchYear = yearFilter === 'All Year' || s.year === yearFilter;
    return matchSearch && matchYear;
  });

  const getStudentStatus = (student) => {
    const violations = Array.isArray(student?.violations) ? student.violations : [];
    if (violations.length === 0) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const isSuspended = violations.some((violation) => {
      if (!violation?.suspension_start || !violation?.suspension_end) return false;
      const start = new Date(violation.suspension_start);
      const end = new Date(violation.suspension_end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
      return today >= startDay && today <= endDay;
    });

    if (isSuspended) return { text: 'In Suspension', tone: 'follow' };

    const pendingMediationCount = violations.filter((violation) =>
      String(violation?.status || '').toLowerCase() === 'pending' &&
      String(violation?.intervention_type || '').toLowerCase() === 'mediation'
    ).length;
    if (pendingMediationCount > 0) {
      return { text: `${pendingMediationCount} Pending Mediation${pendingMediationCount > 1 ? 's' : ''}`, tone: 'monitored' };
    }

    const pendingCount = violations.filter((violation) =>
      !isViolationServed(violation) && normalizeViolationStatus(violation?.status) === 'pending'
    ).length;
    if (pendingCount > 0) {
      return { text: `${pendingCount} Pending Sanction${pendingCount > 1 ? 's' : ''}`, tone: 'monitored' };
    }

    return { text: 'Served', tone: 'good' };
  };

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
    await onDeleteStudent(student.docId || student.student_id || student.id);
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
                  <th>First Name</th>
                  <th>Middle Name</th>
                  <th>Last Name</th>
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
                    <td>{student.first_name || ''}</td>
                    <td>{student.middle_name || ''}</td>
                    <td>{student.last_name || ''}</td>
                    <td>{student.id}</td>
                    <td>{student.year} - {student.section}</td>
                    <td>{student.violationCount}</td>
                    <td>{(() => {
                      const status = getStudentStatus(student);
                      if (!status) return null;
                      return <span className={`s-status-pill ${status.tone}`}>{status.text}</span>;
                    })()}</td>
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
            first_name: editingStudent.first_name,
            middle_name: editingStudent.middle_name,
            last_name: editingStudent.last_name,
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
function StudentProfile({ student, onBack, onSelectViolation, onUpdateViolationStatus, location, sidebarOpen, setSidebarOpen }) {
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [violationDraft, setViolationDraft] = useState(null);

  const handleViolationSubmit = (payload) => {
    setViolationDraft(payload);
    setShowViolationModal(false);
    setShowCaseModal(true);
  };

  const handleCaseSaved = async () => {
    setShowCaseModal(false);
    setViolationDraft(null);
    window.location.reload();
  };

  const handleBackToViolationModal = () => {
    setShowCaseModal(false);
    setShowViolationModal(true);
  };

  const getOffenseOrdinalLabel = (offenseNumber) => {
    const number = Number(offenseNumber || 0);
    if (!Number.isFinite(number) || number <= 0) return "";

    const suffixes = ["th", "st", "nd", "rd"];
    const remainder = number % 100;
    const suffix = suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0];
    return `${number}${suffix} offense`;
  };

  const sortedViolations = [...(student?.violations || [])].sort((a, b) => {
    const timeA = a?.created_at?.seconds
      ? a.created_at.seconds * 1000
      : (a?.date ? new Date(a.date).getTime() : 0);
    const timeB = b?.created_at?.seconds
      ? b.created_at.seconds * 1000
      : (b?.date ? new Date(b.date).getTime() : 0);
    return timeB - timeA;
  });

  useEffect(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    sortedViolations.forEach((violation) => {
      if (!violation?.suspension_end) return;
      const end = new Date(violation.suspension_end);
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
      const currentStatus = String(violation.status || '').toLowerCase();

      if (todayStart > endDay && currentStatus !== 'served') {
        onUpdateViolationStatus(violation.id, 'served');
      }
    });
  }, [sortedViolations, onUpdateViolationStatus]);

  const getBusinessDaysLeft = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    const current = new Date(Math.max(start.getTime(), new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()));
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    if (current.getTime() > endDay.getTime()) return 0;

    let count = 0;
    const cursor = new Date(current);
    while (cursor.getTime() <= endDay.getTime()) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) count += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
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
        </div>

        <div className="s-profile-grid">
          {/* Student Info */}
          <div className="s-info-card">
            <h2 className="s-card-title">Student Information</h2>

            <div className="s-info-field">
              <span className="s-info-label">First Name</span>
              <span className="s-info-value">{student.first_name || ''}</span>
            </div>
            <div className="s-divider" />

            <div className="s-info-field">
              <span className="s-info-label">Middle Name</span>
              <span className="s-info-value">{student.middle_name || ''}</span>
            </div>
            <div className="s-divider" />

            <div className="s-info-field">
              <span className="s-info-label">Last Name</span>
              <span className="s-info-value">{student.last_name || ''}</span>
            </div>
            <div className="s-divider" />

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

            {sortedViolations.length === 0 ? (
              <div className="s-empty">No violations recorded.</div>
            ) : (
              <div className="s-history-list">
                {sortedViolations.map(v => (
                  <div
                    key={v.id}
                    className={`s-history-item ${String(v.offense_type || '').toLowerCase() === 'major' ? 's-history-item--major' : ''}`}
                    onClick={() => onSelectViolation(v)}
                  >
                    <div className="s-history-item-header">
                      <span className="s-history-category">
                        {v.category}{(() => {
                          const offenseNumber = Number(v.cumulative_offense_number ?? v.offense_number ?? v.offenseNumber ?? 0);
                          const offenseLabel = getOffenseOrdinalLabel(offenseNumber);
                          return offenseLabel ? ` [${offenseLabel}]` : "";
                        })()}
                      </span>
                      {(() => {
                        const suspensionStarted = !!v.suspension_start && (new Date(v.suspension_start).getTime() <= new Date().getTime());
                        if (suspensionStarted) {
                          const daysLeft = getBusinessDaysLeft(v.suspension_start, v.suspension_end);
                          return (
                            <span className="s-suspension-left">
                              {daysLeft > 0 ? `${daysLeft} school day${daysLeft > 1 ? 's' : ''} left` : 'Suspension Completed'}
                            </span>
                          );
                        }
                        const isMediation = String(v.intervention_type || '').toLowerCase() === 'mediation';
                        const currentStatus = String(v.status || 'pending').toLowerCase();
                        if (isMediation) {
                          const mediationValue = currentStatus === 'resolved'
                            ? 'resolved'
                            : currentStatus === 'recorded' || String(v.mediation_status || '').toLowerCase() === 'proceeded_to_sanction'
                              ? 'recorded'
                              : 'pending';
                          return (
                            <select
                              className={`s-status-dropdown ${mediationValue === 'resolved' ? 's-status-dropdown--served' : 's-status-dropdown--pending'}`}
                              value={mediationValue}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const value = e.target.value;
                                onUpdateViolationStatus(v.id, value, {
                                  mediation_status: value === 'resolved' ? 'resolved' : value === 'recorded' ? 'proceeded_to_sanction' : 'pending',
                                });
                              }}
                            >
                              <option value="pending">Pending Mediation</option>
                              <option value="recorded">Proceed to Sanction</option>
                              <option value="resolved">Resolved Through Mediation</option>
                            </select>
                          );
                        }
                        if (String(v.status || '').toLowerCase() === 'no-readmission') {
                          return (
                            <span className="s-suspension-left" style={{ background: '#fee2e2', borderColor: '#fecaca', color: '#b91c1c' }}>
                              No-readmission
                            </span>
                          );
                        }
                        return (
                          <select
                            className={`s-status-dropdown ${(v.status || 'pending').toLowerCase() === 'served' ? 's-status-dropdown--served' : 's-status-dropdown--pending'}`}
                            value={(v.status || 'pending').toLowerCase() === 'served' ? 'served' : 'pending'}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => onUpdateViolationStatus(v.id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="served">Served</option>
                          </select>
                        );
                      })()}
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
                      {String(v.offense_type || '').toLowerCase() === 'major' && (
                        <span>
                          <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12" style={{ marginRight: 4, verticalAlign: 'middle' }}>
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Severity: {v.severity}/10
                        </span>
                      )}
                    </div>
                    {!(v.intervention_type === 'mediation' && (v.status === 'resolved' || v.mediation_status === 'resolved')) && (
                      <>
                        <div className="s-history-sanction-label">Final Sanction:</div>
                        <div className="s-history-sanction">{v.finalSanction || v.sanction}</div>
                      </>
                    )}
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
      {showViolationModal && (
        <AddViolationModal
          onClose={() => setShowViolationModal(false)}
          onSubmit={handleViolationSubmit}
          initialForm={violationDraft}
        />
      )}
      {showCaseModal && (
        <CaseManagementModal
          student={student}
          violationDraft={violationDraft}
          onClose={handleBackToViolationModal}
          onSaved={handleCaseSaved}
        />
      )}
    </div>
  );
}

/* Violation Details*/
function ViolationDetails({ violation, student, onBack, onSetSuspensionDates, suspensionSaving, location, sidebarOpen, setSidebarOpen }) {
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const canSetSuspension = String(violation?.offense_type || '').toLowerCase() === 'major'
    || Boolean(violation?.suspension_eligible)
    || Number(violation?.cumulative_offense_number || 0) > 3;

  const handleSaveSuspension = async (startDate, endDate) => {
    await onSetSuspensionDates(violation.id, startDate, endDate);
    setShowSuspensionModal(false);
  };

  const handleDownloadIncidentReport = async () => {
    const { generateIncidentReportPdf } = await import('../engine/incidentReportPdf');
    const reportCase = {
      ...violation,
      student_name: violation.student_name || student.name,
      student_number: violation.student_number || student.id,
      year_level: violation.year_level || student.year,
      student_contact: violation.student_contact || student.phone,
    };
    const groupMembers = (violation.group_members || [reportCase]).map((member) => ({
      ...member,
      student_contact: member.student_contact || (String(member.student_id) === String(student.docId) ? student.phone : ''),
    }));
    generateIncidentReportPdf(reportCase, groupMembers);
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
          <button type="button" className="s-btn-submit s-btn-submit--sm s-report-download-btn" onClick={handleDownloadIncidentReport}>
            <Download size={16} /> Download Incident Report PDF
          </button>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div className="s-vd-field-value">{violation.date}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="s-vd-field-label" style={{ marginBottom: 0 }}>Start:</span>
                    <span className="s-vd-field-value">{violation.suspension_start || 'Not set'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="s-vd-field-label" style={{ marginBottom: 0 }}>End:</span>
                    <span className="s-vd-field-value">{violation.suspension_end || 'Not set'}</span>
                  </div>
                </div>
              </div>
              {canSetSuspension && (
                <button className="s-btn-submit s-btn-submit--sm" style={{ marginTop: '10px' }} onClick={() => setShowSuspensionModal(true)}>
                  Set Suspension Date
                </button>
              )}
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
          <div className="s-divider" />

          {violation.witnesses && (
            <>
              <div className="s-vd-field s-vd-field--full">
                <div className="s-vd-field-label">Witnesses</div>
                <div className="s-vd-desc-box">{violation.witnesses}</div>
              </div>
              <div className="s-divider" />
            </>
          )}

          {violation.parent_contact_notes && (
            <>
              <div className="s-vd-field s-vd-field--full">
                <div className="s-vd-field-label">Parent/Guardian Involvement</div>
                <div className="s-vd-desc-box">{violation.parent_contact_notes}</div>
              </div>
              <div className="s-divider" />
            </>
          )}

          {!(violation.intervention_type === 'mediation' && (violation.status === 'resolved' || violation.mediation_status === 'resolved')) && (
            <>
              <div className="s-vd-field s-vd-field--full">
                <div className="s-vd-field-label">Recommended Sanction</div>
                <div className="s-vd-sanction-box">{violation.sanction}</div>
              </div>
              <div className="s-divider" />

              {(violation.generated_explanation || violation.explanation) && (
                <div className="s-vd-field s-vd-field--full">
                  <div className="s-vd-field-label">Counselor Explanation</div>
                  <div className="s-vd-desc-box">
                    {violation.generated_explanation || violation.explanation}
                  </div>
                </div>
              )}
            </>
          )}
          {violation.ai_assisted_solution && (
            <>
              <div className="s-divider" />
              <div className="s-vd-field s-vd-field--full">
                <div className="s-vd-field-label">AI-Assisted Prevention / Alternative Suggestion</div>
                <div className="s-vd-desc-box">{violation.ai_assisted_solution}</div>
                <div className="s-vd-field-label" style={{ marginTop: '8px' }}>
                  Source: {violation.ai_assisted_solution_source || 'Gemini'}. AI-generated guidance for counselor review; it does not replace school policy or professional judgment.
                </div>
              </div>
            </>
          )}
        </div>
        {showSuspensionModal && (
          <SuspensionDateModal
            initialStart={violation.suspension_start}
            initialEnd={violation.suspension_end}
            onClose={() => setShowSuspensionModal(false)}
            onSave={handleSaveSuspension}
            saving={suspensionSaving}
          />
        )}
      </div>
    </div>
  );
}

/* Students */
export default function Students() {
  const { userProfile } = useAuthProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [view, setView] = useState('list');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [suspensionSaving, setSuspensionSaving] = useState(false);

  const formatStudent = (student) => {
    const name = student.full_name || student.name || '';
    const { first_name, last_name } = splitStudentName(name);

    const initials = name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();

    const colors = ['#7b9dff', '#d96eff', '#5fe0b0', '#ffc85c', '#ff7864'];

    const rawViolationList = Array.isArray(student.violations)
      ? student.violations
      : Array.isArray(student.history)
        ? student.history
        : [];

    const toMs = (value) => {
      if (!value) return 0;
      if (typeof value?.toDate === 'function') return value.toDate().getTime();
      if (typeof value?.seconds === 'number') return value.seconds * 1000;
      const parsed = new Date(value).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const toNumeric = (value) => {
      const num = Number(value);
      return Number.isNaN(num) ? 0 : num;
    };

    const violationList = [...rawViolationList].sort((a, b) => {
      const timeA = toNumeric(a.recorded_at_ms) || toMs(a.created_at) || toMs(a.recorded_at) || toMs(a.incident_date) || toMs(a.date) || toNumeric(a.id);
      const timeB = toNumeric(b.recorded_at_ms) || toMs(b.created_at) || toMs(b.recorded_at) || toMs(b.incident_date) || toMs(b.date) || toNumeric(b.id);
      return timeB - timeA;
    });

    const violationCount = violationList.length > 0
      ? violationList.filter(doesViolationCount).length
      : typeof student.violation_count === 'number'
        ? student.violation_count
        : typeof student.violations === 'number'
          ? student.violations
          : 0;

    return {
      docId: student.student_id || '',
      id: student.student_number || student.id || '',
      name: name,
      first_name: student.first_name || first_name,
      middle_name: student.middle_name || '',
      last_name: student.last_name || last_name,
      initials: initials || 'S',
      color: colors[(student.student_id || 0) % colors.length],
      year: student.year_level || student.year || '',
      school_scope: student.school_scope || getSchoolScopeForYear(student.year_level || student.year),
      section: student.section || '',
      email: student.email || '',
      phone: student.phone_number || student.phone || '',
      violationCount,
      repeatOffender: student.repeat_offender || false,
      violations: violationList,
    };
  };

  const fetchStudents = async () => {
    try {
      const [studentsSnapshot, violationsSnapshot] = await Promise.all([
        getDocs(queryForUserScope(collection(db, 'students'), userProfile)),
        getDocs(queryForUserScope(collection(db, 'violations'), userProfile)),
      ]);

      const allViolations = violationsSnapshot.docs.map((violationDoc) => ({
        id: violationDoc.id,
        ...violationDoc.data(),
      }));

      const snapshot = studentsSnapshot;
      const data = snapshot.docs.map((studentDoc) => ({
        ...studentDoc.data(),
        student_id: studentDoc.id,
      }));

      const studentsWithLiveViolations = data.map((student) => {
        const mappedViolations = allViolations
          .filter((violation) => String(violation.student_id) === String(student.student_id))
          .sort((a, b) => {
            const timeA = a.created_at?.seconds ? a.created_at.seconds * 1000 : new Date(a.incident_date || 0).getTime();
            const timeB = b.created_at?.seconds ? b.created_at.seconds * 1000 : new Date(b.incident_date || 0).getTime();
            return timeB - timeA;
          })
          .map((violation) => {
            const groupRecords = violation.group_incident_id
              ? allViolations.filter((record) => record.group_incident_id === violation.group_incident_id)
              : [violation];
            const groupMembers = groupRecords.map((record) => {
              const recordStudent = data.find((item) => String(item.student_id) === String(record.student_id));
              return {
                ...record,
                student_name: record.student_name || recordStudent?.full_name || recordStudent?.name || '',
                student_number: record.student_number || recordStudent?.student_number || '',
                year_level: record.year_level || recordStudent?.year_level || recordStudent?.year || '',
                student_contact: recordStudent?.phone_number || recordStudent?.phone || '',
              };
            });
            const currentStudent = data.find((item) => String(item.student_id) === String(violation.student_id));
            return {
            ...violation,
            id: violation.id,
            category: violation.category_name || violation.group_title || 'Unspecified',
            variety: violation.offense_variety || violation.offense_id || 'Unspecified',
            description: violation.incident_description || violation.description || '',
            witnesses: violation.witnesses || '',
            student_name: violation.student_name || currentStudent?.full_name || currentStudent?.name || '',
            student_number: violation.student_number || currentStudent?.student_number || '',
            year_level: violation.year_level || currentStudent?.year_level || currentStudent?.year || '',
            student_contact: currentStudent?.phone_number || currentStudent?.phone || '',
            group_members: groupMembers,
            date: violation.incident_date || '',
            offense_type: violation.offense_type || '',
            severity: violation.severity_score ?? (violation.offense_type === 'major' ? 8 : 3),
            sanction: violation.recommended_sanction || 'N/A',
            generated_explanation: violation.generated_explanation || '',
            status: isNoReadmissionSanction(violation.recommended_sanction)
              ? 'no-readmission'
              : violation.status || 'recorded',
            intervention_type: violation.intervention_type || '',
            mediation_status: violation.mediation_status || '',
            offense_number: violation.offense_number ?? null,
            cumulative_offense_number: violation.cumulative_offense_number ?? violation.offense_number ?? null,
            suspension_eligible: Boolean(violation.suspension_eligible),
            suspension_start: violation.suspension_start || '',
            suspension_end: violation.suspension_end || '',
          };
          });

        return {
          ...student,
          violations: mappedViolations,
          violation_count: mappedViolations.filter(doesViolationCount).length,
        };
      });

      setStudents(studentsWithLiveViolations.map(formatStudent));
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  useEffect(() => {
    if (userProfile) fetchStudents();
  }, [userProfile]);

  useEffect(() => {
    if (location.state?.openStudentId && students.length > 0) {
      const target = students.find(s => s.docId === location.state.openStudentId);
      if (target) {
        setSelectedStudent(target);
        setView('profile');
        // clear state
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [students, location.state, navigate]);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setView('profile');
  };

  const handleSelectViolation = (violation) => {
    setSelectedViolation(violation);
    setView('violation');
  };

  const handleAddStudent = async (form) => {
    const studentData = {
      student_id: '',
      student_number: form.id,
      first_name: form.first_name.trim(),
      middle_name: form.middle_name.trim(),
      last_name: form.last_name.trim(),
      full_name: form.name,
      year_level: form.year,
      school_scope: getSchoolScopeForYear(form.year),
      section: form.section,
      email: form.email,
      phone_number: form.phone,
      violation_count: 0,
      violations: [],
      repeat_offender: false,
    };

    try {
      const newStudentRef = await addDoc(collection(db, 'students'), studentData);
      await recordActivity(userProfile, ACTIVITY_ACTIONS.STUDENT_CREATED, 'student', newStudentRef.id);
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
    const existingStudent = students.find((student) => student.docId === docId);
    const previousScope = existingStudent?.school_scope || getSchoolScopeForYear(existingStudent?.year);
    const nextScope = getSchoolScopeForYear(form.year);
    if (!canAccessSchoolScope(userProfile, nextScope)) {
      window.alert('You cannot move this student to a different school level. Contact the superadmin.');
      return;
    }
    const payload = {
      student_number: form.id,
      first_name: form.first_name.trim(),
      middle_name: form.middle_name.trim(),
      last_name: form.last_name.trim(),
      full_name: form.name,
      year_level: form.year,
      school_scope: nextScope,
      section: form.section,
      email: form.email,
      phone_number: form.phone,
    };
    if (previousScope !== nextScope) {
      const violationsSnapshot = await getDocs(queryForUserScope(collection(db, 'violations'), userProfile));
      const relatedViolations = violationsSnapshot.docs.filter((violationDoc) => {
        const violation = violationDoc.data();
        return String(violation.student_id || '') === String(docId)
          || (existingStudent?.id && String(violation.student_id || '') === String(existingStudent.id))
          || (existingStudent?.id && String(violation.student_number || '') === String(existingStudent.id));
      });
      const batchSize = 450;
      let startIndex = 0;
      let firstBatch = true;
      while (firstBatch || startIndex < relatedViolations.length) {
        const batch = writeBatch(db);
        if (firstBatch) batch.update(doc(db, 'students', docId), payload);
        const batchCapacity = firstBatch ? batchSize - 1 : batchSize;
        const endIndex = Math.min(startIndex + batchCapacity, relatedViolations.length);
        relatedViolations.slice(startIndex, endIndex).forEach((violationDoc) => {
          batch.update(violationDoc.ref, { school_scope: nextScope });
        });
        await batch.commit();
        startIndex = endIndex;
        firstBatch = false;
      }
    } else {
      await updateDoc(doc(db, 'students', docId), payload);
    }
    await recordActivity(userProfile, ACTIVITY_ACTIONS.STUDENT_UPDATED, 'student', docId);
    setStudents((prev) =>
      prev.map((student) =>
        student.docId === docId
          ? {
              ...student,
              school_scope: nextScope,
              id: payload.student_number,
              name: payload.full_name,
              first_name: payload.first_name,
              middle_name: payload.middle_name,
              last_name: payload.last_name,
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

    try {
      const [studentsSnapshot, violationsSnapshot] = await Promise.all([
        getDocs(queryForUserScope(collection(db, 'students'), userProfile)),
        getDocs(queryForUserScope(collection(db, 'violations'), userProfile)),
      ]);

      const targetStudent = studentsSnapshot.docs.find((studentDoc) => studentDoc.id === docId);
      const targetStudentNumber = targetStudent?.data()?.student_number || '';

      const relatedViolationIds = violationsSnapshot.docs
        .filter((violationDoc) => {
          const violationData = violationDoc.data();
          return String(violationData.student_id || '') === String(docId)
            || String(violationData.student_id || '') === String(targetStudentNumber)
            || String(violationData.student_number || '') === String(targetStudentNumber);
        })
        .map((violationDoc) => violationDoc.id);

      await Promise.all([
        deleteDoc(doc(db, 'students', docId)),
        ...relatedViolationIds.map((violationId) => deleteDoc(doc(db, 'violations', violationId))),
      ]);
      await recordActivity(userProfile, ACTIVITY_ACTIONS.STUDENT_DELETED, 'student', docId);

      setStudents((prev) => prev.filter((student) => student.docId !== docId));
      if (selectedStudent?.docId === docId) {
        setSelectedStudent(null);
        setView('list');
      }
    } catch (error) {
      console.error('Failed to delete student:', error);
      window.alert('Failed to delete student. Check your Firebase permissions and connection.');
    }
  };

  const handleSetSuspensionDates = async (violationId, startDate, endDate) => {
    if (!violationId) return;
    setSuspensionSaving(true);
    try {
      await updateDoc(doc(db, 'violations', violationId), {
        suspension_start: startDate,
        suspension_end: endDate,
        updated_at: serverTimestamp(),
      });
      await recordActivity(userProfile, ACTIVITY_ACTIONS.SUSPENSION_DATES_UPDATED, 'violation', violationId);

      setStudents((prev) =>
        prev.map((student) => ({
          ...student,
          violations: (student.violations || []).map((violation) =>
            String(violation.id) === String(violationId)
              ? { ...violation, suspension_start: startDate, suspension_end: endDate }
              : violation
          ),
        }))
      );

      setSelectedStudent((prev) =>
        prev
          ? {
              ...prev,
              violations: (prev.violations || []).map((violation) =>
                String(violation.id) === String(violationId)
                  ? { ...violation, suspension_start: startDate, suspension_end: endDate }
                  : violation
              ),
            }
          : prev
      );

      setSelectedViolation((prev) =>
        prev && String(prev.id) === String(violationId)
          ? { ...prev, suspension_start: startDate, suspension_end: endDate }
          : prev
      );
    } catch (error) {
      console.error('Failed to set suspension dates:', error);
      alert('Failed to save suspension dates.');
    } finally {
      setSuspensionSaving(false);
    }
  };

  const handleUpdateViolationStatus = async (violationId, nextStatus, extraFields = {}) => {
    if (!violationId) return;
    const nextPatch = { status: nextStatus, ...extraFields };
    const applyStatus = (list) =>
      list.map((student) => ({
        ...student,
        violations: (student.violations || []).map((violation) =>
          String(violation.id) === String(violationId)
            ? { ...violation, ...nextPatch }
            : violation
        ),
      }));

    setStudents((prev) => applyStatus(prev));
    setSelectedStudent((prev) =>
      prev
        ? {
            ...prev,
            violations: (prev.violations || []).map((violation) =>
              String(violation.id) === String(violationId)
                ? { ...violation, ...nextPatch }
                : violation
            ),
          }
        : prev
    );

    try {
      await updateDoc(doc(db, 'violations', violationId), {
        ...nextPatch,
        updated_at: serverTimestamp(),
      });
      await recordActivity(userProfile, ACTIVITY_ACTIONS.VIOLATION_STATUS_UPDATED, 'violation', violationId);
    } catch (error) {
      console.error('Failed to update violation status:', error);
      await fetchStudents();
    }
  };

  if (view === 'violation' && selectedViolation && selectedStudent) {
    return (
      <ViolationDetails
        violation={selectedViolation}
        student={selectedStudent}
        onBack={() => setView('profile')}
        onSetSuspensionDates={handleSetSuspensionDates}
        suspensionSaving={suspensionSaving}
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
        onUpdateViolationStatus={handleUpdateViolationStatus}
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
      location={location}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
    />
  );
}
