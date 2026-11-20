import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAuthProfile } from './authContext'
import { getNavItems } from './navigation'
import { useLogout } from './useLogout'
import wesleyLogo from './assets/wesley-logo.png'
import './css/AppShell.css'

/**
 * Shared page layout: the SARES sidebar (icon rail on desktop, slide-in menu on
 * mobile) plus the main content area. Pages render their content as children.
 */
export default function AppShell({ children, mainClassName = '' }) {
  const { userProfile } = useAuthProfile()
  const location = useLocation()
  const handleLogout = useLogout()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-page">
      <div className="app-mobile-menu-bar">
        <div className="app-logo">
          <div className="app-logo-icon"><img src={wesleyLogo} alt="" className="school-logo" /></div>
          <span className="app-logo-text">SARES</span>
        </div>
        <button
          type="button"
          className="app-mobile-menu-btn"
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <aside className={`app-sidebar${sidebarOpen ? ' app-sidebar--open' : ''}`}>
        <div className="app-sidebar-header">
          <div className="app-logo">
            <div className="app-logo-icon">
              <img src={wesleyLogo} alt="Olongapo Wesley School Logo" className="school-logo" />
            </div>
            <span className="app-logo-text">SARES</span>
          </div>
        </div>

        <nav className="app-nav" aria-label="Main navigation">
          <ul className="app-nav-list">
            {getNavItems(userProfile).map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to
              return (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={() => setSidebarOpen(false)}
                    className={`app-nav-item${active ? ' app-nav-item--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="app-nav-icon" aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="app-sidebar-footer">
          <button type="button" className="app-logout-btn" onClick={handleLogout}>
            <LogOut className="app-nav-icon" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className={`app-main${mainClassName ? ` ${mainClassName}` : ''}`}>
        {children}
      </main>
    </div>
  )
}
