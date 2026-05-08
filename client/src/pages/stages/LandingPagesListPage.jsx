import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Button, Spinner } from '@/components/ui';
import { StageProgressTracker } from '@/components/workflow';
import LandingPagesList from '@/components/landing-pages/LandingPagesList';
import { ArrowLeft, CheckCircle, SkipForward, Eye, Undo2 } from 'lucide-react';
import { projectService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function LandingPagesListPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [skipping, setSkipping] = useState(false);
  const [project, setProject] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isPerformanceMarketer = user?.role === 'performance_marketer';
  const canEdit = isPerformanceMarketer && !isAdmin; // Only Performance Marketer can edit, Admin view only

  useEffect(() => {
    if (!projectId) {
      navigate('/dashboard/projects');
      return;
    }
    fetchProject();
  }, [projectId]);
 const handleGoBack = async () => {
    try {
      // Get current form data
      const currentFormData = {
        name,
        funnelType,
        hook,
        angle,
        adPlatforms,
        cta,
        offer,
        messaging,
        assignedDesigner,
        assignedDeveloper,
      };

      // Save to localStorage before navigating back
      saveStageData(projectId, 'landingPage', currentFormData);
      toast.success('Progress saved locally');

      // Navigate to traffic strategy (previous stage)
      navigate(`/dashboard/traffic-strategy?projectId=${projectId}`);
    } catch (error) {
      console.error('Error saving before navigating back:', error);
      // Still navigate even if save fails
      navigate(`/dashboard/traffic-strategy?projectId=${projectId}`);
    }
  };
  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await projectService.getProject(projectId);
      setProject(response.data);

      // Check if traffic strategy is completed
      if (!response.data.stages?.trafficStrategy?.isCompleted) {
        toast.error('Complete Traffic Strategy first to access Landing Pages');
        navigate('/dashboard/projects');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
      navigate('/dashboard/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipLandingPage = async () => {
    if (!confirm('Are you sure you want to skip the Landing Page stage? No landing page tasks will be created for this project.')) {
      return;
    }

    try {
      setSkipping(true);
      await projectService.skipLandingPageStage(projectId);
      toast.success('Landing page stage skipped. Proceeding to Creative Strategy.');
      navigate(`/dashboard/creative-strategy?projectId=${projectId}`);
    } catch (error) {
      console.error('Error skipping landing page stage:', error);
      toast.error(error?.response?.data?.message || 'Failed to skip landing page stage');
    } finally {
      setSkipping(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(`/dashboard/projects/${projectId}`)} className="p-2">
          <ArrowLeft className="w-5 h-5" />
          
        </Button>
         {canEdit && (
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50"
            title="Back to Traffic Strategy (saves current progress locally)"
          >
            <Undo2 className="w-5 h-5" />
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Landing Pages</h1>
          <p className="text-gray-600 mt-1">{project?.businessName}</p>
        </div>
        <div className="text-right">
          {isAdmin && !isPerformanceMarketer && (
            <div className="flex items-center gap-1 text-blue-600 text-sm mt-1">
              <Eye className="w-4 h-4" />
              <span>View Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Completion Banner */}
      {project?.stages?.landingPage?.isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div>
            <h3 className="font-semibold text-green-800">Stage Completed!</h3>
            <p className="text-sm text-green-600">
              {project?.stages?.landingPage?.skipped
                ? 'Landing page stage was skipped. Proceed to Creative Strategy.'
                : 'You can proceed to Creative Strategy.'}
                
            </p>
          </div>
          
        </div>
      )}

      {/* Skip Option Banner - Admin Only */}
      {!project?.stages?.landingPage?.isCompleted && canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
        
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">No Landing Page Required?</h3>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkipLandingPage}
                loading={skipping}
                className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-200 bg-amber-100"
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip Landing Page Stage
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Read Only Notice for Admin */}
      {isAdmin && !isPerformanceMarketer && !project?.stages?.landingPage?.isCompleted && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">View Only</h3>
              <p className="text-sm text-blue-700">
                You can view the Landing Page stage, but only Performance Marketers can make changes. Contact your team if changes are needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      <Card>
        <CardBody className="p-3 sm:p-4">
          <StageProgressTracker stages={project?.stages} currentStage={project?.currentStage} />
        </CardBody>
      </Card>

      {/* Landing Pages List */}
      <Card>
        <CardBody className="p-6">
          <LandingPagesList projectId={projectId} readOnly={!canEdit} />
        </CardBody>
      </Card>
    </div>
  );
}