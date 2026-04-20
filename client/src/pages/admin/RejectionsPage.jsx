import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { rejectionService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardBody, Spinner, Button, Badge } from '@/components/ui';
import {
  AlertTriangle,
  User,
  FileText,
  ArrowLeft,
  Filter,
  XCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  ChevronRight,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

const ROLE_LABELS = {
  content_writer: 'Content Planner',
  graphic_designer: 'Graphic Designer',
  video_editor: 'Video Editor',
  ui_ux_designer: 'UI/UX Designer',
  developer: 'Developer',
};

const REASON_LABELS = {
  quality: 'Quality issues',
  brand: 'Brand guideline mismatch',
  instructions: 'Did not follow instructions',
  design: 'Design/Layout issues',
  content: 'Content/Copy issues',
  technical: 'Technical issues',
  other: 'Other',
};

const REASON_COLORS = {
  quality: 'bg-red-100 text-red-700',
  brand: 'bg-orange-100 text-orange-700',
  instructions: 'bg-yellow-100 text-yellow-700',
  design: 'bg-purple-100 text-purple-700',
  content: 'bg-blue-100 text-blue-700',
  technical: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-700',
};

const ROLE_COLORS = {
  content_writer: 'bg-emerald-100 text-emerald-700',
  graphic_designer: 'bg-pink-100 text-pink-700',
  video_editor: 'bg-cyan-100 text-cyan-700',
  ui_ux_designer: 'bg-purple-100 text-purple-700',
  developer: 'bg-green-100 text-green-700',
};

export default function RejectionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [rejections, setRejections] = useState([]);
  const [highRejectionUsers, setHighRejectionUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRejections, setUserRejections] = useState([]);
  const [filters, setFilters] = useState({
    days: 30,
    taskType: '',
    rejectedByRole: '',
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, filters.days]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, rejectionsRes, alertsRes] = await Promise.all([
        rejectionService.getRejectionStats(filters.days),
        rejectionService.getRejections({ limit: 50, ...filters }),
        rejectionService.getHighRejectionUsers(3, filters.days),
      ]);

      setStats(statsRes.data);
      setRejections(rejectionsRes.data);
      setHighRejectionUsers(alertsRes.data);
    } catch (error) {
      console.error('Error fetching rejections:', error);
      toast.error('Failed to load rejection data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserHistory = async (userId) => {
    try {
      const res = await rejectionService.getUserRejectionHistory(userId);
      setUserRejections(res.data);
      setSelectedUser(userId);
      setActiveTab('user-detail');
    } catch (error) {
      console.error('Error fetching user rejection history:', error);
      toast.error('Failed to load user rejection history');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rejection Tracking</h1>
            <p className="text-gray-500 mt-1">
              Monitor task rejections and team member performance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filters.days}
            onChange={(e) => setFilters({ ...filters, days: parseInt(e.target.value) })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Rejections</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats?.overall?.totalRejections || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-red-100">
                <XCircle size={24} className="text-red-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Members Affected</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats?.overall?.uniqueUsersRejected || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100">
                <Users size={24} className="text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Testers Who Rejected</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats?.overall?.uniqueRejecters || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-orange-100">
                <User size={24} className="text-orange-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">High Risk Members</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {highRejectionUsers?.length || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-yellow-100">
                <AlertTriangle size={24} className="text-yellow-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* High Rejection Alerts */}
      {highRejectionUsers && highRejectionUsers.length > 0 && (
        <Card className="bg-white border-l-4 border-l-yellow-500">
          <CardBody className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Members with High Rejection Rates</h3>
                <p className="text-sm text-gray-500 mt-1">
                  These team members have {filters.days >= 3 ? '3+' : 'multiple'} rejections in the last {filters.days} days.
                </p>
                <div className="mt-3 space-y-2">
                  {highRejectionUsers.map((u) => (
                    <div
                      key={u._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => fetchUserHistory(u._id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                          {u.rejectedUserName?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.rejectedUserName}</p>
                          <p className="text-sm text-gray-500">
                            {ROLE_LABELS[u.rejectedUserRole] || u.rejectedUserRole}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-red-100 text-red-700">
                          {u.totalRejections} rejections
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'overview'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('all-rejections')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'all-rejections'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            All Rejections
          </button>
          <button
            onClick={() => setActiveTab('by-reason')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'by-reason'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            By Reason
          </button>
          <button
            onClick={() => setActiveTab('by-role')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'by-role'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            By Role
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Reason Chart */}
          <Card className="bg-white">
            <CardBody className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Rejections by Reason</h3>
              <div className="space-y-3">
                {stats?.byReason?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          REASON_COLORS[item.reason] || 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {REASON_LABELS[item.reason] || item.reason}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{
                            width: `${(item.count / (stats?.overall?.totalRejections || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* By Role Chart */}
          <Card className="bg-white">
            <CardBody className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Rejections by Role</h3>
              <div className="space-y-3">
                {stats?.byRole?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          ROLE_COLORS[item.role] || 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {ROLE_LABELS[item.role] || item.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${(item.count / (stats?.overall?.totalRejections || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* User Stats */}
          <Card className="bg-white lg:col-span-2">
            <CardBody className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Team Member Rejection Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Member</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Role</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Rejections</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Last Rejection</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.userStats?.map((u, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-medium">
                              {u.rejectedUserName?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">{u.rejectedUserName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={ROLE_COLORS[u.rejectedUserRole] || 'bg-gray-100 text-gray-700'}>
                            {ROLE_LABELS[u.rejectedUserRole] || u.rejectedUserRole}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={cn(
                              'px-2 py-1 rounded text-sm font-medium',
                              u.totalRejections >= 3 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            )}
                          >
                            {u.totalRejections}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-500">
                          {u.lastRejection ? formatDate(u.lastRejection) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fetchUserHistory(u._id)}
                          >
                            View Details
                            <ChevronRight size={16} className="ml-1" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(!stats?.userStats || stats.userStats.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          No rejection data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'all-rejections' && (
        <Card className="bg-white">
          <CardBody className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">All Rejections</h3>
            <div className="space-y-4">
              {rejections?.map((rejection) => (
                <div
                  key={rejection._id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={REASON_COLORS[rejection.rejectionReason]}>
                          {REASON_LABELS[rejection.rejectionReason]}
                        </Badge>
                        <Badge className={ROLE_COLORS[rejection.rejectedUserRole]}>
                          {ROLE_LABELS[rejection.rejectedUserRole]}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          by {rejection.rejectedByRole === 'performance_marketer' ? 'Marketer' : 'Tester'}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 truncate">
                        {rejection.taskTitle}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Task Type: {rejection.taskType?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        "{rejection.rejectionNote}"
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <User size={14} />
                        <span>{rejection.rejectedUserName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <Clock size={14} />
                        <span>{formatDate(rejection.createdAt)}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Rejected by: {rejection.rejectedByName}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!rejections || rejections.length === 0) && (
                <div className="py-8 text-center text-gray-500">
                  No rejections found for the selected period
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {activeTab === 'by-reason' && (
        <Card className="bg-white">
          <CardBody className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Rejections by Reason</h3>
            <div className="space-y-6">
              {stats?.byReason?.map((item) => (
                <div key={item.reason} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">
                      {REASON_LABELS[item.reason] || item.reason}
                    </h4>
                    <Badge className="bg-red-100 text-red-700">
                      {item.count} rejection{item.count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full"
                      style={{
                        width: `${(item.count / (stats?.overall?.totalRejections || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {(!stats?.byReason || stats.byReason.length === 0) && (
                <div className="py-8 text-center text-gray-500">
                  No rejection data available
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {activeTab === 'by-role' && (
        <Card className="bg-white">
          <CardBody className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Rejections by Role</h3>
            <div className="space-y-6">
              {stats?.byRole?.map((item) => (
                <div key={item.role} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">
                      {ROLE_LABELS[item.role] || item.role}
                    </h4>
                    <Badge className={ROLE_COLORS[item.role] || 'bg-gray-100 text-gray-700'}>
                      {item.count} rejection{item.count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                      style={{
                        width: `${(item.count / (stats?.overall?.totalRejections || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {(!stats?.byRole || stats.byRole.length === 0) && (
                <div className="py-8 text-center text-gray-500">
                  No rejection data available
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* User Detail Modal */}
      {activeTab === 'user-detail' && selectedUser && (
        <Card className="bg-white">
          <CardBody className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('overview')}>
                  <ArrowLeft size={16} className="mr-1" />
                  Back
                </Button>
                <h3 className="font-semibold text-gray-900">User Rejection History</h3>
              </div>
            </div>

            {/* User Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Rejections</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userRejections?.stats?.totalRejections || 0}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Most Common Reason</p>
                <p className="text-lg font-semibold text-gray-900">
                  {userRejections?.stats?.byReason?.[0]
                    ? REASON_LABELS[userRejections.stats.byReason[0].reason]
                    : '-'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Period</p>
                <p className="text-lg font-semibold text-gray-900">
                  Last {filters.days} days
                </p>
              </div>
            </div>

            {/* Rejection List */}
            <div className="space-y-3">
              {userRejections?.rejections?.map((rejection) => (
                <div key={rejection._id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900">{rejection.taskTitle}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {rejection.taskType?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        "{rejection.rejectionNote}"
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge className={REASON_COLORS[rejection.rejectionReason]}>
                        {REASON_LABELS[rejection.rejectionReason]}
                      </Badge>
                      <div className="text-sm text-gray-500 mt-2">
                        {formatDate(rejection.createdAt)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Rejected by: {rejection.rejectedByName}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!userRejections?.rejections || userRejections.rejections.length === 0) && (
                <div className="py-8 text-center text-gray-500">
                  No rejections found for this user
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}