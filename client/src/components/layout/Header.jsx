import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Bell, Search, ChevronDown, LogOut, Menu, Loader2, ArrowRight, Folder, CheckSquare, Users, Building2, Mail, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { searchService } from '@/services/api';

// Icons for different result types
const TYPE_ICONS = {
  project: Folder,
  task: CheckSquare,
  teamMember: Users,
};

const TYPE_COLORS = {
  project: { bg: 'bg-blue-50', text: 'text-blue-600' },
  task: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  teamMember: { bg: 'bg-purple-50', text: 'text-purple-600' },
};

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  paused: 'bg-amber-100 text-amber-700',
  archived: 'bg-gray-100 text-gray-700',
  todo: 'bg-gray-100 text-gray-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  final_approved: 'bg-emerald-100 text-emerald-700',
  content_pending: 'bg-amber-100 text-amber-700',
  content_submitted: 'bg-blue-100 text-blue-700',
  content_approved: 'bg-emerald-100 text-emerald-700',
  content_rejected: 'bg-red-100 text-red-700',
  design_pending: 'bg-amber-100 text-amber-700',
  design_submitted: 'bg-blue-100 text-blue-700',
  design_approved: 'bg-emerald-100 text-emerald-700',
  design_rejected: 'bg-red-100 text-red-700',
};

const ROLE_LABELS = {
  admin: 'Admin',
  platform_admin: 'Platform Admin',
  performance_marketer: 'Performance Marketer',
  ui_ux_designer: 'UI/UX Designer',
  graphic_designer: 'Graphic Designer',
  video_editor: 'Video Editor',
  developer: 'Developer',
  tester: 'Tester',
  content_creator: 'Content Creator',
  content_writer: 'Content Planner',
};

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Refs
  const notificationsRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await searchService.globalSearch(searchQuery);
        console.log('Search response:', response);

        // Handle both response formats: { data: {...} } or direct data
        let data;
        if (response && response.data && (response.data.projects || response.data.tasks || response.data.teamMembers)) {
          data = response.data;
        } else if (response && (response.projects || response.tasks || response.teamMembers)) {
          data = response;
        } else {
          data = { projects: [], tasks: [], teamMembers: [] };
        }

        const allResults = [
          ...(data.projects || []).map(p => ({
            ...p,
            type: 'project',
            path: `/dashboard/projects/${p._id}`,
          })),
          ...(data.tasks || []).map(t => ({
            ...t,
            type: 'task',
            path: `/dashboard/tasks/${t._id}`,
          })),
          ...(data.teamMembers || []).map(m => ({
            ...m,
            type: 'teamMember',
            path: `/dashboard/team?highlight=${m._id}`,
          })),
        ];

        console.log('Search results:', allResults.length, 'items');
        setSearchResults(allResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Handle keyboard navigation
  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (searchResults.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (searchResults.length || 1)) % (searchResults.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (searchResults.length > 0 && searchResults[selectedIndex]) {
        const path = searchResults[selectedIndex].path;
        console.log('Navigating to:', path);
        // Navigate first, then clear state
        navigate(path);
        setSearchQuery('');
        setShowSearchResults(false);
        setSearchResults([]);
        setSelectedIndex(0);
      }
    } else if (e.key === 'Escape') {
      setShowSearchResults(false);
      searchInputRef.current?.blur();
    }
  };

  // Handle selecting a result
  const handleSelectResult = (item) => {
    const path = item.path;
    console.log('Navigating to:', path);
    // Navigate first, then clear state
    navigate(path);
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
    setSelectedIndex(0);
  };

  // Role display names
  const roleLabels = {
    admin: 'Admin',
    performance_marketer: 'Performance Marketer',
    ui_ux_designer: 'UI/UX Designer',
    graphic_designer: 'Graphic Designer',
    video_editor: 'Video Editor',
    developer: 'Developer',
    tester: 'Tester',
    content_creator: 'Content Creator',
    content_writer: 'Content Planner',
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'project_assigned':
        return '📋';
      case 'project_updated':
        return '📝';
      case 'stage_completed':
        return '✅';
      case 'project_activated':
        return '🚀';
      default:
        return '🔔';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-all duration-200 flex-shrink-0"
        >
          <Menu size={20} />
        </button>

        {/* Search Input */}
        <div ref={searchRef} className="flex-1 min-w-0 max-w-2xl relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search projects, tasks, team members..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              autoComplete="off"
            />
            {searchLoading && (
              <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
            )}
          </div>

            {/* Search Results Dropdown */}
            {showSearchResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                {searchLoading ? (
                  <div className="p-6 text-center text-gray-500">
                    <Loader2 size={20} className="mx-auto mb-2 animate-spin text-primary-500" />
                    <p className="text-sm">Searching...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Search size={24} className="mx-auto mb-2 text-gray-200" />
                    <p className="text-sm font-medium">No results found</p>
                    <p className="text-xs mt-1 text-gray-400">Try different keywords</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((item, index) => {
                      const Icon = TYPE_ICONS[item.type] || Folder;
                      const colors = TYPE_COLORS[item.type] || TYPE_COLORS.project;
                      const isSelected = index === selectedIndex;
                      const statusColor = STATUS_COLORS[item.status?.toLowerCase()];

                      return (
                        <button
                          type="button"
                          key={`${item.type}-${item._id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSelectResult(item);
                          }}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                            isSelected ? "bg-primary-50" : "hover:bg-gray-50"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            colors.bg
                          )}>
                            <Icon size={16} className={colors.text} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate text-sm">
                                {item.name || item.title}
                              </p>
                              {item.status && (
                                <span className={cn(
                                  "text-xs font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap",
                                  statusColor
                                )}>
                                  {item.status.replace(/_/g, ' ')}
                                </span>
                              )}
                              {item.type === 'teamMember' && item.role && (
                                <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 whitespace-nowrap">
                                  {ROLE_LABELS[item.role] || item.role}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {item.type === 'project' && (
                                <span className="flex items-center gap-1">
                                  <Building2 size={10} />
                                  <span>{item.customerName || item.businessName || 'Project'}</span>
                                </span>
                              )}
                              {item.type === 'task' && (
                                <span className="flex items-center gap-1">
                                  <Folder size={10} />
                                  <span>{item.project?.projectName || 'Task'}</span>
                                </span>
                              )}
                              {item.type === 'teamMember' && (
                                <span className="flex items-center gap-1">
                                  <Mail size={10} />
                                  <span>{item.email}</span>
                                </span>
                              )}
                            </p>
                          </div>
                          <ArrowRight size={14} className={cn(
                            "flex-shrink-0 transition-opacity",
                            isSelected ? "text-primary-500 opacity-100" : "text-gray-300 opacity-0"
                          )} />
                        </button>
                      );
                    })}
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 text-center">
                    Press <kbd className="px-1 py-0.5 bg-white rounded border mx-0.5">Enter</kbd> to select
                  </div>
                )}
              </div>
            )}
          </div>
        

        {/* Right side */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-xl hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-all duration-200"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-[72px] sm:top-auto sm:mt-2 w-auto sm:w-96 max-w-sm bg-white rounded-2xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {unreadCount > 0
                        ? `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`
                        : 'All caught up!'
                      }
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                    >
                      <Check size={14} />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500 text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification._id}
                        className={cn(
                          'p-4 border-b border-gray-50 last:border-0',
                          !notification.isRead && 'bg-primary-50/30'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 rounded-full bg-primary-500 mt-2" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-3 border-t border-gray-100 bg-gray-50">
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                      }}
                      className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center gap-1"
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 sm:gap-3 p-1.5 sm:pr-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-xl object-cover" />
                ) : (
                  <span className="text-white text-sm font-semibold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{roleLabels[user?.role] || user?.role}</p>
              </div>
              <ChevronDown size={16} className="text-gray-400 hidden sm:block" />
            </button>

            {showDropdown && (
              <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-[72px] sm:top-auto sm:mt-2 w-auto sm:w-56 bg-white rounded-2xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                <div className="border-t border-gray-100 p-2">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}