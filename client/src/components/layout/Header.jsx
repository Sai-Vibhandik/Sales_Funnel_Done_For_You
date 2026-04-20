import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Bell, Search, User, ChevronDown, Settings, LogOut, HelpCircle, Check, ExternalLink, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Mobile Menu Button + Search */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-all duration-200 flex-shrink-0"
          >
            <Menu size={20} />
          </button>

          {/* Search - Hidden on very small screens */}
          <div className="hidden sm:block flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search projects, tasks, or contacts..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all duration-200"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center px-2 py-0.5 text-xs text-gray-400 bg-gray-100 rounded">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-4">
          {/* Notifications */}
          <div className="relative">
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
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white rounded-2xl shadow-lg border border-gray-100 z-20 overflow-hidden">
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
                          // Could navigate to a notifications page
                        }}
                        className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center gap-1"
                      >
                        View all notifications
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative">
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
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                  <div className="p-2">
                    <a
                      href="#profile"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <User size={16} />
                      Profile Settings
                    </a>
                    <a
                      href="#settings"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <Settings size={16} />
                      Account Settings
                    </a>
                    <a
                      href="#help"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <HelpCircle size={16} />
                      Help & Support
                    </a>
                  </div>
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
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}