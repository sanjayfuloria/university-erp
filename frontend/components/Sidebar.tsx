'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getUser, clearAuth } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid', roles: ['super_admin', 'academic_admin'] },
  { href: '/leads', label: 'Leads', icon: 'users-plus', roles: ['super_admin', 'academic_admin'] },
  { href: '/applications', label: 'Applications', icon: 'file-text', roles: ['super_admin', 'academic_admin', 'faculty', 'applicant'] },
  { href: '/students', label: 'Students', icon: 'graduation-cap', roles: ['super_admin', 'academic_admin', 'faculty'] },
  { href: '/programs', label: 'Programs', icon: 'book-open', roles: ['super_admin', 'academic_admin'] },
  { href: '/courses', label: 'Courses', icon: 'book-open', roles: ['super_admin', 'academic_admin', 'faculty'] },
  { href: '/timetable', label: 'Timetable', icon: 'grid', roles: ['super_admin', 'academic_admin', 'faculty', 'student'] },
  { href: '/attendance', label: 'Attendance', icon: 'file-text', roles: ['super_admin', 'academic_admin', 'faculty'] },
  { href: '/examinations', label: 'Examinations', icon: 'file-text', roles: ['super_admin', 'academic_admin', 'faculty'] },
  { href: '/results', label: 'Results', icon: 'graduation-cap', roles: ['super_admin', 'academic_admin', 'faculty', 'student'] },
  { href: '/fees', label: 'Fees', icon: 'file-text', roles: ['super_admin', 'academic_admin', 'student'] },
  { href: '/faculty-hr', label: 'Faculty & HR', icon: 'users-plus', roles: ['super_admin', 'academic_admin', 'faculty'] },
  { href: '/placement', label: 'Placement', icon: 'graduation-cap', roles: ['super_admin', 'academic_admin'] },
  { href: '/analytics', label: 'Analytics', icon: 'grid', roles: ['super_admin', 'academic_admin'] },
  { href: '/import', label: 'CSV Import', icon: 'file-text', roles: ['super_admin', 'academic_admin'] },
];

const ICONS: Record<string, JSX.Element> = {
  'grid': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  'users-plus': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  'file-text': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  'graduation-cap': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 002-2v-5" />
    </svg>
  ),
  'book-open': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  ),
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const filteredNav = NAV_ITEMS.filter(item =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-surface-200 flex flex-col z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-surface-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-700 rounded-lg flex items-center justify-center text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 002-2v-5" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)' }} className="font-semibold text-brand-950 text-sm">University ERP</div>
            <div className="text-[11px] text-gray-400">Admissions Module</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-gray-600 hover:bg-surface-50 hover:text-gray-900'
              }`}
            >
              <span className={isActive ? 'text-brand-600' : 'text-gray-400'}>
                {ICONS[item.icon]}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-surface-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-semibold">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-800 truncate">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-[11px] text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
