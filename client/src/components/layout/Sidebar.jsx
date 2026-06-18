import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Users,
  CheckSquare,
  ClipboardCheck,
  FileCheck,
  BookOpen,
  Briefcase,
  CheckCircle,
  PenTool,
  Globe2,
  CreditCard,
} from 'lucide-react';
import growthValleyLogo from '@/assets/growth-valley-logo.webp';

// Role labels for display
const roleLabels = {
  platform_admin: 'Platform Admin',
  admin: 'Admin',
  performance_marketer: 'Performance Marketer',
  content_creator: 'Content Creator',
  content_writer: 'Content Planner',
  ui_ux_designer: 'UI/UX Designer',
  graphic_designer: 'Designer',
  video_editor: 'Video Editor',
  developer: 'Developer',
  tester: 'Tester',
};

// Navigation configurations per role
const navigationByRole = {
  // PLATFORM ADMIN
  platform_admin: [
    { name: 'Dashboard', href: '/dashboard/platform-admin?tab=overview', icon: LayoutDashboard },
    { name: 'Organizations', href: '/dashboard/platform-admin?tab=organizations', icon: Briefcase },
    { name: 'Users', href: '/dashboard/platform-admin?tab=users', icon: Users },
    { name: 'Plans', href: '/dashboard/platform-admin?tab=plans', icon: CheckSquare },
    { name: 'Prompts', href: '/dashboard/platform-admin?tab=prompts', icon: PenTool },
  ],

  // ADMIN
  admin: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Clients', href: '/dashboard/clients', icon: Briefcase },
    { name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
    { name: 'Team Management', href: '/dashboard/team', icon: Users },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Prompts', href: '/dashboard/prompts', icon: PenTool },
    // { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],

  // PERFORMANCE MARKETER
  performance_marketer: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
    { name: 'Creative Approvals', href: '/dashboard/tasks/approval', icon: CheckCircle },
    { name: 'Assets', href: '/dashboard/assets', icon: FileCheck },
  ],

  // Content Planner
  content_writer: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Projects', href: '/dashboard/projects', icon: FolderKanban },
    { name: 'My Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  ],

  // CONTENT CREATOR  (legacy - kept for backward compatibility)
  content_creator: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Projects', href: '/dashboard/projects', icon: FolderKanban },
    { name: 'My Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  ],

  // GRAPHIC DESIGNER
  graphic_designer: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Projects', href: '/dashboard/projects', icon: FolderKanban },
    { name: 'My Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  ],

  // VIDEO EDITOR
  video_editor: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Projects', href: '/dashboard/projects', icon: FolderKanban },
    { name: 'My Tasks', href: '/dashboard/tasks', icon: CheckSquare },
    { name: 'SOP Library', href: '/dashboard/sop-library', icon: BookOpen },
  ],

  // UI/UX DESIGNER
  ui_ux_designer: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Projects', href: '/dashboard/projects', icon: FolderKanban },
    { name: 'My Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  ],

  // DEVELOPER
  developer: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Projects', href: '/dashboard/projects', icon: FolderKanban },
    { name: 'My Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  ],

  // TESTER
  tester: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Projects', href: '/dashboard/projects', icon: FolderKanban },
    { name: 'Assets Awaiting Review', href: '/dashboard/tasks/review', icon: ClipboardCheck },
    { name: 'Approved Assets', href: '/dashboard/tasks/approved', icon: FileCheck },
  ],
};

export default function Sidebar({ collapsed, setCollapsed, open, setOpen }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();

  // Get navigation based on user role
  const role = user?.role || 'graphic_designer';
  const navigation = navigationByRole[role] || navigationByRole.graphic_designer;

  // Determine home link based on role
  const homeLink = role === 'platform_admin' ? '/platform-admin' : '/dashboard';

  // Helper to check if nav item is active
  // const isNavItemActive = (item) => {
  //   const itemUrl = new URL(item.href, 'http://localhost');
  //   const itemPath = itemUrl.pathname;
  //   const itemTab = itemUrl.searchParams.get('tab');

  //   // For platform admin pages, also check the tab param
  //   if (itemPath === '/platform-admin' && itemTab) {
  //     const currentTab = searchParams.get('tab');
  //     return location.pathname === itemPath && currentTab === itemTab;
  //   }

  //   // For dashboard routes
  //   if (itemPath === '/dashboard') {
  //     return location.pathname === '/dashboard';
  //   }

  //   // Check if pathname matches (for other routes)
  //   return location.pathname === itemPath ||
  //     (itemPath !== '/dashboard' && location.pathname.startsWith(itemPath));
  // };
// Fix 1: correct the path check
// const isNavItemActive = (item) => {
//   const itemUrl = new URL(item.href, 'http://localhost');
//   const itemPath = itemUrl.pathname;
//   const itemTab = itemUrl.searchParams.get('tab');

//   // ✅ Fix: match the actual path used in navigationByRole
//   if (itemPath === '/dashboard/platform-admin' && itemTab) {
//     const currentTab = searchParams.get('tab');
//     return location.pathname === itemPath && currentTab === itemTab;
//   }

//   if (itemPath === '/dashboard') {
//     return location.pathname === '/dashboard';
//   }

//   return location.pathname === itemPath ||
//     (itemPath !== '/dashboard' && location.pathname.startsWith(itemPath));
// };
const isNavItemActive = (item) => {
  const itemUrl = new URL(item.href, 'http://localhost');
  const itemPath = itemUrl.pathname;
  const itemTab = itemUrl.searchParams.get('tab');

  if (itemPath === '/dashboard/platform-admin' && itemTab) {
    const currentTab = searchParams.get('tab');

    // ✅ If no tab in URL, default to 'overview' (Dashboard item)
    if (!currentTab) {
      return itemTab === 'overview';
    }

    return location.pathname === itemPath && currentTab === itemTab;
  }

  if (itemPath === '/dashboard') {
    return location.pathname === '/dashboard';
  }

  return location.pathname === itemPath ||
    (itemPath !== '/dashboard' && location.pathname.startsWith(itemPath));
};
  return (
    <>
      {/* Mobile Sidebar - Overlay mode */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 bg-dark-300 border-r border-dark-200',
          'w-64 flex flex-col',
          // Mobile: slide-in overlay
          'lg:hidden transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-dark-200">
          <Link to={homeLink} className="flex items-center" onClick={() => setOpen(false)}>
            <img
              src={growthValleyLogo}
              alt="Growth Valley"
              className="h-28 w-auto mx-auto rounded-lg object-contain"
            />
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-dark-200 transition-all duration-200 lg:hidden"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 dark-sidebar">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = isNavItemActive(item);
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-dark-200 text-primary-500 border-l-2 border-primary-500'
                        : 'text-gray-400 hover:bg-dark-200 hover:text-white-500'
                    )}
                  >
                    <item.icon
                      size={20}
                      className={cn(
                        'transition-colors duration-200',
                        isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-primary-500'
                      )}
                    />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section - Mobile */}
        <div className="border-t border-dark-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-dark-200 rounded-xl flex items-center justify-center ring-2 ring-primary-500/20">
              <User size={18} className="text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {roleLabels[role] || role}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl hover:bg-dark-200 text-gray-400 hover:text-white transition-all duration-200"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar - Fixed with collapse */}
      <aside
        className={cn(
          'hidden lg:flex fixed left-0 top-0 z-40 h-screen bg-dark-300 border-r border-dark-200 transition-[width] duration-300',
          'flex-col',
          collapsed ? 'lg:w-20' : 'lg:w-64'
        )}
      >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-dark-200">
        {!collapsed && (
          <Link to={homeLink} className="flex items-center">
            <img
              src={growthValleyLogo}
              alt="Growth Valley"
              className="h-28 w-auto mx-auto rounded-lg object-contain"
            />
          </Link>
        )}
        {collapsed && (
          <img
            src={growthValleyLogo}
            alt="Growth Valley"
            className="w-8 h-8 mx-auto rounded-lg object-cover shadow-lg"
          />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-dark-200 transition-all duration-200"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
    <nav className="flex-1 overflow-y-auto py-4 px-3">
  <ul className="space-y-1">
    {navigation.map((item) => {
      const isActive = isNavItemActive(item);
      return (
        <li key={item.name}>
          <Link
            to={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-dark-200 text-primary-500 border-l-2 border-primary-500'
                : 'text-gray-400 hover:bg-dark-200 hover:text-white-500',
              collapsed && 'justify-center'
            )}
            title={collapsed ? item.name : undefined}
          >
            <item.icon
              size={20}
              className={cn(
                'transition-colors duration-200',
                isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-primary-500'
              )}
            />
            {!collapsed && <span>{item.name}</span>}
          </Link>
        </li>
      );
    })}
  </ul>
</nav>

      {/* User section */}
      <div className="border-t border-dark-200 p-4">
        {collapsed ? (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={logout}
              className="p-2 rounded-xl hover:bg-dark-200 text-gray-400 hover:text-white transition-all duration-200"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-dark-200 rounded-xl flex items-center justify-center ring-2 ring-primary-500/20">
              <User size={18} className="text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {roleLabels[role] || role}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl hover:bg-dark-200 text-gray-400 hover:text-white transition-all duration-200"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}