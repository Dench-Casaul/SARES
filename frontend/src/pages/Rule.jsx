import { useEffect, useRef, useState } from 'react'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { AlertTriangle, ChevronDown, ChevronRight, Pencil, Plus, RotateCcw, Save, Search, Trash2 } from 'lucide-react'
import '../css/Rule.css'
import { applyHandbookOverrides, applySanctionOverrides, getHandbook, getSanctionOverrides, toSchoolSanctionOverrides } from '../data/handbookIndex'
import { db } from '../firebase'
import { ordinal } from '../engine/sanctionLabel'
import { useAuthProfile } from '../authContext'
import { ACTIVITY_ACTIONS, recordActivity } from '../activityLog'
import AppShell from '../AppShell'
import SchoolCalendarPanel from '../SchoolCalendarPanel'

const LEVEL_COLORS = {
  light: { bg: '#eaf4ff', color: '#006ed0', border: '#b9d9fb' },
  less_serious: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  serious: { bg: '#fef2f2', color: '#be123c', border: '#fecaca' },
  very_serious: { bg: '#7f1d1d', color: '#ffffff', border: '#b91c1c' },
}

const OFFENSE_LEVELS = [
  { id: 'light', label: 'Light', category: 'minor' },
  { id: 'less_serious', label: 'Less Serious', category: 'minor' },
  { id: 'serious', label: 'Serious', category: 'major' },
  { id: 'very_serious', label: 'Very Serious', category: 'major' },
]

const SCHOOL_LEVELS = [
  { id: 'elementary', label: 'Elementary' },
  { id: 'high_school', label: 'High School' },
]

const categoryLabel = (categoryId) => (categoryId === 'major' ? 'Major' : 'Minor')
const classKey = (group) => `${group.categoryId}-${group.subcategoryId}-${group.handbookNumber}`
const ruleKey = (rule) => `${rule.offenseTypeId}-${rule.subcategoryId}-${rule.schoolScope}-${rule.offenseNumber}`
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right)

function sortGroups(groups = []) {
  const levelOrder = Object.fromEntries(OFFENSE_LEVELS.map((level, index) => [level.id, index]))
  return [...groups].sort((left, right) =>
    (levelOrder[left.subcategoryId] ?? 99) - (levelOrder[right.subcategoryId] ?? 99)
    || Number(left.handbookNumber || 0) - Number(right.handbookNumber || 0))
}

function matchesSearch(group, term) {
  if (!term) return true
  const lower = term.toLowerCase()
  return group.groupTitle.toLowerCase().includes(lower)
    || (group.offenses || []).some((offense) => offense.title.toLowerCase().includes(lower))
}

/** A level's sanction schedule for one school, in offense order. */
function getSchedule(sanctionSchedule, levelId, schoolLevelId) {
  return (sanctionSchedule || [])
    .filter((rule) => rule.subcategoryId === levelId && rule.schoolScope === schoolLevelId)
    .sort((left, right) => left.offenseNumber - right.offenseNumber)
}

function ClassNumber({ group }) {
  const colors = LEVEL_COLORS[group.subcategoryId] || LEVEL_COLORS.light
  return (
    <span className="rm-class-number" style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}>
      {group.handbookNumber}
    </span>
  )
}

function ViolationChips({ offenses }) {
  return (
    <ul className="rm-violation-chips">
      {(offenses || []).map((offense) => (
        <li key={offense.id} className={`rm-chip${offense.isIllegal ? ' rm-chip--illegal' : ''}`}>
          {offense.isIllegal && <AlertTriangle size={13} aria-label="May involve illegal activity: refer to authorities" />}
          {offense.title}
        </li>
      ))}
    </ul>
  )
}

/** Sanctions for one offense level, Elementary and High School side by side. */
function ScheduleTable({ sanctionSchedule, levelId }) {
  const rows = SCHOOL_LEVELS.map((schoolLevel) => ({ schoolLevel, rules: getSchedule(sanctionSchedule, levelId, schoolLevel.id) }))
  const tierCount = Math.max(0, ...rows.map((row) => row.rules.length))
  if (tierCount === 0) return <p className="rm-schedule-note">No sanctions are listed for this level.</p>
  return (
    <>
      <div className="rm-schedule-wrap">
        <table className="rm-schedule">
          <thead>
            <tr>
              <th scope="col">School level</th>
              {Array.from({ length: tierCount }, (_, index) => <th key={index} scope="col">{ordinal(index + 1)} offense</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ schoolLevel, rules }) => (
              <tr key={schoolLevel.id}>
                <th scope="row">{schoolLevel.label}</th>
                {Array.from({ length: tierCount }, (_, index) => <td key={index}>{rules[index]?.sanction || '—'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="rm-schedule-note">
        Offenses are counted per student within this level and school year. Beyond the last listed offense, the highest
        sanction applies and the case is flagged for referral to the principal.
      </p>
    </>
  )
}

export default function Rule() {
  const { userProfile } = useAuthProfile()
  const isSuperadmin = userProfile?.role === 'superadmin'
  const ownSchoolLabel = userProfile?.school_scope === 'elementary' ? 'Elementary' : 'High School'

  const [activePanel, setActivePanel] = useState('browse')
  const [notice, setNotice] = useState(null) // { type: 'success' | 'error', text }
  const [saving, setSaving] = useState(false)

  // Saved values (from Firestore) and the editable drafts.
  const [savedSanctions, setSavedSanctions] = useState(getSanctionOverrides)
  const [savedHandbook, setSavedHandbook] = useState(() => structuredClone(getHandbook()))
  const [sanctionDraft, setSanctionDraft] = useState(getSanctionOverrides)
  const [handbookDraft, setHandbookDraft] = useState(() => structuredClone(getHandbook()))
  const savedRef = useRef({ sanctions: savedSanctions, handbook: savedHandbook })

  // Handbook browsing
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [expandedClass, setExpandedClass] = useState(null)

  // Sanction rules editing
  const [editLevel, setEditLevel] = useState('light')

  // Violation catalog editing
  const [catalogSearch, setCatalogSearch] = useState('')
  const [classEditor, setClassEditor] = useState(null)
  const [classEditorViolationTitle, setClassEditorViolationTitle] = useState('')
  const [classEditorViolationIllegal, setClassEditorViolationIllegal] = useState(false)
  const [classEditorError, setClassEditorError] = useState('')

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'rules', 'handbook_sanctions'), (snapshot) => {
      const overrides = snapshot.exists() ? snapshot.data() : {}
      applyHandbookOverrides(overrides)
      applySanctionOverrides(overrides)
      const nextSanctions = getSanctionOverrides()
      const nextHandbook = structuredClone(getHandbook())
      const previous = savedRef.current
      savedRef.current = { sanctions: nextSanctions, handbook: nextHandbook }
      setSavedSanctions(nextSanctions)
      setSavedHandbook(nextHandbook)
      // Refresh a draft only if it has no unsaved edits, so a save from another
      // device never silently replaces work in progress.
      setSanctionDraft((draft) => (sameJson(draft, previous.sanctions) ? nextSanctions : draft))
      setHandbookDraft((draft) => (sameJson(draft, previous.handbook) ? nextHandbook : draft))
    }, (error) => {
      console.error('Failed to load sanction rules:', error)
      setNotice({ type: 'error', text: 'The saved handbook rules could not be loaded. Showing the default handbook.' })
    })
    return () => unsubscribe()
  }, [])

  const rulesDirty = !sameJson(sanctionDraft.offenseSanctionSchedule, savedSanctions.offenseSanctionSchedule)
  const catalogDirty = !sameJson(handbookDraft.offenseGroups, savedHandbook.offenseGroups)

  const switchPanel = (panel) => {
    setActivePanel(panel)
    setNotice(null)
  }

  const savedSanctionByKey = Object.fromEntries((savedSanctions.offenseSanctionSchedule || []).map((rule) => [ruleKey(rule), rule.sanction]))

  const updateSanctionDraft = (key, value) => {
    setSanctionDraft((previous) => ({
      ...previous,
      offenseSanctionSchedule: previous.offenseSanctionSchedule.map((rule) => (ruleKey(rule) === key ? { ...rule, sanction: value } : rule)),
    }))
  }

  const saveSanctionRules = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      if (isSuperadmin) {
        await setDoc(doc(db, 'rules', 'handbook_sanctions'), {
          ...sanctionDraft,
          elementarySanctionOverrides: toSchoolSanctionOverrides(sanctionDraft.offenseSanctionSchedule, 'elementary'),
          high_schoolSanctionOverrides: toSchoolSanctionOverrides(sanctionDraft.offenseSanctionSchedule, 'high_school'),
          offenseGroups: handbookDraft.offenseGroups,
          offenseTypes: handbookDraft.offenseTypes,
          updated_at: serverTimestamp(),
        })
      } else if (userProfile?.role === 'counselor' && ['elementary', 'high_school'].includes(userProfile.school_scope)) {
        const field = `${userProfile.school_scope}SanctionOverrides`
        await setDoc(doc(db, 'rules', 'handbook_sanctions'), {
          [field]: toSchoolSanctionOverrides(sanctionDraft.offenseSanctionSchedule, userProfile.school_scope),
          updated_at: serverTimestamp(),
        }, { merge: true })
      } else {
        throw new Error('This account is not permitted to edit sanction rules.')
      }
      await recordActivity(userProfile, ACTIVITY_ACTIONS.HANDBOOK_UPDATED, 'handbook', 'handbook_sanctions')
      setNotice({
        type: 'success',
        text: `${isSuperadmin ? 'Sanction rules' : `${ownSchoolLabel} sanction rules`} saved. New recommendations use them; recorded cases are not changed.`,
      })
    } catch (error) {
      console.error('Failed to save sanction rules:', error)
      setNotice({ type: 'error', text: 'The sanction rules could not be saved. Check your access and connection, then try again.' })
    } finally {
      setSaving(false)
    }
  }

  const saveViolationCatalog = async () => {
    if (!isSuperadmin) return
    setSaving(true)
    setNotice(null)
    try {
      await setDoc(doc(db, 'rules', 'handbook_sanctions'), {
        ...sanctionDraft,
        offenseGroups: handbookDraft.offenseGroups,
        offenseTypes: handbookDraft.offenseTypes,
        updated_at: serverTimestamp(),
      })
      await recordActivity(userProfile, ACTIVITY_ACTIONS.HANDBOOK_UPDATED, 'handbook', 'handbook_sanctions')
      setNotice({ type: 'success', text: 'Violation catalog saved. New incident reports use the updated list.' })
    } catch (error) {
      console.error('Failed to save violation catalog:', error)
      setNotice({ type: 'error', text: 'The violation catalog could not be saved. Check your access and connection, then try again.' })
    } finally {
      setSaving(false)
    }
  }

  const discardRules = () => setSanctionDraft(savedRef.current.sanctions)
  const discardCatalog = () => {
    if (window.confirm('Discard all unsaved catalog changes?')) setHandbookDraft(savedRef.current.handbook)
  }

  // --- class editor (catalog) ---
  const openClassEditor = (group = null) => {
    setClassEditor(group ? {
      ...group,
      offenses: (group.offenses || []).map((offense) => ({ ...offense })),
      originalGroup: group,
    } : {
      categoryId: 'minor',
      subcategoryId: 'light',
      groupTitle: '',
      offenses: [],
      originalGroup: null,
    })
    setClassEditorViolationTitle('')
    setClassEditorViolationIllegal(false)
    setClassEditorError('')
  }

  const addViolationToClassDraft = () => {
    const title = classEditorViolationTitle.trim()
    if (!title || !classEditor) return
    if (classEditor.offenses.some((offense) => offense.title.trim().toLowerCase() === title.toLowerCase())) {
      setClassEditorError('That violation is already in this offense class.')
      return
    }
    setClassEditor({
      ...classEditor,
      offenses: [...classEditor.offenses, {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        isIllegal: classEditorViolationIllegal,
      }],
    })
    setClassEditorViolationTitle('')
    setClassEditorViolationIllegal(false)
    setClassEditorError('')
  }

  const saveClassDraft = (event) => {
    event.preventDefault()
    if (!isSuperadmin || !classEditor) return
    const groupTitle = classEditor.groupTitle.trim()
    const offenses = classEditor.offenses
      .map((offense) => ({ ...offense, title: String(offense.title || '').trim() }))
      .filter((offense) => offense.title)

    if (!groupTitle) {
      setClassEditorError('Enter an offense class name.')
      return
    }
    if (offenses.length === 0) {
      setClassEditorError('Add at least one violation to this offense class.')
      return
    }

    const originalGroup = classEditor.originalGroup
    const duplicateClass = handbookDraft.offenseGroups.some((group) =>
      group !== originalGroup
      && group.categoryId === classEditor.categoryId
      && group.subcategoryId === classEditor.subcategoryId
      && group.groupTitle.trim().toLowerCase() === groupTitle.toLowerCase())
    if (duplicateClass) {
      setClassEditorError('An offense class with that name already exists for this offense type and level.')
      return
    }

    const groupsWithoutOriginal = originalGroup
      ? handbookDraft.offenseGroups.filter((group) => group !== originalGroup)
      : handbookDraft.offenseGroups
    const bucketGroups = groupsWithoutOriginal.filter((group) =>
      group.categoryId === classEditor.categoryId && group.subcategoryId === classEditor.subcategoryId)
    const handbookNumber = originalGroup && originalGroup.categoryId === classEditor.categoryId && originalGroup.subcategoryId === classEditor.subcategoryId
      ? originalGroup.handbookNumber
      : bucketGroups.reduce((max, group) => Math.max(max, Number(group.handbookNumber) || 0), 0) + 1

    setHandbookDraft({
      ...handbookDraft,
      offenseGroups: [...groupsWithoutOriginal, {
        handbookNumber,
        categoryId: classEditor.categoryId,
        subcategoryId: classEditor.subcategoryId,
        groupTitle,
        offenses,
      }],
    })
    setClassEditor(null)
    setNotice({ type: 'success', text: `"${groupTitle}" ${originalGroup ? 'updated' : 'added'}. Select Save Catalog to keep the change.` })
  }

  const deleteClassDraft = (group) => {
    if (!isSuperadmin) return
    if (!window.confirm(`Remove the offense class "${group.groupTitle}" and its ${group.offenses.length} violations from the catalog?\n\nRecorded cases are not affected. The removal is kept only after you select Save Catalog.`)) return
    setHandbookDraft({
      ...handbookDraft,
      offenseGroups: handbookDraft.offenseGroups.filter((item) => item !== group),
    })
    setClassEditor(null)
    setNotice({ type: 'success', text: `"${group.groupTitle}" removed. Select Save Catalog to keep the change.` })
  }

  // --- derived lists ---
  const browseGroups = sortGroups(savedHandbook.offenseGroups)
    .filter((group) => levelFilter === 'all' || group.subcategoryId === levelFilter)
    .filter((group) => matchesSearch(group, search.trim()))
  const catalogGroups = sortGroups(handbookDraft.offenseGroups).filter((group) => matchesSearch(group, catalogSearch.trim()))
  const browseViolationCount = browseGroups.reduce((sum, group) => sum + (group.offenses?.length || 0), 0)
  const savedSchedule = (savedHandbook.offenseTypes || []).flatMap((type) => type.sanctionSchedule || [])
  const editableSchools = SCHOOL_LEVELS.filter((schoolLevel) => isSuperadmin || schoolLevel.id === userProfile?.school_scope)
  const dirtyLevels = new Set((sanctionDraft.offenseSanctionSchedule || [])
    .filter((rule) => savedSanctionByKey[ruleKey(rule)] !== rule.sanction)
    .map((rule) => rule.subcategoryId))

  const groupByLevel = (groups) => OFFENSE_LEVELS
    .map((level) => ({ level, groups: groups.filter((group) => group.subcategoryId === level.id) }))
    .filter((section) => section.groups.length > 0)

  const tabs = [
    { id: 'browse', label: 'Handbook', control: 'rule-tab-handbook' },
    { id: 'rules', label: 'Sanction Rules', control: 'rule-tab-rules', dirty: rulesDirty },
    ...(isSuperadmin ? [{ id: 'violations', label: 'Violation Catalog', control: 'rule-tab-violations', dirty: catalogDirty }] : []),
    { id: 'calendar', label: 'School Year', control: 'rule-tab-calendar' },
  ]

  return (
    <AppShell>
      <header className="app-page-heading" data-help-target="rule-content">
        <h1 className="app-page-title">Rule Management</h1>
        <p className="app-page-sub">The school handbook SARES uses to classify violations and recommend sanctions.</p>
      </header>

      <div className="rm-tabs" data-help-target="rule-tabs" role="tablist" aria-label="Rule management sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-help-control={tab.control}
            aria-selected={activePanel === tab.id}
            className={activePanel === tab.id ? 'active' : ''}
            onClick={() => switchPanel(tab.id)}
          >
            {tab.label}
            {tab.dirty && <span className="rm-tab-dot" title="Unsaved changes" aria-label="(unsaved changes)" />}
          </button>
        ))}
      </div>

      {notice && <p className={`rm-notice rm-notice--${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</p>}

      {activePanel === 'browse' && (
        <>
          <div className="rm-toolbar" data-help-target="rule-filters">
            <label className="rm-toolbar-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search offense classes and violations"
                aria-label="Search the handbook"
              />
            </label>
            <label className="rm-toolbar-field">
              <span>Offense level</span>
              <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}>
                <option value="all">All levels</option>
                <optgroup label="Minor">
                  {OFFENSE_LEVELS.filter((level) => level.category === 'minor').map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}
                </optgroup>
                <optgroup label="Major">
                  {OFFENSE_LEVELS.filter((level) => level.category === 'major').map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}
                </optgroup>
              </select>
            </label>
            <p className="rm-toolbar-count">{browseGroups.length} classes · {browseViolationCount} violations</p>
          </div>

          <div className="rm-level-section" data-help-target="rule-groups">
            {browseGroups.length === 0 && <div className="rm-empty">No offense classes match your search.</div>}
            {groupByLevel(browseGroups).map(({ level, groups }) => (
              <section key={level.id} className="rm-level-section" aria-label={`${level.label} offenses`}>
                <h2 className="rm-level-heading">{categoryLabel(level.category)} · {level.label} <small>{groups.length} classes</small></h2>
                {groups.map((group) => {
                  const key = classKey(group)
                  // While searching, every matching class opens so the matches are visible.
                  const isOpen = Boolean(search.trim()) || expandedClass === key
                  return (
                    <div key={key} className={`rm-class-card${isOpen ? ' rm-class-card--open' : ''}`}>
                      <button
                        type="button"
                        className="rm-class-toggle"
                        aria-expanded={isOpen}
                        onClick={() => setExpandedClass(expandedClass === key ? null : key)}
                      >
                        <ClassNumber group={group} />
                        <span className="rm-class-text">
                          <span className="rm-class-title">{group.groupTitle}</span>
                          <span className="rm-class-meta">{group.offenses.length} violations</span>
                        </span>
                        {isOpen ? <ChevronDown size={18} className="rm-class-chevron" /> : <ChevronRight size={18} className="rm-class-chevron" />}
                      </button>
                      {isOpen && (
                        <div className="rm-class-body">
                          <div>
                            <h4>Violations in this class</h4>
                            <ViolationChips offenses={group.offenses} />
                          </div>
                          <div>
                            <h4>Sanctions for {level.label} offenses</h4>
                            <ScheduleTable sanctionSchedule={savedSchedule} levelId={group.subcategoryId} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </section>
            ))}
          </div>
        </>
      )}

      {activePanel === 'rules' && (
        <form className="rm-editor-panel" onSubmit={saveSanctionRules}>
          <div className="rm-editor-heading">
            <div>
              <h2>Sanction Rules</h2>
              <p>
                The sanction recommended for each offense number, by offense level and school level. Changes apply to new
                recommendations; recorded cases keep the sanction they were given.
                {!isSuperadmin && ` You can edit the ${ownSchoolLabel} rules.`}
              </p>
            </div>
          </div>

          <div className="rm-level-pills" role="group" aria-label="Offense level to edit">
            {OFFENSE_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                className={`rm-pill${editLevel === level.id ? ' active' : ''}`}
                aria-pressed={editLevel === level.id}
                onClick={() => setEditLevel(level.id)}
              >
                {level.label} <small>{categoryLabel(level.category)}</small>
                {dirtyLevels.has(level.id) && <span className="rm-tab-dot" aria-label="(unsaved changes)" />}
              </button>
            ))}
          </div>

          <div className="rm-sanction-columns" data-help-target="rule-sanction-schedule">
            {editableSchools.map((schoolLevel) => {
              const rules = getSchedule(sanctionDraft.offenseSanctionSchedule, editLevel, schoolLevel.id)
              return (
                <div key={schoolLevel.id} className="rm-sanction-column">
                  <h3>{schoolLevel.label}</h3>
                  {rules.length === 0 && <p className="rm-schedule-note">No sanctions are listed for this level.</p>}
                  {rules.map((rule) => {
                    const key = ruleKey(rule)
                    return (
                      <label key={key}>
                        <span>{ordinal(rule.offenseNumber)} offense</span>
                        <textarea
                          rows="3"
                          required
                          value={rule.sanction}
                          className={savedSanctionByKey[key] !== rule.sanction ? 'rm-dirty' : ''}
                          onChange={(event) => updateSanctionDraft(key, event.target.value)}
                        />
                      </label>
                    )
                  })}
                </div>
              )
            })}
          </div>
          <p className="rm-schedule-note">
            Beyond the last listed offense, the highest sanction applies and the case is flagged for referral to the principal.
          </p>

          <div className={`rm-savebar${rulesDirty ? ' rm-savebar--dirty' : ''}`}>
            <p>{rulesDirty ? 'You have unsaved changes (highlighted).' : 'All changes saved.'}</p>
            <div className="rm-savebar-actions">
              <button type="button" className="rm-btn" onClick={discardRules} disabled={!rulesDirty || saving}>
                <RotateCcw size={15} aria-hidden="true" /> Discard
              </button>
              <button type="submit" className="rm-btn rm-btn--primary" data-help-target="rule-save-rules" disabled={!rulesDirty || saving}>
                <Save size={15} aria-hidden="true" /> {saving ? 'Saving…' : isSuperadmin ? 'Save Rules' : `Save ${ownSchoolLabel} Rules`}
              </button>
            </div>
          </div>
        </form>
      )}

      {activePanel === 'calendar' && <SchoolCalendarPanel />}

      {activePanel === 'violations' && isSuperadmin && (
        <section className="rm-editor-panel">
          <div className="rm-editor-heading">
            <div>
              <h2>Violation Catalog</h2>
              <p>The offense classes and specific violations counselors choose from when logging an incident. Each class belongs to one offense level, which decides its sanctions.</p>
            </div>
          </div>

          <div className="rm-catalog-head" data-help-target="rule-class-toolbar">
            <label className="rm-toolbar-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={catalogSearch}
                onChange={(event) => setCatalogSearch(event.target.value)}
                placeholder="Search classes and violations"
                aria-label="Search the catalog"
              />
            </label>
            <button type="button" className="rm-btn rm-btn--primary" onClick={() => openClassEditor()}>
              <Plus size={16} aria-hidden="true" /> Add offense class
            </button>
          </div>

          <div className="rm-level-section" data-help-target="rule-violation-catalog">
            {catalogGroups.length === 0 && <div className="rm-empty">No offense classes match your search.</div>}
            {groupByLevel(catalogGroups).map(({ level, groups }) => (
              <section key={level.id} className="rm-level-section" aria-label={`${level.label} offense classes`}>
                <h3 className="rm-level-heading">{categoryLabel(level.category)} · {level.label} <small>{groups.length} classes</small></h3>
                {groups.map((group) => (
                  <div key={`${classKey(group)}-${group.groupTitle}`} className="rm-class-card">
                    <div className="rm-class-head">
                      <ClassNumber group={group} />
                      <span className="rm-class-text">
                        <span className="rm-class-title">{group.groupTitle}</span>
                        <span className="rm-class-meta">{group.offenses.length} violations</span>
                      </span>
                      <div className="rm-class-actions">
                        <button type="button" className="rm-btn" onClick={() => openClassEditor(group)}>
                          <Pencil size={14} aria-hidden="true" /> Edit<span className="sr-only"> {group.groupTitle}</span>
                        </button>
                      </div>
                    </div>
                    <div className="rm-class-body">
                      <ViolationChips offenses={group.offenses} />
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>

          <div className={`rm-savebar${catalogDirty ? ' rm-savebar--dirty' : ''}`}>
            <p>{catalogDirty ? 'You have unsaved catalog changes.' : 'All changes saved.'}</p>
            <div className="rm-savebar-actions">
              <button type="button" className="rm-btn" onClick={discardCatalog} disabled={!catalogDirty || saving}>
                <RotateCcw size={15} aria-hidden="true" /> Discard
              </button>
              <button type="button" className="rm-btn rm-btn--primary" data-help-target="rule-save-catalog" onClick={saveViolationCatalog} disabled={!catalogDirty || saving}>
                <Save size={15} aria-hidden="true" /> {saving ? 'Saving…' : 'Save Catalog'}
              </button>
            </div>
          </div>
        </section>
      )}

      {classEditor && (
        <div className="rm-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setClassEditor(null) }}>
          <form className="rm-edit-modal rm-class-editor-modal" onSubmit={saveClassDraft} aria-label={classEditor.originalGroup ? 'Edit offense class' : 'Add offense class'}>
            <div className="rm-editor-heading">
              <div>
                <h2>{classEditor.originalGroup ? 'Edit Offense Class' : 'Add Offense Class'}</h2>
                <p>Choose the offense type and level, then list the violations in this class.</p>
              </div>
              <button type="button" className="rm-modal-close" aria-label="Close editor" onClick={() => setClassEditor(null)}>×</button>
            </div>

            <div className="rm-edit-fields">
              <label>
                Offense type
                <select
                  value={classEditor.categoryId}
                  onChange={(event) => setClassEditor((previous) => ({
                    ...previous,
                    categoryId: event.target.value,
                    subcategoryId: event.target.value === 'minor' ? 'light' : 'serious',
                  }))}
                >
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                </select>
              </label>
              <label>
                Offense level
                <select
                  value={classEditor.subcategoryId}
                  onChange={(event) => setClassEditor((previous) => ({ ...previous, subcategoryId: event.target.value }))}
                >
                  {OFFENSE_LEVELS.filter((level) => level.category === classEditor.categoryId).map((level) => (
                    <option key={level.id} value={level.id}>{level.label}</option>
                  ))}
                </select>
              </label>
              <label className="rm-edit-field-full">
                Offense class name
                <input
                  type="text"
                  required
                  value={classEditor.groupTitle}
                  onChange={(event) => setClassEditor((previous) => ({ ...previous, groupTitle: event.target.value }))}
                  placeholder="Ex: ID and Identification Violations"
                />
              </label>
            </div>

            <div className="rm-class-violations-heading">
              <h3>Specific violations</h3>
              <span>{classEditor.offenses.length}</span>
            </div>
            <ul className="rm-class-violation-list">
              {classEditor.offenses.map((offense, index) => (
                <li key={offense.id}>
                  <input
                    aria-label={`Violation ${index + 1}`}
                    value={offense.title}
                    onChange={(event) => setClassEditor((previous) => ({
                      ...previous,
                      offenses: previous.offenses.map((item) => (item.id === offense.id ? { ...item, title: event.target.value } : item)),
                    }))}
                  />
                  <label className="rm-class-illegal-toggle" title="May involve illegal activity: suggest referral to authorities">
                    <input
                      type="checkbox"
                      checked={Boolean(offense.isIllegal)}
                      onChange={(event) => setClassEditor((previous) => ({
                        ...previous,
                        offenses: previous.offenses.map((item) => (item.id === offense.id ? { ...item, isIllegal: event.target.checked } : item)),
                      }))}
                    />
                    Referral
                  </label>
                  <button
                    type="button"
                    className="rm-icon-action rm-danger-action"
                    aria-label={`Remove ${offense.title || `violation ${index + 1}`}`}
                    title="Remove violation"
                    onClick={() => setClassEditor((previous) => ({
                      ...previous,
                      offenses: previous.offenses.filter((item) => item.id !== offense.id),
                    }))}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="rm-add-class-violation">
              <input
                value={classEditorViolationTitle}
                onChange={(event) => setClassEditorViolationTitle(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addViolationToClassDraft() } }}
                placeholder="Add a specific violation, then press Enter"
                aria-label="New specific violation"
              />
              <label className="rm-class-illegal-toggle" title="May involve illegal activity: suggest referral to authorities">
                <input type="checkbox" checked={classEditorViolationIllegal} onChange={(event) => setClassEditorViolationIllegal(event.target.checked)} />
                Referral
              </label>
              <button type="button" className="rm-btn" onClick={addViolationToClassDraft}>
                <Plus size={15} aria-hidden="true" /> Add
              </button>
            </div>

            {classEditorError && <p className="rm-notice rm-notice--error" role="alert">{classEditorError}</p>}

            <div className="rm-modal-actions">
              {classEditor.originalGroup && (
                <button type="button" className="rm-btn rm-btn--danger" onClick={() => deleteClassDraft(classEditor.originalGroup)}>
                  <Trash2 size={15} aria-hidden="true" /> Delete class
                </button>
              )}
              <button type="button" className="rm-btn" onClick={() => setClassEditor(null)}>Cancel</button>
              <button className="rm-btn rm-btn--primary" type="submit"><Save size={15} aria-hidden="true" /> Apply</button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  )
}
