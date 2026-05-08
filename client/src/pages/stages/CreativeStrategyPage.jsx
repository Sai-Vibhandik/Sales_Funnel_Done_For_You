import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Spinner } from '@/components/ui';
import { StageProgressTracker } from '@/components/workflow';
import { ArrowLeft, CheckCircle, Eye, Undo2 } from 'lucide-react';
import { creativeService, projectService } from '@/services/api';
import CreativePlanner from '@/components/creative/CreativePlanner';
import { extractData } from '@/utils/apiResponse';
import { useAuth } from '@/context/AuthContext';
import {
  saveStageData,
  loadStageData,
  clearStageData,
} from '@/utils/stageStorage';

export default function CreativeStrategyPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [creativeData, setCreativeData] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isPerformanceMarketer = user?.role === 'performance_marketer';
  const canEdit = isPerformanceMarketer && !isAdmin; // Only Performance Marketer can edit, Admin view only

  useEffect(() => {
    if (!projectId) {
      navigate('/dashboard/projects');
      return;
    }
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectRes, creativeRes] = await Promise.all([
        projectService.getProject(projectId),
        creativeService.get(projectId),
      ]);

      console.log('=== CreativeStrategyPage fetchData ===');
      console.log('projectRes (raw):', projectRes);

      // Extract data from response using utility
      const projectData = extractData(projectRes);

      console.log('projectData (extracted):', projectData);
      console.log('projectData._id:', projectData?._id);
      console.log('projectData.assignedTeam:', projectData?.assignedTeam);
      console.log('projectData.assignedTeam?.contentWriters:', projectData?.assignedTeam?.contentWriters);
      console.log('projectData.assignedTeam?.graphicDesigners:', projectData?.assignedTeam?.graphicDesigners);
      console.log('projectData.assignedTeam?.videoEditors:', projectData?.assignedTeam?.videoEditors);

      setProject(projectData);

      // Check for local draft first
      const localDraft = loadStageData(projectId, 'creativeStrategy');

      // Extract creative data
      const creative = extractData(creativeRes);
      if (creative) {
        // Merge local draft with server data, preferring local draft
        const mergedData = localDraft && localDraft._isLocalDraft
          ? {
              ...creative,
              creativePlan: localDraft.creativePlan || creative.creativePlan,
              creativeCategories: localDraft.creativeCategories || creative.creativeCategories,
              additionalNotes: localDraft.additionalNotes || creative.additionalNotes,
            }
          : creative;

        setCreativeData(mergedData);
        setIsCompleted(creative.isCompleted || false);

        // Show notification if local draft exists
        if (localDraft && localDraft._isLocalDraft) {
          toast.info('Your previously saved draft has been restored. Review and save to keep your changes.');
        }
      } else if (localDraft && localDraft._isLocalDraft) {
        // No server data but have local draft
        setCreativeData(localDraft);
        toast.info('Your previously saved draft has been restored. Review and save to keep your changes.');
      }
    } catch (error) {
      console.error('CreativeStrategyPage fetchData error:', error);
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to load creative strategy';
      const statusCode = error?.response?.status || error?.status;

      if (statusCode === 403) {
        toast.error('Complete Landing Page Strategy first to access Creative Strategy');
        navigate('/dashboard/projects');
      } else if (statusCode === 404) {
        toast.error('Project not found');
        navigate('/dashboard/projects');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data, markComplete = false) => {
    try {
      setSaving(true);

      await creativeService.upsert(projectId, {
        creativePlan: data.creativePlan,
        creativeCategories: data.creativeCategories,
        additionalNotes: data.additionalNotes,
        isCompleted: markComplete,
      });

      // Clear local draft after successful save
      clearStageData(projectId, 'creativeStrategy');

      if (markComplete) {
        navigate(`/dashboard/tasks?projectId=${projectId}`);
      }
    } catch (error) {
      console.error('Creative strategy save error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save creative strategy';
      throw new Error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Handle going back to previous stage with auto-save
  const handleGoBack = () => {
    // Note: Since CreativePlanner manages the form state internally,
    // we just navigate back. The user should save their changes first.
    // If they have unsaved changes, they'll lose them unless they save first.
    navigate(`/dashboard/landing-pages?projectId=${projectId}`);
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
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(`/dashboard/projects/${projectId}`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to Project"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {canEdit && (
          <button
            onClick={handleGoBack}
            className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
            title="Back to Landing Pages"
          >
            <Undo2 className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Creative Strategy</h1>
          <p className="text-gray-600 mt-1">{project?.businessName || project?.projectName}</p>
        </div>
        {isAdmin && !isPerformanceMarketer && (
          <div className="flex items-center gap-1 text-blue-600 text-sm">
            <Eye className="w-4 h-4" />
            <span>View Only</span>
          </div>
        )}
      </div>

      {/* Read Only Notice for Admin */}
      {isAdmin && !isPerformanceMarketer && !isCompleted && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">View Only</h3>
              <p className="text-sm text-blue-700">
                You can view the Creative Strategy, but only Performance Marketers can make changes. Contact your team if changes are needed.
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

      {/* Creative Planner */}
      <CreativePlanner
        projectId={projectId}
        initialData={creativeData}
        onSave={handleSave}
        isCompleted={isCompleted}
        project={project}
        readOnly={!canEdit}
      />
    </div>
  );
}