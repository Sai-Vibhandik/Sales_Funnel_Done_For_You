import { useState, useEffect, useRef  } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { platformAdminService } from '@/services/platformAdmin';
import { Card, CardBody, Spinner, Button, Badge, Modal } from '@/components/ui';
import {
  Building2,
  Users,
  CreditCard,
  FileText,
  Activity,
  Globe2,
  Shield,
  Search,
  ChevronRight,
  X,
  Check,
  Ban,
  Play,
  Pause,
  Trash2,
  Edit,
  Plus,
  Eye,
  Download,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Clock,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  Power,
  Sparkles,
  ChevronDown,
  Tag,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

// Tab configuration
const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'organizations', label: 'Organizations', icon: Building2 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'plans', label: 'Plans', icon: CreditCard },
  { id: 'prompts', label: 'Prompts', icon: FileText },
  { id: 'sop-library', label: 'SOP Library', icon: BookOpen },
  { id: 'logs', label: 'Logs', icon: Activity },
];

// Role badge colors
const ROLE_COLORS = {
  platform_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
  performance_marketer: 'bg-blue-100 text-blue-700',
  content_writer: 'bg-emerald-100 text-emerald-700',
  graphic_designer: 'bg-pink-100 text-pink-700',
  video_editor: 'bg-cyan-100 text-cyan-700',
  ui_ux_designer: 'bg-violet-100 text-violet-700',
  developer: 'bg-green-100 text-green-700',
  tester: 'bg-orange-100 text-orange-700',
  content_creator: 'bg-yellow-100 text-yellow-700',
};

// Role display names mapping
const ROLE_DISPLAY_NAMES = {
  admin: 'Admin',
  platform_admin: 'Platform Admin',
  performance_marketer: 'Performance Marketer',
  content_writer: 'Content Planner',
  graphic_designer: 'Graphic Designer',
  video_editor: 'Video Editor',
  ui_ux_designer: 'UI/UX Designer',
  developer: 'Developer',
  tester: 'Tester',
};

// Plan colors - based on plan name keywords
const PLAN_COLOR_KEYWORDS = [
  { keyword: 'free', color: 'bg-gray-100 text-gray-700' },
  { keyword: 'starter', color: 'bg-blue-100 text-blue-700' },
  { keyword: 'basic', color: 'bg-slate-100 text-slate-700' },
  { keyword: 'pro', color: 'bg-purple-100 text-purple-700' },
  { keyword: 'growth', color: 'bg-green-100 text-green-700' },
  { keyword: 'scale', color: 'bg-cyan-100 text-cyan-700' },
  { keyword: 'enterprise', color: 'bg-amber-100 text-amber-700' },
  { keyword: 'premium', color: 'bg-indigo-100 text-indigo-700' },
];

// Get plan color with fallback based on plan name
const getPlanColor = (planName) => {
  if (!planName) return 'bg-gray-100 text-gray-700';
  const lowerName = planName.toLowerCase();
  const match = PLAN_COLOR_KEYWORDS.find(p => lowerName.includes(p.keyword));
  return match ? match.color : 'bg-gray-100 text-gray-700';
};

// Shared helper to get plan display name from org object
const getPlanName = (org) => {
  return org?.planName || org?.plan || 'Free';
};

// Chart colors
const CHART_COLORS = {
  blue: '#3B82F6',
  purple: '#8B5CF6',
  green: '#10B981',
  orange: '#F97316',
  pink: '#EC4899',
  cyan: '#06B6D4',
  amber: '#F59E0B',
  red: '#EF4444',
  teal: '#14B8A6',
  indigo: '#6366F1',
};

const ROLE_CHART_COLORS = [
  '#8B5CF6', '#EF4444', '#3B82F6', '#10B981', '#EC4899',
  '#06B6D4', '#F59E0B', '#14B8A6', '#6366F1', '#F97316'
];

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-100 p-3">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-500">{entry.name}:</span>
            <span className="font-semibold text-gray-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Stat Card Component (compact for top row)
function StatCard({ title, value, subtitle, icon: Icon, iconBg }) {
  return (
    <Card className="relative overflow-hidden">
      <CardBody className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-xl', iconBg)}>
            <Icon size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium truncate">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// Overview Tab with Charts
function OverviewTab({ stats, loading, plans }) {
  if (loading) return <Spinner size="lg" className="mx-auto mt-8" />;

  // Map plan value to display name using plans data
  const planNameToDisplay = (planValue) => {
    if (!planValue) return 'Free';
    const normalizedValue = planValue.toLowerCase().trim();
    if (normalizedValue === 'free' || normalizedValue === 'free plan' || normalizedValue === 'freeplan') {
      return 'Free';
    }
    const matchingPlan = plans?.find(p =>
      p.name?.toLowerCase() === normalizedValue ||
      p.displayName?.toLowerCase() === normalizedValue ||
      p._id?.toString() === planValue
    );
    if (matchingPlan) {
      return matchingPlan.displayName || matchingPlan.name;
    }
    const legacyMapping = {
      'starter': 'Starter',
      'pro': 'Pro',
      'enterprise': 'Enterprise',
      'growth': 'Growth',
      'scale': 'Scale',
      'grand': 'Grand'
    };
    const withoutPlanSuffix = normalizedValue.replace(/\s*plan$/i, '');
    if (legacyMapping[withoutPlanSuffix]) {
      return legacyMapping[withoutPlanSuffix];
    }
    const cleanValue = planValue.replace(/\s*plan$/i, '');
    return cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1).toLowerCase();
  };

  const getPlanChartColor = (planName, index) => {
    const colors = ['#6B7280', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#06B6D4', '#6366F1', '#EC4899'];
    if (!planName) return colors[0];
    if (index !== undefined) return colors[index % colors.length];
    const hash = planName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const planDataMap = {};
  Object.entries(stats?.organizationsByPlan || {}).forEach(([plan, count]) => {
    const displayName = planNameToDisplay(plan);
    if (planDataMap[displayName]) {
      planDataMap[displayName] += count;
    } else {
      planDataMap[displayName] = count;
    }
  });

  const orgsByPlanData = Object.entries(planDataMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count], index) => ({
      name,
      value: count,
      color: getPlanChartColor(name, index),
    }));

  const usersByRoleData = Object.entries(stats?.usersByRole || {})
    .filter(([role]) => role !== 'platform_admin')
    .map(([role, count], index) => ({
      name: ROLE_DISPLAY_NAMES[role] || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count,
      color: ROLE_CHART_COLORS[index % ROLE_CHART_COLORS.length],
    }));

  const totalUsers = stats?.totalUsers || 0;
  const totalOrgs = stats?.totalOrganizations || 0;
  const activeUsers = stats?.activeUsers || 0;
  const activity = stats?.recentActivity || 0;

  return (
    <div className="space-y-6">
      {/* CHANGED: grid-cols-2 on mobile, md:grid-cols-4 unchanged */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Total Users" value={totalUsers} subtitle={`${activeUsers} active`} icon={Users} iconBg="bg-gradient-to-br from-blue-500 to-blue-600" />
        <StatCard title="Organizations" value={totalOrgs} icon={Building2} iconBg="bg-gradient-to-br from-purple-500 to-purple-600" />
        <StatCard title="Weekly Activity" value={activity} subtitle="actions logged" icon={Activity} iconBg="bg-gradient-to-br from-green-500 to-green-600" />
        <StatCard title="Platform Health" value="98%" subtitle="uptime" icon={Shield} iconBg="bg-gradient-to-br from-emerald-500 to-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                  <Users size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Users by Role</h3>
                  <p className="text-sm text-gray-500">Distribution across roles</p>
                </div>
              </div>
            </div>
            {usersByRoleData.length > 0 ? (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={usersByRoleData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                        {usersByRoleData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100">
                  {usersByRoleData.slice(0, 6).map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-gray-600 truncate">{item.name}</span>
                      <span className="text-xs font-semibold text-gray-900 ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <Users size={40} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No user data</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
                  <Building2 size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Organizations by Plan</h3>
                  <p className="text-sm text-gray-500">Subscription distribution</p>
                </div>
              </div>
            </div>
            {orgsByPlanData.length > 0 ? (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={orgsByPlanData} layout="vertical" barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                      <XAxis type="number" stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} width={80} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {orgsByPlanData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100">
                  {orgsByPlanData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-gray-600 truncate">{item.name}</span>
                      <span className="text-xs font-semibold text-gray-900 ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <Building2 size={40} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No organization data</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600">
              <Layers size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Platform Overview</h3>
              <p className="text-sm text-gray-500">Key metrics at a glance</p>
            </div>
          </div>
          {/* CHANGED: grid-cols-2 on mobile (was md:grid-cols-4 only) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-blue-600 flex-shrink-0" />
                <span className="text-sm text-blue-700 truncate">Total Users</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{totalUsers}</p>
              <p className="text-xs text-blue-600 mt-1">{activeUsers} active</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={16} className="text-purple-600 flex-shrink-0" />
                <span className="text-sm text-purple-700 truncate">Organizations</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{totalOrgs}</p>
              <p className="text-xs text-purple-600 mt-1">{orgsByPlanData.reduce((sum, item) => sum + item.value, 0)} total</p>
            </div>
            <div className="p-4 rounded-xl bg-green-50 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700 truncate">Weekly Activity</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{activity}</p>
              <p className="text-xs text-green-600 mt-1">actions logged</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-amber-600 flex-shrink-0" />
                <span className="text-sm text-amber-700 truncate">Health Status</span>
              </div>
              <p className="text-2xl font-bold text-amber-900">98%</p>
              <p className="text-xs text-amber-600 mt-1">system uptime</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// Organizations Tab
function OrganizationsTab() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [suspendModal, setSuspendModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [plans, setPlans] = useState([]);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [limitsModal, setLimitsModal] = useState(null);
  const [limitsData, setLimitsData] = useState({ maxUsers: 2, maxProjects: 2, maxLandingPages: 2 });
  const [limitsLoading, setLimitsLoading] = useState(false);

  const [orgMembers, setOrgMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await platformAdminService.getPlans();
        setPlans(response.data || []);
      } catch (error) {
        console.error('Failed to load plans:', error);
      }
    };
    fetchPlans();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (planFilter) params.plan = planFilter;
      const response = await platformAdminService.getOrganizations(params);
      setOrganizations(response.data || []);
    } catch (error) {
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [search, planFilter]);

  const handleViewOrg = async (org) => {
    setSelectedOrg(org);
    setOrgMembers([]);
    setMembersLoading(true);
    try {
      const orgIdStr = String(org._id);
      const response = await platformAdminService.getUsers({ groupByOrg: true });
      const data = response.data || [];

      if (Array.isArray(data) && data.length > 0 && data[0]?.members !== undefined) {
        const group = data.find(g => String(g.organization?._id) === orgIdStr);
        setOrgMembers(group?.members || []);
      } else if (Array.isArray(data)) {
        const filtered = data.filter(
          u => String(u.organizationId || u.organization?._id || u.organization) === orgIdStr
        );
        setOrgMembers(filtered);
      } else {
        setOrgMembers([]);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
      toast.error('Failed to load members');
    } finally {
      setMembersLoading(false);
    }
  };

  const handleSuspend = async (org, suspend = true) => {
    try {
      await platformAdminService.suspendOrganization(org._id, {
        reason: suspendReason,
        suspend,
      });
      toast.success(suspend ? 'Organization suspended' : 'Organization unsuspended');
      setSuspendModal(null);
      setSuspendReason('');
      fetchOrganizations();
    } catch (error) {
      toast.error(error.message || 'Failed to update organization');
    }
  };

  const handleDelete = async (org) => {
    try {
      setDeleteLoading(true);
      const response = await platformAdminService.deleteOrganization(org._id);
      toast.success(`Organization "${org.name}" deleted. ${response.data?.deletedUsers || 0} users removed.`);
      setDeleteModal(null);
      setSelectedOrg(null);
      setOrgMembers([]);
      fetchOrganizations();
    } catch (error) {
      toast.error(error.message || 'Failed to delete organization');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openLimitsModal = (org) => {
    setLimitsModal(org);
    setLimitsData({
      maxUsers: org.planLimits?.maxUsers || 2,
      maxProjects: org.planLimits?.maxProjects || 2,
      maxLandingPages: org.planLimits?.maxLandingPages || 2,
    });
  };

  const handleUpdateLimits = async () => {
    if (!limitsModal) return;
    try {
      setLimitsLoading(true);
      await platformAdminService.updateOrganizationLimits(limitsModal._id, limitsData);
      toast.success('Organization limits updated successfully');
      setLimitsModal(null);
      fetchOrganizations();
    } catch (error) {
      toast.error(error.message || 'Failed to update limits');
    } finally {
      setLimitsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters — CHANGED: stack on mobile */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Plans</option>
            {plans.map((plan) => (
              <option key={plan._id} value={plan.name}>{plan.name}</option>
            ))}
          </select>
          <Button variant="outline" onClick={fetchOrganizations} className="flex-shrink-0">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Organizations List */}
      {loading ? (
        <Spinner size="lg" className="mx-auto mt-8" />
      ) : organizations.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No organizations found</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {organizations.map((org) => (
            <Card key={org._id} className="hover:shadow-md transition-shadow">
              <CardBody className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg">
                      {org.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{org.name}</h3>
                        {org.isActive === false && (
                          <Badge className="bg-red-100 text-red-700 flex-shrink-0">Suspended</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{org.owner?.email || 'No owner'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getPlanColor(getPlanName(org))}>
                        {getPlanName(org)}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button variant="ghost" size="sm" onClick={() => handleViewOrg(org)} title="View">
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:bg-blue-50"
                        onClick={() => openLimitsModal(org)}
                        title="Set Limits"
                      >
                        <Layers size={16} />
                      </Button>
                      {org.isActive !== false ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-orange-600 hover:bg-orange-50"
                          onClick={() => setSuspendModal(org)}
                          title="Suspend"
                        >
                          <Ban size={16} />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => handleSuspend(org, false)}
                          title="Unsuspend"
                        >
                          <Play size={16} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteModal(org)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Suspend Modal */}
      <Modal isOpen={!!suspendModal} onClose={() => { setSuspendModal(null); setSuspendReason(''); }} size="md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Suspend Organization</h3>
          <p className="text-gray-600 mb-4">
            Are you sure you want to suspend <strong>{suspendModal?.name}</strong>?
          </p>
          <textarea
            placeholder="Reason for suspension..."
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
            rows={3}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setSuspendModal(null); setSuspendReason(''); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleSuspend(suspendModal, true)}>
              Suspend
            </Button>
          </div>
        </div>
      </Modal>

      {/* Limits Modal */}
      <Modal isOpen={!!limitsModal} onClose={() => setLimitsModal(null)} size="md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Set Organization Limits</h3>
          <p className="text-gray-600 mb-4">
            Set resource limits for <strong>{limitsModal?.name}</strong>
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
              <input
                type="number"
                min="1"
                value={limitsData.maxUsers}
                onChange={(e) => setLimitsData({ ...limitsData, maxUsers: parseInt(e.target.value) || 0 })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Projects</label>
              <input
                type="number"
                min="1"
                value={limitsData.maxProjects}
                onChange={(e) => setLimitsData({ ...limitsData, maxProjects: parseInt(e.target.value) || 0 })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Landing Pages</label>
              <input
                type="number"
                min="1"
                value={limitsData.maxLandingPages}
                onChange={(e) => setLimitsData({ ...limitsData, maxLandingPages: parseInt(e.target.value) || 0 })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setLimitsModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateLimits} disabled={limitsLoading}>
              {limitsLoading ? 'Saving...' : 'Save Limits'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} size="md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Delete Organization</h3>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 font-medium mb-2">This action cannot be undone!</p>
            <p className="text-red-700 text-sm">
              This will permanently delete <strong>{deleteModal?.name}</strong> and all associated data including:
            </p>
            <ul className="text-red-700 text-sm mt-2 list-disc list-inside">
              <li>All users in the organization</li>
              <li>All projects and landing pages</li>
              <li>Subscriptions and payments</li>
              <li>All other organization data</li>
            </ul>
          </div>
          <p className="text-gray-600 mb-4">
            Type <strong>{deleteModal?.name}</strong> to confirm:
          </p>
          <input
            type="text"
            placeholder="Type organization name to confirm"
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            id="delete-confirm-input"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteModal(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const inputValue = document.getElementById('delete-confirm-input')?.value;
                if (inputValue === deleteModal?.name) {
                  handleDelete(deleteModal);
                } else {
                  toast.error('Organization name does not match');
                }
              }}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Organization'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Organization Detail Modal */}
      <Modal isOpen={!!selectedOrg} onClose={() => { setSelectedOrg(null); setOrgMembers([]); }} size="2xl" showCloseButton={false}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg">
                {selectedOrg?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-semibold text-gray-900 truncate">{selectedOrg?.name}</h3>
                <p className="text-sm text-gray-500 truncate">{selectedOrg?.owner?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                onClick={() => {
                  setSelectedOrg(null);
                  setOrgMembers([]);
                  setDeleteModal(selectedOrg);
                }}
              >
                <Trash2 size={16} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedOrg(null); setOrgMembers([]); }}>
                <X size={18} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Plan</p>
              <Badge className={getPlanColor(getPlanName(selectedOrg))}>
                {getPlanName(selectedOrg)}
              </Badge>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <Badge className={selectedOrg?.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {selectedOrg?.isActive !== false ? 'Active' : 'Suspended'}
              </Badge>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Owner</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedOrg?.owner?.name || '—'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Created</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedOrg?.createdAt ? new Date(selectedOrg.createdAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-500" />
                <h4 className="text-sm font-semibold text-gray-900">Members & Roles</h4>
                {!membersLoading && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {orgMembers.length}
                  </span>
                )}
              </div>
            </div>

            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="sm" />
                <span className="ml-2 text-sm text-gray-500">Loading members...</span>
              </div>
            ) : orgMembers.length === 0 ? (
              <div className="py-8 text-center rounded-lg bg-gray-50 border border-dashed border-gray-200">
                <Users size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No members found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orgMembers.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                        {member.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                          {!member.isActive && (
                            <Badge className="bg-red-100 text-red-600 text-xs py-0 flex-shrink-0">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <Badge className={cn('text-xs capitalize', ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-700')}>
                        {ROLE_DISPLAY_NAMES[member.role] || member.role?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Users Tab - Grouped by Organization
function UsersTab() {
  const [groupedUsers, setGroupedUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [expandedOrgs, setExpandedOrgs] = useState({});
  const [roleModal, setRoleModal] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await platformAdminService.getPlans();
        setPlans(response.data || []);
      } catch (error) {
        console.error('Failed to load plans:', error);
      }
    };
    fetchPlans();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = { groupByOrg: true };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (orgFilter) params.organizationId = orgFilter;
      const response = await platformAdminService.getUsers(params);

      let data = response.data || [];
      if (roleFilter) {
        data = data.map(group => ({
          ...group,
          members: group.members.filter(m => m.role === roleFilter)
        })).filter(group => group.members.length > 0);
      }

      setGroupedUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await platformAdminService.getOrganizations({ limit: 100 });
      setOrganizations(response.data || []);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  useEffect(() => {
    fetchOrganizations();
    fetchUsers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, orgFilter]);

  const toggleOrg = (orgId) => {
    setExpandedOrgs(prev => ({
      ...prev,
      [orgId]: !prev[orgId]
    }));
  };

  const handleRoleChange = async () => {
    if (!roleModal || !selectedRole) return;
    try {
      await platformAdminService.updateUserRole(roleModal._id, { role: selectedRole });
      toast.success('Role updated successfully');
      setRoleModal(null);
      setSelectedRole('');
      fetchUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to update role');
    }
  };

  const getMemberCount = (group) => {
    return group.members.length;
  };

  return (
    <div className="space-y-4">
      {/* Filters — CHANGED: stack on mobile */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by org, user name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="">All Orgs</option>
            {organizations.map(org => (
              <option key={org._id} value={org._id}>{org.name}</option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="performance_marketer">Performance Marketer</option>
            <option value="content_writer">Content Writer</option>
            <option value="graphic_designer">Graphic Designer</option>
            <option value="video_editor">Video Editor</option>
            <option value="ui_ux_designer">UI/UX Designer</option>
            <option value="developer">Developer</option>
            <option value="tester">Tester</option>
          </select>
          <Button variant="outline" onClick={fetchUsers} className="flex-shrink-0">
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* Summary Stats — CHANGED: grid-cols-3 stays, just tightened padding */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardBody className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                <Building2 size={16} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900">{groupedUsers.length}</p>
                <p className="text-xs text-gray-500 truncate">Organizations</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-100 rounded-lg flex-shrink-0">
                <Users size={16} className="text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900">
                  {groupedUsers.reduce((sum, g) => sum + g.members.length, 0)}
                </p>
                <p className="text-xs text-gray-500 truncate">Members</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 rounded-lg flex-shrink-0">
                <Shield size={16} className="text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900">
                  {groupedUsers.filter(g => g.members.some(m => m.role === 'admin')).length}
                </p>
                <p className="text-xs text-gray-500 truncate">Admins</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Users List */}
      {loading ? (
        <Spinner size="lg" className="mx-auto mt-8" />
      ) : groupedUsers.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No users found</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupedUsers.map((group) => (
            <Card key={group.organization._id} className="overflow-hidden">
              <div
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleOrg(group.organization._id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                    {group.organization.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{group.organization.name}</h3>
                    <p className="text-sm text-gray-500">
                      {getMemberCount(group)} member{getMemberCount(group) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <Badge className={getPlanColor(getPlanName(group.organization))}>
                    {getPlanName(group.organization)}
                  </Badge>
                  <ChevronRight
                    size={20}
                    className={cn(
                      "text-gray-400 transition-transform",
                      expandedOrgs[group.organization._id] && "rotate-90"
                    )}
                  />
                </div>
              </div>

              {expandedOrgs[group.organization._id] && (
                <div className="border-t">
                  {group.members.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b last:border-b-0 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium">
                          {member.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 text-sm truncate">{member.name}</span>
                            {!member.isActive && (
                              <Badge className="bg-red-100 text-red-700 text-xs flex-shrink-0">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge className={ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-700'}>
                          {ROLE_DISPLAY_NAMES[member.role] || member.role?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Role Change Modal */}
      <Modal isOpen={!!roleModal} onClose={() => { setRoleModal(null); setSelectedRole(''); }} size="md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Change User Role</h3>
          <p className="text-gray-600 mb-4">Change role for <strong>{roleModal?.name}</strong></p>
          <p className="text-sm text-gray-500 mb-4">Email: {roleModal?.email}</p>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
          >
            <option value="admin">Admin</option>
            <option value="performance_marketer">Performance Marketer</option>
            <option value="content_writer">Content Writer</option>
            <option value="graphic_designer">Graphic Designer</option>
            <option value="video_editor">Video Editor</option>
            <option value="ui_ux_designer">UI/UX Designer</option>
            <option value="developer">Developer</option>
            <option value="tester">Tester</option>
          </select>
          {selectedRole === 'platform_admin' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <p className="text-sm text-yellow-800">
                <AlertTriangle size={16} className="inline mr-1" />
                Platform admin has full access to all organizations.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setRoleModal(null); setSelectedRole(''); }}>Cancel</Button>
            <Button onClick={handleRoleChange}>Update Role</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Plans Tab
function PlansTab() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [formData, setFormData] = useState({});

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await platformAdminService.getPlans();
      setPlans(response.data || []);
    } catch (error) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSave = async () => {
    try {
      if (editModal === 'new') {
        await platformAdminService.createPlan(formData);
        toast.success('Plan created successfully');
      } else {
        await platformAdminService.updatePlan(editModal, formData);
        toast.success('Plan updated successfully');
      }
      setEditModal(null);
      setFormData({});
      fetchPlans();
    } catch (error) {
      toast.error(error.message || 'Failed to save plan');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await platformAdminService.deletePlan(id);
      toast.success('Plan deleted successfully');
      fetchPlans();
    } catch (error) {
      toast.error(error.message || 'Failed to delete plan');
    }
  };

  const openEditModal = (plan = null) => {
    if (plan) {
      setEditModal(plan._id);
      setFormData(plan);
    } else {
      setEditModal('new');
      setFormData({
        name: '',
        monthlyPrice: 0,
        yearlyPrice: 0,
        limits: { maxUsers: 1, maxProjects: 1 },
        features: {},
        isActive: true,
        isPublic: true,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Pricing Plans</h3>
        <Button onClick={() => openEditModal()}>
          <Plus size={16} className="mr-2" />
          Add Plan
        </Button>
      </div>

      {loading ? (
        <Spinner size="lg" className="mx-auto mt-8" />
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <Card key={plan._id} className="hover:shadow-md transition-shadow">
              <CardBody className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="text-lg font-bold text-gray-900">{plan.name || 'Unnamed Plan'}</h4>
                      {plan.isActive ? (
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-baseline gap-4 mb-3 flex-wrap">
                      <div>
                        <span className="text-2xl font-bold text-gray-900">₹{plan.monthlyPrice || 0}</span>
                        <span className="text-gray-500">/month</span>
                      </div>
                      {plan.yearlyPrice > 0 && (
                        <div className="text-sm">
                          <span className="font-semibold text-gray-900">₹{plan.yearlyPrice}</span>
                          <span className="text-gray-500">/year</span>
                        </div>
                      )}
                    </div>
                    {/* CHANGED: 2-col grid on mobile instead of 4 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Users:</span>
                        <span className="ml-1 font-medium">
                          {plan.limits?.maxUsers === -1 ? 'Unlimited' : plan.limits?.maxUsers || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Projects:</span>
                        <span className="ml-1 font-medium">
                          {plan.limits?.maxProjects === -1 ? 'Unlimited' : plan.limits?.maxProjects || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Landing Pages:</span>
                        <span className="ml-1 font-medium">
                          {plan.limits?.maxLandingPages === -1 ? 'Unlimited' : plan.limits?.maxLandingPages || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(plan)}>
                      <Edit size={14} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(plan._id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Plan Modal */}
      <Modal isOpen={!!editModal} onClose={() => { setEditModal(null); setFormData({}); }} size="lg">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editModal === 'new' ? 'Create Plan' : 'Edit Plan'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border border-gray-200 rounded-lg"
                placeholder="e.g., Starter, Growth, Pro"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.monthlyPrice || 0}
                  onChange={(e) => setFormData({ ...formData, monthlyPrice: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.yearlyPrice || 0}
                  onChange={(e) => setFormData({ ...formData, yearlyPrice: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                <input
                  type="number"
                  min="-1"
                  value={formData.limits?.maxUsers || 0}
                  onChange={(e) => setFormData({ ...formData, limits: { ...formData.limits, maxUsers: parseInt(e.target.value) || 0 } })}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Enter -1 for unlimited</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Projects</label>
                <input
                  type="number"
                  min="-1"
                  value={formData.limits?.maxProjects || 0}
                  onChange={(e) => setFormData({ ...formData, limits: { ...formData.limits, maxProjects: parseInt(e.target.value) || 0 } })}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Enter -1 for unlimited</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Landing Pages</label>
              <input
                type="number"
                min="-1"
                value={formData.limits?.maxLandingPages || 0}
                onChange={(e) => setFormData({ ...formData, limits: { ...formData.limits, maxLandingPages: parseInt(e.target.value) || 0 } })}
                className="w-full p-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive !== false}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPublic !== false}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Public</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => { setEditModal(null); setFormData({}); }}>Cancel</Button>
            <Button onClick={handleSave}>{editModal === 'new' ? 'Create Plan' : 'Save Changes'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Prompts Tab - Full CRUD
function PromptsTab() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [expandedFrameworks, setExpandedFrameworks] = useState({});

  const roleOptions = [
    { value: 'content_writer', label: 'Content Planner' },
    { value: 'graphic_designer', label: 'Graphic Designer' },
    { value: 'video_editor', label: 'Video Editor' },
    { value: 'ui_ux_designer', label: 'UI/UX Designer' },
    { value: 'developer', label: 'Developer' },
    { value: 'tester', label: 'Tester' },
  ];

  const frameworkOptions = [
    { value: 'PAS', label: 'PAS - Problem-Agitate-Solution' },
    { value: 'AIDA', label: 'AIDA - Attention-Interest-Desire-Action' },
    { value: 'BAB', label: 'BAB - Before-After-Bridge' },
    { value: '4C', label: '4C - Clear-Concise-Compelling-Credible' },
    { value: 'STORY', label: 'STORY - Storytelling Framework' },
    { value: 'DIRECT_RESPONSE', label: 'Direct Response' },
    { value: 'HOOKS', label: 'Hook Generator' },
    { value: 'OBJECTION', label: 'Objection Handling' },
    { value: 'PASTOR', label: 'PASTOR Framework' },
    { value: 'QUEST', label: 'QUEST Framework' },
    { value: 'ACCA', label: 'ACCA Framework' },
    { value: 'FAB', label: 'FAB - Features-Advantages-Benefits' },
    { value: '5A', label: '5A Framework' },
    { value: 'SLAP', label: 'SLAP Framework' },
    { value: 'HOOK_STORY_OFFER', label: 'Hook-Story-Offer' },
    { value: '4P', label: '4P - Picture-Promise-Prove-Push' },
    { value: 'MASTER', label: 'MASTER - Multi-Framework' },
  ];

  const getFrameworkLabel = (framework) => {
    const option = frameworkOptions.find(f => f.value === framework);
    return option ? option.label : framework;
  };

  const toggleFramework = (framework) => {
    setExpandedFrameworks(prev => ({
      ...prev,
      [framework]: !prev[framework]
    }));
  };

  const contentWriterPrompts = prompts.filter(p => p.role === 'content_writer');
  const otherRolePrompts = prompts.filter(p => p.role !== 'content_writer');

  const groupedByFramework = contentWriterPrompts
    .filter(p => p.frameworkType)
    .reduce((acc, prompt) => {
      const framework = prompt.frameworkType;
      if (!acc[framework]) {
        acc[framework] = { prompts: [], subcategories: {} };
      }
      acc[framework].prompts.push(prompt);
      if (prompt.subCategory) {
        if (!acc[framework].subcategories[prompt.subCategory]) {
          acc[framework].subcategories[prompt.subCategory] = [];
        }
        acc[framework].subcategories[prompt.subCategory].push(prompt);
      }
      return acc;
    }, {});

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (roleFilter && roleFilter !== '') params.role = roleFilter;
      if (search && search.trim()) params.search = search.trim();
      const response = await platformAdminService.getPrompts(params);
      setPrompts(response.data || []);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      toast.error('Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, [roleFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPrompts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreateModal = () => {
    setEditModal('new');
    setFormData({
      title: '',
      role: 'content_writer',
      frameworkType: '',
      content: '',
      category: 'general',
      platform: 'all',
      funnelStage: 'all',
      creativeType: 'all',
      description: '',
      tags: '',
      isActive: true,
    });
  };

  const openEditModal = (prompt) => {
    setEditModal(prompt._id);
    setFormData({
      title: prompt.title || '',
      role: prompt.role || 'content_writer',
      frameworkType: prompt.frameworkType || '',
      content: prompt.content || '',
      category: prompt.category || 'general',
      platform: prompt.platform || 'all',
      funnelStage: prompt.funnelStage || 'all',
      creativeType: prompt.creativeType || 'all',
      description: prompt.description || '',
      tags: Array.isArray(prompt.tags) ? prompt.tags.join(', ') : prompt.tags || '',
      isActive: prompt.isActive !== false,
    });
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) { toast.error('Title is required'); return; }
    if (!formData.content?.trim()) { toast.error('Prompt content is required'); return; }
    // if (formData.role === 'content_writer' && !formData.frameworkType) {
    //   toast.error('Framework type is required for Content Planner role'); return;
    // }
    setSaving(true);
    try {
      const promptData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        isSystem: true,
      };
      if (editModal === 'new') {
        await platformAdminService.createPrompt(promptData);
        toast.success('Prompt created successfully');
      } else {
        await platformAdminService.updatePrompt(editModal, promptData);
        toast.success('Prompt updated successfully');
      }
      setEditModal(null);
      setFormData({});
      fetchPrompts();
    } catch (error) {
      toast.error(error.message || 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    try {
      await platformAdminService.deletePrompt(id);
      toast.success('Prompt deleted successfully');
      fetchPrompts();
    } catch (error) {
      toast.error(error.message || 'Failed to delete prompt');
    }
  };

  const handleToggleActive = async (prompt) => {
    try {
      await platformAdminService.updatePrompt(prompt._id, { isActive: !prompt.isActive });
      toast.success(`Prompt ${prompt.isActive ? 'deactivated' : 'activated'}`);
      fetchPrompts();
    } catch (error) {
      toast.error('Failed to update prompt');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex-shrink-0">
            <FileText size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">System Prompts</h3>
            <p className="text-sm text-gray-500 hidden sm:block">Manage AI prompts for all organizations</p>
          </div>
        </div>
        <Button onClick={openCreateModal} className="flex-shrink-0">
          <Plus size={16} className="mr-2" />
          Add
        </Button>
      </div>

      {/* CHANGED: stack filters on mobile */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="">All Roles</option>
            {roleOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Button variant="outline" onClick={fetchPrompts} className="flex-shrink-0">
            <RefreshCw size={16} />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {loading ? (
        <Spinner size="lg" className="mx-auto mt-8" />
      ) : prompts.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No prompts found</p>
            <Button onClick={openCreateModal}>
              <Plus size={16} className="mr-2" />
              Create First Prompt
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {(roleFilter === 'content_writer' || roleFilter === '') && contentWriterPrompts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-500" />
                Content Planner Frameworks
              </h3>
              {Object.entries(groupedByFramework).map(([framework, data]) => {
                const frameworkPrompts = data.prompts || [];
                const subcategories = data.subcategories || {};
                const subcategoryKeys = Object.keys(subcategories);
                const uncategorizedPrompts = frameworkPrompts.filter(p => !p.subCategory);
                return (
                  <Card key={framework} className="overflow-hidden">
                    <button
                      onClick={() => toggleFramework(framework)}
                      className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center justify-between hover:from-purple-100 hover:to-indigo-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0" />
                        <div className="text-left min-w-0">
                          <div className="font-medium text-gray-900 truncate">{getFrameworkLabel(framework)}</div>
                          <div className="text-sm text-gray-500">
                            {frameworkPrompts.length} prompt{frameworkPrompts.length !== 1 ? 's' : ''}
                            {subcategoryKeys.length > 0 && (
                              <span className="ml-2 text-purple-600">
                                • {subcategoryKeys.length} sub
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {expandedFrameworks[framework] ? (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {expandedFrameworks[framework] && (
                      <div className="p-4">
                        {subcategoryKeys.length > 0 && (
                          <div className="space-y-4 mb-4">
                            {subcategoryKeys.map(subKey => {
                              const subPrompts = subcategories[subKey] || [];
                              return (
                                <div key={subKey} className="border-l-2 border-indigo-200 pl-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Tag className="w-4 h-4 text-indigo-500" />
                                    <h5 className="text-sm font-medium text-indigo-700">{subKey}</h5>
                                    <span className="text-xs text-gray-400">{subPrompts.length}</span>
                                  </div>
                                  <div className="space-y-2">
                                    {subPrompts.map((prompt) => (
                                      <div key={prompt._id} className={`p-3 rounded-lg border transition-all ${!prompt.isActive ? 'opacity-60 bg-gray-50' : 'bg-white'} hover:border-primary-300`}>
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <h6 className="font-medium text-gray-900 text-sm truncate">{prompt.title}</h6>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{prompt.description || prompt.content?.substring(0, 80)}...</p>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                              <span>Used {prompt.usageCount || 0}x</span>
                                              {prompt.isActive ? <span className="text-green-500">Active</span> : <span>Inactive</span>}
                                            </div>
                                          </div>
                                          <div className="flex gap-1 flex-shrink-0">
                                            <button onClick={() => setViewModal(prompt)} className="p-1 text-gray-400 hover:text-primary-600 rounded"><Eye className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => openEditModal(prompt)} className="p-1 text-gray-400 hover:text-primary-600 rounded"><Edit className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleToggleActive(prompt)} className={`p-1 rounded ${prompt.isActive ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}><Power className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleDelete(prompt._id)} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {uncategorizedPrompts.length > 0 && (
                          <div className={subcategoryKeys.length > 0 ? 'border-t border-gray-200 pt-4' : ''}>
                            {subcategoryKeys.length > 0 && (
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-gray-600">Framework-level Prompts</span>
                                <span className="text-xs text-gray-400">{uncategorizedPrompts.length}</span>
                              </div>
                            )}
                            <div className="space-y-2">
                              {uncategorizedPrompts.map((prompt) => (
                                <div key={prompt._id} className={`p-3 rounded-lg border transition-all ${!prompt.isActive ? 'opacity-60 bg-gray-50' : 'bg-white'} hover:border-primary-300`}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <h6 className="font-medium text-gray-900 text-sm truncate">{prompt.title}</h6>
                                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{prompt.description || prompt.content?.substring(0, 80)}...</p>
                                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                        <span>Used {prompt.usageCount || 0}x</span>
                                        {prompt.isActive ? <span className="text-green-500">Active</span> : <span>Inactive</span>}
                                      </div>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                      <button onClick={() => setViewModal(prompt)} className="p-1 text-gray-400 hover:text-primary-600 rounded"><Eye className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => openEditModal(prompt)} className="p-1 text-gray-400 hover:text-primary-600 rounded"><Edit className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => handleToggleActive(prompt)} className={`p-1 rounded ${prompt.isActive ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}><Power className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => handleDelete(prompt._id)} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
              {frameworkOptions.filter(f => !groupedByFramework[f.value]).length > 0 && (
                <Card className="border-dashed">
                  <CardBody className="py-6">
                    <div className="text-center">
                      <BookOpen className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                      <h4 className="font-medium text-gray-700">Available Frameworks</h4>
                      <p className="text-sm text-gray-500 mt-1 mb-4">These frameworks don't have prompts yet.</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {frameworkOptions.filter(f => !groupedByFramework[f.value]).map(f => (
                          <button
                            key={f.value}
                            onClick={() => {
                              setFormData({ title: '', role: 'content_writer', frameworkType: f.value, content: '', category: 'general', platform: 'all', isActive: true });
                              setEditModal('new');
                            }}
                            className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                          >
                            {f.value}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {(roleFilter !== 'content_writer' || !roleFilter) && otherRolePrompts.length > 0 && (
            <div>
              {roleFilter && roleFilter !== 'content_writer' && (
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {roleOptions.find(r => r.value === roleFilter)?.label}
                </h3>
              )}
              {!roleFilter && otherRolePrompts.length > 0 && (
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Other Role Prompts</h3>
              )}
              <div className="space-y-3">
                {otherRolePrompts
                  .filter(p => {
                    if (!search) return true;
                    return p.title?.toLowerCase().includes(search.toLowerCase()) ||
                           p.content?.toLowerCase().includes(search.toLowerCase());
                  })
                  .map((prompt) => (
                    <Card key={prompt._id} className="hover:shadow-md transition-shadow">
                      <CardBody className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-semibold text-gray-900">{prompt.title}</h4>
                              {prompt.isSystem && <Badge className="bg-purple-100 text-purple-700">System</Badge>}
                              <Badge className={prompt.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                                {prompt.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500 mb-2 flex-wrap">
                              <Badge className="bg-blue-100 text-blue-700">
                                {roleOptions.find(r => r.value === prompt.role)?.label || prompt.role}
                              </Badge>
                              {prompt.category && <span className="text-gray-600">{prompt.category}</span>}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">{prompt.content?.substring(0, 200)}...</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => setViewModal(prompt)}><Eye size={16} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleToggleActive(prompt)}><Power size={16} className={prompt.isActive ? 'text-green-600' : 'text-gray-400'} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(prompt)}><Edit size={16} /></Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(prompt._id)}><Trash2 size={16} /></Button>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={!!editModal} onClose={() => { setEditModal(null); setFormData({}); }} size="2xl" showCloseButton={false}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editModal === 'new' ? 'Create System Prompt' : 'Edit Prompt'}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => { setEditModal(null); setFormData({}); }}>
              <X size={18} />
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Enter prompt title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select value={formData.role || 'content_writer'} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {roleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Framework {formData.role === 'content_writer' && '*'}</label>
                <select value={formData.frameworkType || ''} onChange={(e) => setFormData({ ...formData, frameworkType: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Select Framework</option>
                  {frameworkOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={formData.category || 'general'} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="general">General</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="youtube">YouTube</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="landing_page">Landing Page</option>
                  <option value="email">Email</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select value={formData.platform || 'all'} onChange={(e) => setFormData({ ...formData, platform: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="all">All Platforms</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="youtube">YouTube</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="google_ads">Google Ads</option>
                  <option value="landing_page">Landing Page</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Content *</label>
              <textarea value={formData.content || ''} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm" rows={10} placeholder="Enter the prompt content..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Brief description of this prompt" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
              <input type="text" value={formData.tags || ''} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g., hooks, engagement, conversion" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.isActive !== false} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="rounded" />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => { setEditModal(null); setFormData({}); }}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editModal === 'new' ? 'Create' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={!!viewModal} onClose={() => setViewModal(null)} size="2xl" showCloseButton={false}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">{viewModal?.title}</h3>
            <Button variant="ghost" size="sm" onClick={() => setViewModal(null)}><X size={18} /></Button>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-blue-100 text-blue-700">{roleOptions.find(r => r.value === viewModal?.role)?.label || viewModal?.role}</Badge>
              {viewModal?.frameworkType && <Badge className="bg-amber-100 text-amber-700">{viewModal.frameworkType}</Badge>}
              {viewModal?.category && <Badge className="bg-gray-100 text-gray-700">{viewModal.category}</Badge>}
              {viewModal?.platform && viewModal.platform !== 'all' && <Badge className="bg-green-100 text-green-700">{viewModal.platform}</Badge>}
              <Badge className={viewModal?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{viewModal?.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 mb-4 overflow-x-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">{viewModal?.content}</pre>
          </div>
          {viewModal?.description && <p className="text-sm text-gray-600 mb-4">{viewModal.description}</p>}
          {viewModal?.tags && viewModal.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {viewModal.tags.map((tag, i) => <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{tag}</span>)}
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setViewModal(null)}>Close</Button>
            <Button onClick={() => { setViewModal(null); openEditModal(viewModal); }}><Edit size={16} className="mr-2" />Edit</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


function CustomSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = filterOptions.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-gray-700"
      >
        <span>{selected?.label || "All Actions"}</span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {filterOptions.map((option) => (
            <li
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors
                ${value === option.value ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-700"}`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
const filterOptions = [
  { value: "", label: "All Actions" },
  { value: "auth.login", label: "Login" },
  { value: "org.create", label: "Org Created" },
  { value: "org.member_invite", label: "Member Invited" },
  { value: "platform", label: "Platform Actions" },
];
// Logs Tab
function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (actionFilter) params.action = actionFilter;
      const response = await platformAdminService.getLogs(params);
      setLogs(response.data || []);
    } catch (error) {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
       <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Activity Logs</h3>
        <Button variant="outline" onClick={fetchLogs}>
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Replaced native <select> with CustomSelect */}
      <CustomSelect value={actionFilter} onChange={setActionFilter} />

      {loading ? (
        <Spinner size="lg" className="mx-auto mt-8" />
      ) : logs.length === 0 ? (
        <Card>
          <CardBody className="p-4 text-center">
            <Activity className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No logs found</p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Time</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Organization</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs
                    .filter((log) =>
                      actionFilter === ""
                        ? true
                        : actionFilter === "platform"
                        ? log.action.startsWith("platform")
                        : log.action === actionFilter
                    )
                    .map((log) => (
                      <tr key={log._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {log.userId?.name || "System"}
                          </div>
                          <div className="text-xs text-gray-500">{log.userId?.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-blue-100 text-blue-700 whitespace-nowrap">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {log.organizationId?.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {log.details
                            ? JSON.stringify(log.details).substring(0, 50) + "..."
                            : "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// Main Component
export default function PlatformAdminDashboardPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(() => {
    return tabFromUrl && TABS.some(t => t.id === tabFromUrl) ? tabFromUrl : 'overview';
  });
  const [stats, setStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    const validTab = tabFromUrl && TABS.some(t => t.id === tabFromUrl);
    if (validTab) {
      setActiveTab(tabFromUrl);
    } else if (!tabFromUrl) {
      setActiveTab('overview');
    }
  }, [location.search]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStats();
      fetchPlans();
    }
  }, [activeTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await platformAdminService.getStats();
      setStats(response.data || {});
    } catch (error) {
      toast.error('Failed to load platform statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await platformAdminService.getPlans();
      setPlans(response.data || []);
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab stats={stats} loading={statsLoading} plans={plans} />;
      case 'organizations': return <OrganizationsTab />;
      case 'users': return <UsersTab />;
      case 'plans': return <PlansTab />;
      case 'prompts': return <PromptsTab />;
      case 'logs': return <LogsTab />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700">
                <Globe2 size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Platform Admin</h1>
                <p className="text-xs sm:text-sm text-gray-500">Manage the entire platform</p>
              </div>
            </div>
          </div>

          {/* Tabs — icon-only on mobile, icon+label on sm+ */}
          <div className="flex space-x-1 overflow-x-auto pb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
                title={tab.label}
              >
                <tab.icon size={18} />
                {/* CHANGED: hide label on mobile, show on sm+ */}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {renderTab()}
      </div>
    </div>
  );
}