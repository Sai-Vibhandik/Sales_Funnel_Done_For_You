import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Button, Badge, Spinner } from '@/components/ui';
import { taskService } from '@/services/api';
import {
  FolderKanban,
  Image,
  Video,
  Layout,
  Code,
  FileCheck,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function PerformanceMarketerAssetsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetchProjectsWithAssets();
  }, []);

  const fetchProjectsWithAssets = async () => {
    try {
      setLoading(true);
      const response = await taskService.getPMProjectsWithAssets();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error(error.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const getTaskTypeIcon = (type) => {
    switch (type) {
      case 'imageCreatives':
        return <Image className="w-4 h-4" />;
      case 'videoCreatives':
        return <Video className="w-4 h-4" />;
      case 'uiuxDesigns':
        return <Layout className="w-4 h-4" />;
      case 'landingPages':
        return <Code className="w-4 h-4" />;
      default:
        return <FileCheck className="w-4 h-4" />;
    }
  };

  const getTaskTypeLabel = (type) => {
    switch (type) {
      case 'imageCreatives':
        return 'Image Creatives';
      case 'videoCreatives':
        return 'Video Creatives';
      case 'uiuxDesigns':
        return 'UI/UX Designs';
      case 'landingPages':
        return 'Landing Pages';
      default:
        return type;
    }
  };

  // Calculate total stats across all projects
  const getTotalStats = () => {
    return projects.reduce((acc, project) => ({
      total: acc.total + (project.taskStats?.total || 0),
      finalApproved: acc.finalApproved + (project.taskStats?.finalApproved || 0),
      rejected: acc.rejected + (project.taskStats?.rejected || 0),
    }), { total: 0, finalApproved: 0, rejected: 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const totalStats = getTotalStats();

  return (
  <div className="max-w-7xl mx-auto space-y-8 px-4">
    
    {/* Header */}
    <div className="rounded-2xl p-6 bg-gray-900 text-white shadow-md">
      <h1 className="text-3xl font-bold">Assets Pipeline</h1>
      <p className="text-gray-300 mt-1">
        Track all tasks and assets across your projects
      </p>
    </div>

    {/* Summary Stats */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Total */}
      <Card className="rounded-2xl shadow-sm border border-gray-200">
        <CardBody className="p-5 flex flex-col items-center bg-gray-50">
          <FileCheck className="w-6 h-6 text-gray-500 mb-1" />
          <p className="text-sm text-gray-500">Total Tasks</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {totalStats.total}
          </p>
        </CardBody>
      </Card>

      {/* Approved */}
      <Card className="rounded-2xl shadow-sm border border-green-200">
        <CardBody className="p-5 flex flex-col items-center bg-green-50">
          <CheckCircle className="w-6 h-6 text-green-500 mb-1" />
          <p className="text-sm text-green-700">Final Approved</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {totalStats.finalApproved}
          </p>
        </CardBody>
      </Card>

      {/* Rejected */}
      <Card className="rounded-2xl shadow-sm border border-red-200">
        <CardBody className="p-5 flex flex-col items-center bg-red-50">
          <XCircle className="w-6 h-6 text-red-500 mb-1" />
          <p className="text-sm text-red-700">Rejected</p>
          <p className="text-3xl font-bold text-red-600 mt-1">
            {totalStats.rejected}
          </p>
        </CardBody>
      </Card>
    </div>

    {/* Projects */}
    {projects.length === 0 ? (
      <Card className="rounded-2xl shadow-sm border border-gray-200">
        <CardBody className="text-center py-14">
          <AlertCircle className="w-14 h-14 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium">No projects found</p>
          <p className="text-sm text-gray-400 mt-2">
            Projects assigned to you will appear here
          </p>
        </CardBody>
      </Card>
    ) : (
      <div className="grid gap-6">
        {projects.map((project) => (
          <Card
            key={project._id}
            className="rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer group hover:border-yellow-400"
            onClick={() => navigate(`/dashboard/assets/project/${project._id}`)}
          >
            <CardBody className="p-6">
              <div className="flex items-start justify-between">

                {/* LEFT */}
                <div className="flex-1">
                  
                  {/* Title */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-yellow-500 transition">
                      {project.projectName || project.businessName}
                    </h3>

                    <Badge
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        project.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {project.status || 'Active'}
                    </Badge>
                  </div>

                  {/* Industry */}
                  {project.industry && (
                    <span className="inline-block px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full mb-3">
                      {project.industry}
                    </span>
                  )}

                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 mt-3 text-sm">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Total</span>
                      <span className="font-semibold">
                        {project.taskStats?.total || 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-gray-500">Approved</span>
                      <span className="font-semibold text-green-600">
                        {project.taskStats?.finalApproved || 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-gray-500">Rejected</span>
                      <span className="font-semibold text-red-600">
                        {project.taskStats?.rejected || 0}
                      </span>
                    </div>
                  </div>

                  {/* Task Types */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {Object.entries(project.tasksByType?.all || {}).map(
                      ([type, tasks]) => {
                        const count = tasks?.length || 0;
                        if (count === 0) return null;

                        return (
                          <span
                            key={type}
                            className="flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 transition"
                          >
                            {getTaskTypeIcon(type)}
                            {getTaskTypeLabel(type)}: {count}
                          </span>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* RIGHT BUTTON */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="ml-4 group-hover:bg-yellow-400 group-hover:text-black transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dashboard/assets/project/${project._id}`);
                  }}
                >
                  View
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>

              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    )}
  </div>
);
}