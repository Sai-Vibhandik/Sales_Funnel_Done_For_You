import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader, Button, Spinner } from '@/components/ui';
import { ArrowLeft, Building2, User, Mail, Phone, DollarSign, Target, Gift, TrendingUp, FileText, Lightbulb, Download, IndianRupee } from 'lucide-react';
import { strategySummaryService, projectService } from '@/services/api';

const SECTION_ICONS = {
  project: Building2,
  marketResearch: Target,
  offer: Gift,
  trafficStrategy: TrendingUp,
  landingPage: FileText,
  creativeStrategy: Lightbulb
};

export default function ProjectStrategySummaryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectRes, summaryRes] = await Promise.all([
        projectService.getProject(id),
        strategySummaryService.getSummary(id)
      ]);
      setProject(projectRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error('Failed to load strategy summary');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadText = async () => {
    try {
      const response = await strategySummaryService.getTextSummary(id);
      // Create blob and download
      const blob = new Blob([response], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `strategy-summary-${id}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error('Failed to download summary');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Strategy Summary</h1>
        </div>
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-gray-500">No strategy data available for this project.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/dashboard/projects/${id}`)} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Strategy Summary</h1>
            <p className="text-gray-600">{project?.projectName || project?.businessName}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={handleDownloadText}>
          <Download className="w-4 h-4 mr-2" />
          Download Summary
        </Button>
      </div>

      {/* Project Overview */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Project Overview</h2>
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <label className="text-sm text-gray-500">Customer Name</label>
                <p className="font-medium text-gray-900">{summary.project?.customerName || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <label className="text-sm text-gray-500">Business Name</label>
                <p className="font-medium text-gray-900">{summary.project?.businessName || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <p className="font-medium text-gray-900">{summary.project?.email || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <label className="text-sm text-gray-500">Mobile</label>
                <p className="font-medium text-gray-900">{summary.project?.mobile || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <label className="text-sm text-gray-500">Industry</label>
                <p className="font-medium text-gray-900">{summary.project?.industry || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <IndianRupee className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <label className="text-sm text-gray-500">Budget</label>
                <p className="font-medium text-gray-900">
                  {summary.project?.budget ? `$${summary.project.budget.toLocaleString()}` : 'N/A'}
                </p>
              </div>
            </div>
            {summary.project?.description && (
              <div className="md:col-span-2 lg:col-span-3">
                <label className="text-sm text-gray-500">Description</label>
                <p className="mt-1 text-gray-900">{summary.project.description}</p>
              </div>
            )}
            {summary.project?.timeline && (
              <>
                <div>
                  <label className="text-sm text-gray-500">Start Date</label>
                  <p className="font-medium text-gray-900">
                    {summary.project.timeline.startDate ? new Date(summary.project.timeline.startDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">End Date</label>
                  <p className="font-medium text-gray-900">
                    {summary.project.timeline.endDate ? new Date(summary.project.timeline.endDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Market Research */}
      {summary.marketResearch && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Market Research</h2>
            </div>
          </CardHeader>
          <CardBody className="p-6 space-y-4">
            {summary.marketResearch.avatar && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Target Avatar</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {summary.marketResearch.avatar.ageRanges?.length > 0 && (
                    <div>
                      <label className="text-sm text-gray-500">Age Ranges</label>
                      <p className="font-medium text-gray-900">
                        {summary.marketResearch.avatar.ageRanges.join(', ')}
                      </p>
                    </div>
                  )}
                  {summary.marketResearch.avatar.location && (
                    <div>
                      <label className="text-sm text-gray-500">Location</label>
                      <p className="font-medium text-gray-900">{summary.marketResearch.avatar.location}</p>
                    </div>
                  )}
                  {summary.marketResearch.avatar.incomeLevels?.length > 0 && (
                    <div>
                      <label className="text-sm text-gray-500">Income Levels</label>
                      <p className="font-medium text-gray-900">
                        {summary.marketResearch.avatar.incomeLevels.join(', ')}
                      </p>
                    </div>
                  )}
                  {summary.marketResearch.avatar.professions?.length > 0 && (
                    <div>
                      <label className="text-sm text-gray-500">Professions</label>
                      <p className="font-medium text-gray-900">
                        {summary.marketResearch.avatar.professions.join(', ')}
                      </p>
                    </div>
                  )}
                  {summary.marketResearch.avatar.interests?.length > 0 && (
                    <div className="lg:col-span-2">
                      <label className="text-sm text-gray-500">Interests</label>
                      <p className="font-medium text-gray-900">
                        {summary.marketResearch.avatar.interests.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {summary.marketResearch.painPoints?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Pain Points</label>
                <ul className="mt-2 space-y-1">
                  {summary.marketResearch.painPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-red-500 mt-1">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.marketResearch.desires?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Desires</label>
                <ul className="mt-2 space-y-1">
                  {summary.marketResearch.desires.map((desire, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-green-500 mt-1">•</span>
                      {desire}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.marketResearch.existingPurchases?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Existing Purchases</label>
                <p className="mt-1 text-gray-900">{summary.marketResearch.existingPurchases.join(', ')}</p>
              </div>
            )}
            {summary.marketResearch.competitors && (
              <div>
                <label className="text-sm font-medium text-gray-700">Competitors</label>
                <p className="mt-1 text-gray-900">{summary.marketResearch.competitors}</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Offer Engineering */}
      {summary.offer && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Offer Engineering</h2>
            </div>
          </CardHeader>
          <CardBody className="p-6 space-y-6">
            {summary.offer.functionalValues?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Functional Values</label>
                <ul className="mt-2 space-y-1">
                  {summary.offer.functionalValues.map((val, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-purple-500 mt-1">•</span>
                      {val}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.offer.emotionalValues?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Emotional Values</label>
                <ul className="mt-2 space-y-1">
                  {summary.offer.emotionalValues.map((val, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-purple-500 mt-1">•</span>
                      {val}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.offer.socialValues?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Social Values</label>
                <ul className="mt-2 space-y-1">
                  {summary.offer.socialValues.map((val, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-purple-500 mt-1">•</span>
                      {val}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.offer.economicValues?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Economic Values</label>
                <ul className="mt-2 space-y-1">
                  {summary.offer.economicValues.map((val, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-purple-500 mt-1">•</span>
                      {val}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.offer.experientialValues?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Experiential Values</label>
                <ul className="mt-2 space-y-1">
                  {summary.offer.experientialValues.map((val, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-purple-500 mt-1">•</span>
                      {val}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.offer.pricing?.basePrice && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <label className="text-sm text-gray-500">Base Price</label>
                <p className="text-2xl font-bold text-purple-600">
                  ${summary.offer.pricing.basePrice.toLocaleString()} {summary.offer.pricing.currency || 'USD'}
                </p>
                {summary.offer.pricing.upsell?.enabled && (
                  <p className="text-sm text-gray-600 mt-2">
                    Upsell: ${summary.offer.pricing.upsell.price} - {summary.offer.pricing.upsell.description}
                  </p>
                )}
              </div>
            )}
            {summary.offer.bonuses?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Bonuses</label>
                <div className="mt-2 space-y-2">
                  {summary.offer.bonuses.map((bonus, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <div>
                        <span className="text-gray-900 font-medium">{bonus.title}</span>
                        {bonus.description && (
                          <p className="text-sm text-gray-600">{bonus.description}</p>
                        )}
                      </div>
                      <span className="text-purple-600 font-medium">${bonus.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {summary.offer.guarantees?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Guarantees</label>
                <ul className="mt-2 space-y-1">
                  {summary.offer.guarantees.map((guarantee, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-green-500 mt-1">✓</span>
                      {guarantee}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.offer.urgencyTactics?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Urgency Tactics</label>
                <ul className="mt-2 space-y-1">
                  {summary.offer.urgencyTactics.map((tactic, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-orange-500 mt-1">⚡</span>
                      {tactic}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Traffic Strategy */}
      {summary.trafficStrategy && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">Traffic Strategy</h2>
            </div>
          </CardHeader>
          <CardBody className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500">Selected Channels</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {summary.trafficStrategy.channels?.filter(c => c.isSelected).map((channel, idx) => (
                    <span key={idx} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm capitalize">
                      {channel.name.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
              {summary.trafficStrategy.totalBudget && (
                <div>
                  <label className="text-sm text-gray-500">Total Budget</label>
                  <p className="mt-1 text-xl font-semibold text-gray-900">
                    ${summary.trafficStrategy.totalBudget.toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Channel Details */}
            {summary.trafficStrategy.channels?.filter(c => c.isSelected).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Channel Details</label>
                <div className="mt-2 space-y-2">
                  {summary.trafficStrategy.channels.filter(c => c.isSelected).map((channel, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 capitalize">{channel.name.replace(/_/g, ' ')}</span>
                        {channel.budget && <span className="text-orange-600">${channel.budget.toLocaleString()}</span>}
                      </div>
                      {channel.justification && (
                        <p className="text-sm text-gray-600 mt-1">{channel.justification}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Target Audience */}
            {summary.trafficStrategy.targetAudience && (
              <div>
                <label className="text-sm font-medium text-gray-700">Target Audience</label>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {summary.trafficStrategy.targetAudience.primaryAge && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-500">Age Range</span>
                      <p className="text-gray-900">{summary.trafficStrategy.targetAudience.primaryAge}</p>
                    </div>
                  )}
                  {summary.trafficStrategy.targetAudience.primaryLocation && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-500">Location</span>
                      <p className="text-gray-900">{summary.trafficStrategy.targetAudience.primaryLocation}</p>
                    </div>
                  )}
                  {summary.trafficStrategy.targetAudience.primaryInterests?.length > 0 && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-500">Interests</span>
                      <p className="text-gray-900">{summary.trafficStrategy.targetAudience.primaryInterests.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hooks */}
            {summary.trafficStrategy.hooks?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Hooks</label>
                <div className="mt-2 space-y-2">
                  {summary.trafficStrategy.hooks.map((hook, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-500 uppercase">{hook.type.replace(/_/g, ' ')}</span>
                      <p className="text-gray-900 mt-1">{hook.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Landing Page */}
      {summary.landingPage && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-cyan-50 to-sky-50">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-600" />
              <h2 className="text-lg font-semibold text-gray-900">Landing Page Strategy</h2>
            </div>
          </CardHeader>
          <CardBody className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {summary.landingPage.name && (
                <div>
                  <label className="text-sm text-gray-500">Page Name</label>
                  <p className="mt-1 font-medium text-gray-900">{summary.landingPage.name}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-500">Page Type</label>
                <p className="mt-1 font-medium text-gray-900">
                  {(summary.landingPage.funnelType || summary.landingPage.type)?.replace(/_/g, ' ') || 'N/A'}
                </p>
              </div>
              {summary.landingPage.platform && (
                <div>
                  <label className="text-sm text-gray-500">Platform</label>
                  <p className="mt-1 font-medium text-gray-900 capitalize">
                    {summary.landingPage.platform}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-500">Lead Capture Method</label>
                <p className="mt-1 font-medium text-gray-900">
                  {summary.landingPage.leadCaptureMethod || summary.landingPage.leadCapture?.method || 'N/A'}
                </p>
              </div>
              {summary.landingPage.hook && (
                <div>
                  <label className="text-sm text-gray-500">Hook</label>
                  <p className="mt-1 text-gray-900">{summary.landingPage.hook}</p>
                </div>
              )}
              {summary.landingPage.angle && (
                <div>
                  <label className="text-sm text-gray-500">Angle</label>
                  <p className="mt-1 text-gray-900">{summary.landingPage.angle}</p>
                </div>
              )}
            </div>

            {summary.landingPage.headline && (
              <div>
                <label className="text-sm text-gray-500">Headline</label>
                <p className="mt-1 text-xl font-semibold text-gray-900">{summary.landingPage.headline}</p>
              </div>
            )}
            {summary.landingPage.subheadline && (
              <div>
                <label className="text-sm text-gray-500">Subheadline</label>
                <p className="mt-1 text-gray-900">{summary.landingPage.subheadline}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(summary.landingPage.cta || summary.landingPage.ctaText) && (
                <div>
                  <label className="text-sm text-gray-500">Call to Action</label>
                  <p className="mt-1 font-semibold text-cyan-600">{summary.landingPage.cta || summary.landingPage.ctaText}</p>
                </div>
              )}
              {summary.landingPage.offer && (
                <div>
                  <label className="text-sm text-gray-500">Offer</label>
                  <p className="mt-1 text-gray-900">{summary.landingPage.offer}</p>
                </div>
              )}
              {summary.landingPage.messaging && (
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-500">Messaging</label>
                  <p className="mt-1 text-gray-900">{summary.landingPage.messaging}</p>
                </div>
              )}
            </div>

            {summary.landingPage.nurturing?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Nurturing Sequence</label>
                <div className="mt-2 space-y-2">
                  {summary.landingPage.nurturing.map((n, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs rounded capitalize">{n.method}</span>
                      <span className="text-gray-700 capitalize">{n.frequency}</span>
                      {n.isActive && <span className="text-green-600 text-sm">Active</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.landingPage.designPreferences && (
              <div>
                <label className="text-sm font-medium text-gray-700">Design Preferences</label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {summary.landingPage.designPreferences.primaryColor && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded border" style={{ backgroundColor: summary.landingPage.designPreferences.primaryColor }}></div>
                      <span className="text-sm text-gray-600">Primary</span>
                    </div>
                  )}
                  {summary.landingPage.designPreferences.secondaryColor && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded border" style={{ backgroundColor: summary.landingPage.designPreferences.secondaryColor }}></div>
                      <span className="text-sm text-gray-600">Secondary</span>
                    </div>
                  )}
                  {summary.landingPage.designPreferences.fontFamily && (
                    <div>
                      <span className="text-sm text-gray-500">Font</span>
                      <p className="text-gray-900">{summary.landingPage.designPreferences.fontFamily}</p>
                    </div>
                  )}
                  {summary.landingPage.designPreferences.style && (
                    <div>
                      <span className="text-sm text-gray-500">Style</span>
                      <p className="text-gray-900 capitalize">{summary.landingPage.designPreferences.style}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Creative Strategy */}
      {summary.creativeStrategy && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              <h2 className="text-lg font-semibold text-gray-900">Creative Strategy</h2>
            </div>
          </CardHeader>
          <CardBody className="p-6 space-y-6">
            {/* Creative Brief */}
            {summary.creativeStrategy.creativeBrief && (
              <div>
                <label className="text-sm font-medium text-gray-700">Creative Brief</label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{summary.creativeStrategy.creativeBrief}</p>
              </div>
            )}

            {/* Brand Guidelines */}
            {summary.creativeStrategy.brandGuidelines && (
              <div>
                <label className="text-sm font-medium text-gray-700">Brand Guidelines</label>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {summary.creativeStrategy.brandGuidelines.logo && (
                    <div>
                      <span className="text-sm text-gray-500">Logo</span>
                      <p className="text-gray-900">{summary.creativeStrategy.brandGuidelines.logo}</p>
                    </div>
                  )}
                  {summary.creativeStrategy.brandGuidelines.colors?.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-500">Colors</span>
                      <div className="flex gap-2 mt-1">
                        {summary.creativeStrategy.brandGuidelines.colors.map((color, idx) => (
                          <div key={idx} className="w-8 h-8 rounded border" style={{ backgroundColor: color }} title={color}></div>
                        ))}
                      </div>
                    </div>
                  )}
                  {summary.creativeStrategy.brandGuidelines.fonts?.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-500">Fonts</span>
                      <p className="text-gray-900">{summary.creativeStrategy.brandGuidelines.fonts.join(', ')}</p>
                    </div>
                  )}
                  {summary.creativeStrategy.brandGuidelines.toneOfVoice && (
                    <div>
                      <span className="text-sm text-gray-500">Tone of Voice</span>
                      <p className="text-gray-900">{summary.creativeStrategy.brandGuidelines.toneOfVoice}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Creative Plan (New System) */}
            {summary.creativeStrategy.creativePlan?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Creative Plan</label>
                <div className="mt-2 space-y-3">
                  {summary.creativeStrategy.creativePlan.map((item, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{item.name || `${item.creativeType} - ${item.subType}`}</h4>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded capitalize">
                          {item.creativeType}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Sub-type:</span>
                          <span className="ml-1">{item.subType}</span>
                        </div>
                        {item.objective && (
                          <div>
                            <span className="text-gray-500">Objective:</span>
                            <span className="ml-1 capitalize">{item.objective.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                        {item.platforms?.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Platforms:</span>
                            <span className="ml-1">{item.platforms.join(', ')}</span>
                          </div>
                        )}
                        {item.assignedRole && (
                          <div>
                            <span className="text-gray-500">Assigned:</span>
                            <span className="ml-1 capitalize">{item.assignedRole.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                        {item.aiFramework && (
                          <div>
                            <span className="text-gray-500">Framework:</span>
                            <span className="ml-1">{item.aiFramework}</span>
                          </div>
                        )}
                        {item.notes && (
                          <div className="col-span-2 md:col-span-4">
                            <span className="text-gray-500">Notes:</span>
                            <span className="ml-1">{item.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legacy Ad Types */}
            {summary.creativeStrategy.adTypes?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Ad Types</label>
                <div className="mt-2 space-y-4">
                  {summary.creativeStrategy.adTypes.map((adType, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">{adType.typeName}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {adType.creatives?.imageCreatives !== undefined && (
                          <div>
                            <span className="text-gray-500">Image Creatives:</span>
                            <span className="ml-2 font-medium">{adType.creatives.imageCreatives}</span>
                          </div>
                        )}
                        {adType.creatives?.videoCreatives !== undefined && (
                          <div>
                            <span className="text-gray-500">Video Creatives:</span>
                            <span className="ml-2 font-medium">{adType.creatives.videoCreatives}</span>
                          </div>
                        )}
                        {adType.creatives?.carouselCreatives !== undefined && (
                          <div>
                            <span className="text-gray-500">Carousel Creatives:</span>
                            <span className="ml-2 font-medium">{adType.creatives.carouselCreatives}</span>
                          </div>
                        )}
                        {adType.creatives?.platforms?.length > 0 && (
                          <div className="col-span-2 md:col-span-4">
                            <span className="text-gray-500">Platforms:</span>
                            <span className="ml-2">{adType.creatives.platforms.join(', ')}</span>
                          </div>
                        )}
                        {adType.creatives?.hook && (
                          <div className="col-span-2 md:col-span-4">
                            <span className="text-gray-500">Hook:</span>
                            <span className="ml-2">{adType.creatives.hook}</span>
                          </div>
                        )}
                        {adType.creatives?.headline && (
                          <div className="col-span-2 md:col-span-4">
                            <span className="text-gray-500">Headline:</span>
                            <span className="ml-2 font-medium">{adType.creatives.headline}</span>
                          </div>
                        )}
                        {adType.creatives?.cta && (
                          <div>
                            <span className="text-gray-500">CTA:</span>
                            <span className="ml-2 font-medium text-yellow-600">{adType.creatives.cta}</span>
                          </div>
                        )}
                        {adType.creatives?.messagingAngle && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Messaging Angle:</span>
                            <span className="ml-2">{adType.creatives.messagingAngle}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Creative Categories */}
            {summary.creativeStrategy.creativeCategories?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Creative Categories</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {summary.creativeStrategy.creativeCategories.map((cat, idx) => (
                    <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                      {cat.category}: {cat.quantity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {summary.creativeStrategy.additionalNotes && (
              <div>
                <label className="text-sm font-medium text-gray-700">Additional Notes</label>
                <p className="mt-1 text-gray-900">{summary.creativeStrategy.additionalNotes}</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => navigate(`/dashboard/projects/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Project
        </Button>
        {/* <Button onClick={() => navigate(`/creative-strategy?projectId=${id}`)}>
          <Lightbulb className="w-4 h-4 mr-2" />
          Edit Creative Strategy
        </Button> */}
      </div>
    </div>
  );
}