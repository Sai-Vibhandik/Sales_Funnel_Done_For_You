import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { projectService } from '@/services/api';
import BrandSettingsManager from '@/components/projects/BrandSettingsManager';

export default function ProjectBrandSettingsPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);

  useEffect(() => {
    if (!projectId) {
      navigate('/dashboard/projects');
      return;
    }
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await projectService.getProject(projectId);
      setProject(response.data);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    toast.success('Brand settings saved successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Brand Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure brand guidelines for <span className="font-medium">{project.projectName || project.businessName}</span>
        </p>
      </div>

      {/* Brand Settings Manager */}
      <BrandSettingsManager
        projectId={projectId}
        onSave={handleSave}
      />
    </div>
  );
}