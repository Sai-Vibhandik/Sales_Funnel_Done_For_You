import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ProjectProvider } from '@/context/ProjectContext';
import { Layout } from '@/components/layout';


// Landing page
import { LandingPage } from '@/pages/landing';

// Auth pages
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from '@/pages/auth';

// Onboarding
import OnboardingPage from '@/pages/onboarding/OnboardingPage';

// Dashboard
import { DashboardPage } from '@/pages/dashboard';

// Projects
import { ProjectsListPage, CreateProjectPage, ProjectDetailPage, TeamAssignmentPage, ProjectStrategySummaryPage } from '@/pages/projects';
import ProjectAssetsPage from '@/pages/projects/ProjectAssetsPage';

// Stages
import {
  MarketResearchPage,
  OfferEngineeringPage,
  TrafficStrategyPage,
  LandingPageStrategyPage,
  CreativeStrategyPage,
} from '@/pages/stages';
import LandingPagesListPage from '@/pages/stages/LandingPagesListPage';

// Tasks
import { TasksPage } from '@/pages/tasks';
import TesterReviewPage from '@/pages/tasks/TesterReviewPage';
import MarketerApprovalPage from '@/pages/tasks/MarketerApprovalPage';
import TaskDetailPage from '@/pages/tasks/TaskDetailPage';
import ApprovedAssetsPage from '@/pages/tasks/ApprovedAssetsPage';

// Assets
import { PerformanceMarketerAssetsPage, ProjectAssetsDetailPage } from '@/pages/assets';

// Team
import { TeamManagementPage } from '@/pages/team';

// Admin
import { ClientsPage, SOPLibraryPage, PromptsPage, RejectionsPage } from '@/pages/admin';

// Platform Admin
import PlatformAdminDashboardPage from '@/pages/platform/PlatformAdminDashboardPage';

// Billing
import { BillingPage, PlansPage } from '@/pages/billing';

// Protected Route wrapper - checks authentication AND organization
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Redirect to onboarding if user has no organization (unless already on onboarding page)
  // Platform admins don't need an organization
  if (user?.role !== 'platform_admin' && !user?.currentOrganization && location.pathname !== '/onboarding') {
    // Preserve any state that was passed (like selected plan)
    return <Navigate to="/onboarding" replace state={location.state} />;
  }

  return children;
}

// Admin Route wrapper
function AdminRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin' && user?.role !== 'platform_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Platform Admin Route wrapper - Only for platform_admin
function PlatformAdminRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'platform_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Team Route wrapper (NOT admin - for performance marketers, designers, developers, testers)
function TeamRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admin cannot access strategy stages
  if (user?.role === 'admin') {
    return <Navigate to="/dashboard/projects" replace />;
  }

  return children;
}

// Marketer Route wrapper (admin or performance_marketer only - for strategy editing)
function MarketerRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only admin and performance_marketer can access
  if (user?.role !== 'admin' && user?.role !== 'performance_marketer') {
    return <Navigate to="/dashboard/projects" replace />;
  }

  return children;
}

// Public Route wrapper (redirect if authenticated)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Landing page - public, redirects to dashboard if authenticated */}
      <Route path="/" element={<LandingPage />} />

      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password/:token"
        element={
          <PublicRoute>
            <ResetPasswordPage />
          </PublicRoute>
        }
      />

      {/* Onboarding route - authenticated users without organization */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <SocketProvider>
              <NotificationProvider>
                <ProjectProvider>
                  <Layout />
                </ProjectProvider>
              </NotificationProvider>
            </SocketProvider>
          </ProtectedRoute>
        }
      >
        {/* Dashboard Home */}
        <Route index element={<DashboardPage />} />

        {/* Projects */}
        <Route path="projects" element={<ProjectsListPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="projects/:id/strategy-summary" element={<ProjectStrategySummaryPage />} />
        <Route path="projects/:id/assets" element={<ProjectAssetsPage />} />

        {/* Create Project - Admin only */}
        <Route
          path="projects/new"
          element={
            <AdminRoute>
              <CreateProjectPage />
            </AdminRoute>
          }
        />

        {/* Team Assignment - Admin and Performance Marketer */}
        <Route
          path="projects/:id/assign-team"
          element={
            <MarketerRoute>
              <TeamAssignmentPage />
            </MarketerRoute>
          }
        />

        {/* Stage routes - Market Research, Offer Engineering, Traffic Strategy - Performance Marketer and Admin */}
        <Route
          path="market-research"
          element={
            <MarketerRoute>
              <MarketResearchPage />
            </MarketerRoute>
          }
        />
        <Route
          path="offer-engineering"
          element={
            <MarketerRoute>
              <OfferEngineeringPage />
            </MarketerRoute>
          }
        />
        <Route
          path="traffic-strategy"
          element={
            <MarketerRoute>
              <TrafficStrategyPage />
            </MarketerRoute>
          }
        />
        {/* Landing Page and Creative Strategy - Admin can edit, Performance Marketer can view */}
        <Route
          path="landing-pages"
          element={
            <MarketerRoute>
              <LandingPagesListPage />
            </MarketerRoute>
          }
        />
        <Route
          path="landing-page-strategy"
          element={
            <MarketerRoute>
              <LandingPageStrategyPage />
            </MarketerRoute>
          }
        />
        <Route
          path="creative-strategy"
          element={
            <MarketerRoute>
              <CreativeStrategyPage />
            </MarketerRoute>
          }
        />

        {/* Tasks - Not accessible to Performance Marketers and Admins */}
        <Route
          path="tasks"
          element={
            <ProtectedRoute>
              {(() => {
                const { user } = useAuth();
                // Performance Marketers and Admins should not access "My Tasks"
                if (user?.role === 'performance_marketer' || user?.role === 'admin') {
                  return <Navigate to="/dashboard" replace />;
                }
                return <TasksPage />;
              })()}
            </ProtectedRoute>
          }
        />
        <Route path="tasks/:taskId" element={<TaskDetailPage />} />

        {/* Tester Review - Tester/Admin only */}
        <Route
          path="tasks/review"
          element={
            <ProtectedRoute>
              {(() => {
                const { user } = useAuth();
                if (user?.role === 'tester' || user?.role === 'admin') {
                  return <TesterReviewPage />;
                }
                return <Navigate to="/dashboard/tasks" replace />;
              })()}
            </ProtectedRoute>
          }
        />

        {/* Marketer Approval - Performance Marketer/Admin only */}
        <Route
          path="tasks/approval"
          element={
            <ProtectedRoute>
              {(() => {
                const { user } = useAuth();
                if (user?.role === 'performance_marketer' || user?.role === 'admin') {
                  return <MarketerApprovalPage />;
                }
                return <Navigate to="/dashboard/tasks" replace />;
              })()}
            </ProtectedRoute>
          }
        />

        {/* Approved Assets - Tester only */}
        <Route
          path="tasks/approved"
          element={
            <ProtectedRoute>
              {(() => {
                const { user } = useAuth();
                if (user?.role === 'tester' || user?.role === 'admin') {
                  return <ApprovedAssetsPage />;
                }
                return <Navigate to="/dashboard/tasks" replace />;
              })()}
            </ProtectedRoute>
          }
        />

        {/* Assets - Performance Marketer/Admin only */}
        <Route
          path="assets"
          element={
            <ProtectedRoute>
              {(() => {
                const { user } = useAuth();
                if (user?.role === 'performance_marketer' || user?.role === 'admin') {
                  return <PerformanceMarketerAssetsPage />;
                }
                return <Navigate to="/dashboard" replace />;
              })()}
            </ProtectedRoute>
          }
        />

        {/* Project Assets Detail - Performance Marketer/Admin only */}
        <Route
          path="assets/project/:projectId"
          element={
            <ProtectedRoute>
              {(() => {
                const { user } = useAuth();
                if (user?.role === 'performance_marketer' || user?.role === 'admin') {
                  return <ProjectAssetsDetailPage />;
                }
                return <Navigate to="/dashboard" replace />;
              })()}
            </ProtectedRoute>
          }
        />

        {/* Team Management (Admin only) */}
        <Route
          path="team"
          element={
            <AdminRoute>
              <TeamManagementPage />
            </AdminRoute>
          }
        />

        {/* Clients (Admin only) */}
        <Route
          path="clients"
          element={
            <AdminRoute>
              <ClientsPage />
            </AdminRoute>
          }
        />

        {/* SOP Library (Admin only) */}
        <Route
          path="sop-library"
          element={
            <AdminRoute>
              <SOPLibraryPage />
            </AdminRoute>
          }
        />

        {/* Prompts - View only for org admins, full access for platform admin */}
        <Route
          path="prompts"
          element={
            <AdminRoute>
              <PromptsPage />
            </AdminRoute>
          }
        />

        {/* Billing (Admin only) */}
        <Route
          path="billing"
          element={
            <AdminRoute>
              <BillingPage />
            </AdminRoute>
          }
        />

        {/* Billing Plans (Admin only) */}
        <Route
          path="billing/plans"
          element={
            <AdminRoute>
              <PlansPage />
            </AdminRoute>
          }
        />

        {/* Rejections Tracking (Admin only) */}
        <Route
          path="rejections"
          element={
            <AdminRoute>
              <RejectionsPage />
            </AdminRoute>
          }
        />

        {/* Platform Admin Dashboard - Only for platform_admin role */}
        <Route
          path="platform-admin"
          element={
            <PlatformAdminRoute>
              <PlatformAdminDashboardPage />
            </PlatformAdminRoute>
          }
        />

        {/* Prompts Management - Platform Admin only */}
        <Route
          path="platform-admin/prompts"
          element={
            <PlatformAdminRoute>
              <PromptsPage />
            </PlatformAdminRoute>
          }
        />

        {/* Reports (placeholder) */}
        <Route
          path="reports"
          element={
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
              <p className="text-gray-600 mt-2">Coming soon...</p>
            </div>
          }
        />
      </Route>

      {/* Catch all - redirect to landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}