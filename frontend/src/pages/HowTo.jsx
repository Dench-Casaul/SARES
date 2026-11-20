import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, ChevronDown, ChevronRight, CircleHelp, Link2, Search } from 'lucide-react'
import AppShell from '../AppShell'
import { useAuthProfile } from '../authContext'
import { GUIDE_CATEGORIES, filterGuides } from '../helpGuides'
import '../css/HowTo.css'

/** How-to Guide: step-by-step instructions for common SARES tasks. */
export default function HowTo() {
  const { userProfile } = useAuthProfile()
  const location = useLocation()
  const linkedGuide = location.hash.slice(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [openGuide, setOpenGuide] = useState(linkedGuide || null)
  const [copiedId, setCopiedId] = useState(null)

  // A link such as /sares/help#log-violation opens that guide and scrolls to it.
  useEffect(() => {
    if (!linkedGuide) return
    document.getElementById(`guide-${linkedGuide}`)?.scrollIntoView({ block: 'start' })
  }, [linkedGuide])

  const searching = Boolean(search.trim())
  const guides = filterGuides({ role: userProfile?.role, search })
    .filter((guide) => searching || category === 'all' || guide.category === category)
  const sections = GUIDE_CATEGORIES
    .map((section) => ({ ...section, guides: guides.filter((guide) => guide.category === section.id) }))
    .filter((section) => section.guides.length > 0)

  const copyLink = async (guideId) => {
    const url = `${window.location.origin}/sares/help#${guideId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(guideId)
      window.setTimeout(() => setCopiedId((current) => (current === guideId ? null : current)), 2000)
    } catch {
      window.prompt('Copy this link:', url)
    }
  }

  return (
    <AppShell>
      <header className="app-page-heading">
        <h1 className="app-page-title">How-to Guide</h1>
        <p className="app-page-sub">Step-by-step instructions for common tasks in SARES. Search, or pick a topic.</p>
      </header>

      <section className="ht-toolbar" aria-label="Find a guide">
        <label className="ht-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='What do you want to do? e.g. "suspension", "print", "add student"'
            aria-label="Search the guides"
          />
        </label>
        <div className="ht-chips" role="group" aria-label="Topics">
          {[{ id: 'all', label: 'All topics' }, ...GUIDE_CATEGORIES].map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={`ht-chip${!searching && category === topic.id ? ' active' : ''}`}
              aria-pressed={!searching && category === topic.id}
              onClick={() => {
                setCategory(topic.id)
                setSearch('')
              }}
            >
              {topic.label}
            </button>
          ))}
        </div>
        <p className="ht-tour-tip">
          <CircleHelp size={17} aria-hidden="true" />
          <span>Prefer to be shown? On any page, select the round <strong>?</strong> button at the bottom-right for a guided tour of that page.</span>
        </p>
      </section>

      {sections.length === 0 && (
        <div className="ht-empty">
          No guide matches "{search}". Try another word, such as "student", "report", or "status".
        </div>
      )}

      {sections.map((section) => (
        <section key={section.id} className="ht-category" aria-labelledby={`topic-${section.id}`}>
          <h2 id={`topic-${section.id}`} className="ht-category-title">{section.label}</h2>
          {section.guides.map((guide) => {
            const isOpen = searching || openGuide === guide.id
            return (
              <article key={guide.id} id={`guide-${guide.id}`} className={`ht-guide${isOpen ? ' ht-guide--open' : ''}`}>
                <button
                  type="button"
                  className="ht-guide-toggle"
                  aria-expanded={isOpen}
                  aria-controls={`guide-body-${guide.id}`}
                  onClick={() => setOpenGuide(openGuide === guide.id ? null : guide.id)}
                >
                  <span className="ht-guide-text">
                    <span className="ht-guide-title">{guide.title}</span>
                    <span className="ht-guide-summary">{guide.summary}</span>
                  </span>
                  {guide.superadminOnly && <span className="ht-badge">Superadmin</span>}
                  {isOpen ? <ChevronDown size={18} className="ht-chevron" aria-hidden="true" /> : <ChevronRight size={18} className="ht-chevron" aria-hidden="true" />}
                </button>

                {isOpen && (
                  <div id={`guide-body-${guide.id}`} className="ht-guide-body">
                    <ol className="ht-steps">
                      {guide.steps.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                    {guide.warnings?.length > 0 && (
                      <div className="ht-note ht-note--warning" role="note">
                        <strong>Important</strong>
                        <ul>{guide.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                      </div>
                    )}
                    {guide.tips?.length > 0 && (
                      <div className="ht-note ht-note--tip" role="note">
                        <strong>Good to know</strong>
                        <ul>{guide.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
                      </div>
                    )}
                    <div className="ht-guide-actions">
                      {guide.link && (
                        <Link to={guide.link.to} className="ht-link">
                          {guide.link.label} <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      )}
                      <button type="button" className="ht-copy" onClick={() => copyLink(guide.id)}>
                        <Link2 size={15} aria-hidden="true" /> {copiedId === guide.id ? 'Link copied' : 'Copy link to this guide'}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </section>
      ))}
    </AppShell>
  )
}
