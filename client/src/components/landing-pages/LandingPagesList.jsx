import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Button, Spinner } from '@/components/ui';
import { Plus, FileText, Edit, Trash2, ArrowRight, Code, Palette, AlertCircle } from 'lucide-react';
import { projectService } from '@/services/api';

const FUNNEL_TYPES = {
  video_sales_letter: 'Video Sales Letter',
  long_form: 'Long Form',
  lead_magnet: 'Lead Magnet',
  ebook: 'E-book',
  webinar: 'Webinar'
};

const PLATFORMS = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  google: 'Google',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  twitter: 'Twitter',
  whatsapp: 'WhatsApp',
  multi: 'Multi-Platform'
};

export default function LandingPagesList({ projectId, readOnly = false }) {
  const navigate = useNavigate();
  const [landingPages, setLandingPages] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  const getDesignerName = (designer) => {
    if (!designer) return 'Not assigned';
    // If already populated with name, return directly
    if (designer.name) return designer.name;
    // If it's an ID, look up in project team
    const designerId = designer._id || designer;
    if (!project?.assignedTeam) return 'Unknown';
    const designers = project.assignedTeam.uiUxDesigners || [];
    const legacyDesigner = project.assignedTeam.uiUxDesigner;
    const allDesigners = designers.length > 0 ? designers : (legacyDesigner ? [legacyDesigner] : []);
    const found = allDesigners.find(d => (d._id || d)?.toString() === designerId?.toString());
    return found?.name || 'Unknown';
  };

  const getDeveloperName = (developer) => {
    if (!developer) return 'Not assigned';
    // If already populated with name, return directly
    if (developer.name) return developer.name;
    // If it's an ID, look up in project team
    const developerId = developer._id || developer;
    if (!project?.assignedTeam) return 'Unknown';
    const developers = project.assignedTeam.developers || [];
    const legacyDeveloper = project.assignedTeam.developer;
    const allDevelopers = developers.length > 0 ? developers : (legacyDeveloper ? [legacyDeveloper] : []);
    const found = allDevelopers.find(d => (d._id || d)?.toString() === developerId?.toString());
    return found?.name || 'Unknown';
  };

  useEffect(() => {
    fetchLandingPages();
  }, [projectId]);

  const fetchLandingPages = async () => {
    try {
      setLoading(true);
      const response = await projectService.getProject(projectId);
      setProject(response.data);
      setLandingPages(response.data.landingPages || []);
    } catch (error) {
      console.error('Error fetching landing pages:', error);
      toast.error(error?.message || 'Failed to load landing pages');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLandingPage = async () => {
    try {
      setSaving(true);
      const response = await projectService.addLandingPage(projectId, {
        name: `Landing Page ${(landingPages?.length || 0) + 1}`
      });
      toast.success('Landing page created');
      const newLandingPageId = response.data._id;
      navigate(`/dashboard/landing-page-strategy?projectId=${projectId}&landingPageId=${newLandingPageId}`);
    } catch (error) {
      console.error('Error creating landing page:', error);
      toast.error(error?.message || 'Failed to create landing page');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLandingPage = async (landingPageId, event) => {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this landing page? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      await projectService.deleteLandingPage(projectId, landingPageId);
      toast.success('Landing page deleted');
      fetchLandingPages();
    } catch (error) {
      console.error('Error deleting landing page:', error);
      toast.error(error?.message || 'Failed to delete landing page');
    } finally {
      setSaving(false);
    }
  };

  const handleEditLandingPage = (landingPageId) => {
    navigate(`/dashboard/landing-page-strategy?projectId=${projectId}&landingPageId=${landingPageId}`);
  };

  const handleContinue = async () => {
    if (!landingPages || landingPages.length === 0) {
      toast.error('Please add at least one landing page before continuing');
      return;
    }

    try {
      setCompleting(true);
      await projectService.completeLandingPageStage(projectId);
      toast.success('Landing page stage completed!');
      navigate(`/dashboard/creative-strategy?projectId=${projectId}`);
    } catch (error) {
      console.error('Error completing landing page stage:', error);
      navigate(`/dashboard/creative-strategy?projectId=${projectId}`);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Landing Pages</h3>
        {!readOnly && (
          <Button onClick={handleCreateLandingPage} loading={saving}>
            <Plus className="w-4 h-4 mr-2" />
            Add Landing Page
          </Button>
        )}
      </div>

      {(!landingPages || landingPages.length === 0) ? (
        <Card>
          <CardBody className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No landing pages created yet</p>
            {!readOnly && (
              <Button onClick={handleCreateLandingPage} loading={saving}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Landing Page
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {landingPages.map((lp) => {
              const hasAssignments = lp.assignedDesigner && lp.assignedDeveloper;
              return (
                <Card
                  key={lp._id}
                  className={`hover:shadow-lg transition-shadow ${!readOnly ? 'cursor-pointer' : ''} ${!hasAssignments ? 'border-amber-300' : ''}`}
                  onClick={() => !readOnly && handleEditLandingPage(lp._id)}
                >
                  <CardBody className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{lp.name}</h4>
                        <p className="text-sm text-gray-500">
                          {FUNNEL_TYPES[lp.funnelType] || lp.funnelType?.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${hasAssignments ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {hasAssignments ? 'Ready' : 'Needs Setup'}
                      </span>
                    </div>

                    {/* Platform only (Hook removed) */}
                    {lp.platform && (
                      <div className="text-sm mb-3">
                        <span className="text-gray-500">Platform:</span>{' '}
                        <span className="text-gray-700">{PLATFORMS[lp.platform] || lp.platform}</span>
                      </div>
                    )}

                    {/* Team Assignments */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs flex items-center gap-1 text-purple-600">
                        <Palette className="w-3 h-3" />
                        {getDesignerName(lp.assignedDesigner)}
                      </span>
                      <span className="text-xs flex items-center gap-1 text-green-600">
                        <Code className="w-3 h-3" />
                        {getDeveloperName(lp.assignedDeveloper)}
                      </span>
                    </div>

                    {!hasAssignments && !readOnly && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 mb-3">
                        <AlertCircle className="w-3 h-3" />
                        Click to assign team members
                      </div>
                    )}

                    {!readOnly && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditLandingPage(lp._id);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => handleDeleteLandingPage(lp._id, e)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })}
            
          </div>

          {!readOnly && (
            
            <div className="flex justify-end pt-4 border-t">
              
              <Button onClick={handleContinue} loading={completing}>
                Continue to Creative Strategy
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
            </div>
          )}
        </>
      )}
    </div>
  );
}