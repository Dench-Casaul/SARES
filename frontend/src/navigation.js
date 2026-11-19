import {
  Activity,
  BarChart3,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from 'lucide-react'

// The app's main navigation, shared by every page's sidebar. Each page keeps its
// own sidebar markup and styling; only the list of links lives here, so adding or
// renaming a page is a single edit.
export const NAV_ITEMS = Object.freeze([
  { to: '/sares/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/sares/students', label: 'Students', icon: Users },
  { to: '/sares/rules', label: 'Rule Management', icon: ShieldCheck },
  { to: '/sares/reports', label: 'Reports', icon: BarChart3 },
  { to: '/sares/violation', label: 'Log Violation', icon: ClipboardList },
  { to: '/sares/account', label: 'Account Security', icon: KeyRound },
  { to: '/sares/system-logs', label: 'System Logs', icon: Activity, superadminOnly: true },
])

export function getNavItems(userProfile) {
  return NAV_ITEMS.filter((item) => !item.superadminOnly || userProfile?.role === 'superadmin')
}
