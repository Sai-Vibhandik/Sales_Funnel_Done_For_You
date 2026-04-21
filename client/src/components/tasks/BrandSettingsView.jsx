import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { brandSettingsService, taskService } from '@/services/api';
import {
  Palette, Type, Image, FileText, Download, ExternalLink, Copy, Check, X, RefreshCw, Upload, Trash2, Save
} from 'lucide-react';
import { Card, CardBody, CardHeader, Button, Spinner } from '@/components/ui';

// Common font families
const FONT_FAMILIES = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway',
  'Nunito', 'Ubuntu', 'Playfair Display', 'Merriweather', 'Lora', 'Source Sans Pro',
  'PT Sans', 'Work Sans', 'Quicksand', 'Rubik', 'Heebo', 'Barlow',
  'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana',
  'Proxima Nova', 'Avenir', 'Futura', 'Gill Sans', 'Century Gothic', 'Arial Black'
];

export default function BrandSettingsView({ projectId, taskId, onGeneratePrompt, editable = true }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brandSettings, setBrandSettings] = useState(null);
  const [task, setTask] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Editable state for designer modifications
  const [editedColors, setEditedColors] = useState({
    primary: { hex: '', name: 'Primary' },
    secondary: { hex: '', name: 'Secondary' },
    tertiary: { hex: '', name: 'Tertiary' }
  });
  const [editedTypography, setEditedTypography] = useState({
    title: { fontFamily: '' },
    subtitle: { fontFamily: '' },
    body: { fontFamily: '' }
  });

  // Logo selection state
  const [selectedLogo, setSelectedLogo] = useState('brand');

  // Track if designer has made changes
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchData();
  }, [projectId, taskId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch brand settings
      const brandResponse = await brandSettingsService.getBrandSettings(projectId);
      if (brandResponse.data) {
        setBrandSettings(brandResponse.data);
      }

      // Fetch task if taskId provided
      if (taskId) {
        const taskResponse = await taskService.getTask(taskId);
        if (taskResponse.data) {
          setTask(taskResponse.data);

          // Load designer overrides if they exist
          if (taskResponse.data.designerBrandOverrides) {
            const overrides = taskResponse.data.designerBrandOverrides;

            if (overrides.colors) {
              setEditedColors({
                primary: overrides.colors.primary || { hex: '', name: 'Primary' },
                secondary: overrides.colors.secondary || { hex: '', name: 'Secondary' },
                tertiary: overrides.colors.tertiary || { hex: '', name: 'Tertiary' }
              });
            }

            if (overrides.typography) {
              setEditedTypography({
                title: overrides.typography.title || { fontFamily: '' },
                subtitle: overrides.typography.subtitle || { fontFamily: '' },
                body: overrides.typography.body || { fontFamily: '' }
              });
            }

            if (overrides.selectedLogo) {
              setSelectedLogo(overrides.selectedLogo);
            }
          }

          // If task has custom logo, select it by default
          if (taskResponse.data.customLogo?.path && !taskResponse.data.designerBrandOverrides?.selectedLogo) {
            setSelectedLogo('custom');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load brand settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCustomLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPG, PNG, GIF, WebP, or SVG)');
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('logo', file);

      const response = await taskService.uploadCustomLogo(taskId, formData);
      setTask(response.data);
      setSelectedLogo('custom');
      setHasChanges(true);
      toast.success('Custom logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading custom logo:', error);
      toast.error('Failed to upload custom logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteCustomLogo = async () => {
    if (!confirm('Are you sure you want to delete your custom logo?')) return;

    try {
      await taskService.deleteCustomLogo(taskId);
      setTask(prev => ({ ...prev, customLogo: null }));
      setSelectedLogo('brand');
      toast.success('Custom logo deleted');
    } catch (error) {
      console.error('Error deleting custom logo:', error);
      toast.error('Failed to delete custom logo');
    }
  };

  const handleSaveBrandOverrides = async () => {
    if (!taskId) {
      toast.error('Task ID is required');
      return;
    }

    try {
      setSaving(true);
      await taskService.saveDesignerBrandOverrides(taskId, {
        colors: editedColors,
        typography: editedTypography,
        selectedLogo
      });
      setHasChanges(false);
      toast.success('Brand settings saved successfully');
    } catch (error) {
      console.error('Error saving brand overrides:', error);
      toast.error('Failed to save brand settings');
    } finally {
      setSaving(false);
    }
  };

  const copyColorToClipboard = (hex) => {
    navigator.clipboard.writeText(hex);
    toast.success(`Copied ${hex} to clipboard`);
  };

  const handleColorChange = (key, field, value) => {
    setEditedColors(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
    setHasChanges(true);
  };

  const handleFontChange = (key, value) => {
    setEditedTypography(prev => ({
      ...prev,
      [key]: { fontFamily: value }
    }));
    setHasChanges(true);
  };

  const handleLogoSelection = (logoType) => {
    setSelectedLogo(logoType);
    setHasChanges(true);
  };

  const resetToDefault = () => {
    if (brandSettings) {
      if (brandSettings.colors) {
        setEditedColors({
          primary: brandSettings.colors.primary || { hex: '', name: 'Primary' },
          secondary: brandSettings.colors.secondary || { hex: '', name: 'Secondary' },
          tertiary: brandSettings.colors.tertiary || { hex: '', name: 'Tertiary' }
        });
      }
      if (brandSettings.typography) {
        setEditedTypography({
          title: brandSettings.typography.title || { fontFamily: '' },
          subtitle: brandSettings.typography.subtitle || { fontFamily: '' },
          body: brandSettings.typography.body || { fontFamily: '' }
        });
      }
      setSelectedLogo('brand');
      setHasChanges(true);
      toast.success('Reset to brand guidelines');
    }
  };

  const generateBrandPrompt = () => {
    const parts = [];

    // Colors - use edited values
    if (editedColors.primary?.hex) {
      parts.push(`Primary Color: ${editedColors.primary.hex}`);
    }
    if (editedColors.secondary?.hex) {
      parts.push(`Secondary Color: ${editedColors.secondary.hex}`);
    }
    if (editedColors.tertiary?.hex) {
      parts.push(`Tertiary Color: ${editedColors.tertiary.hex}`);
    }

    // Typography - use edited values
    if (editedTypography.title?.fontFamily) {
      parts.push(`Title Font: ${editedTypography.title.fontFamily}`);
    }
    if (editedTypography.subtitle?.fontFamily) {
      parts.push(`Subtitle Font: ${editedTypography.subtitle.fontFamily}`);
    }
    if (editedTypography.body?.fontFamily) {
      parts.push(`Body Font: ${editedTypography.body.fontFamily}`);
    }

    // Logo - include selected logo URL
    if (selectedLogo === 'custom' && task?.customLogo?.path) {
      parts.push(`Logo: ${task.customLogo.path} (Custom Logo)`);
    } else if (brandSettings?.logos?.primary?.filePath) {
      parts.push(`Logo: ${brandSettings.logos.primary.filePath} (Brand Logo)`);
    }

    return parts.length > 0 ? `Brand Guidelines:\n${parts.join('\n')}` : '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!brandSettings) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardBody className="text-center py-8">
          <Palette className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Brand Settings Available</h3>
          <p className="text-gray-600 mt-2">
            The performance marketer hasn't set up brand guidelines for this project yet.
          </p>
        </CardBody>
      </Card>
    );
  }

  const hasBrandSettings =
    (brandSettings.colors && Object.values(brandSettings.colors).some(c => c?.hex)) ||
    (brandSettings.typography && Object.values(brandSettings.typography).some(t => t?.fontFamily)) ||
    brandSettings.brandManual?.filePath ||
    brandSettings.logos?.primary?.filePath;

  if (!hasBrandSettings && !task?.customLogo?.path) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardBody className="text-center py-8">
          <Palette className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Brand Settings Not Configured</h3>
          <p className="text-gray-600 mt-2">
            The performance marketer needs to configure brand colors, typography, and logos.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brand Manual */}
      {brandSettings.brandManual?.filePath && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Brand Manual
            </h3>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-medium">{brandSettings.brandManual.fileName}</p>
                  <p className="text-sm text-gray-500">
                    Uploaded {new Date(brandSettings.brandManual.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(brandSettings.brandManual.filePath, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Manual
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Logos - Brand Logos + Custom Logo Upload */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Image className="w-5 h-5" />
              Logos
            </h3>
            {editable && taskId && (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleUploadCustomLogo}
                  className="hidden"
                  disabled={uploadingLogo}
                />
                <Button variant="outline" size="sm" disabled={uploadingLogo}>
                  {uploadingLogo ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Custom Logo
                </Button>
              </label>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {editable
              ? 'Select which logo to use, or upload your own if the brand logo doesn\'t work'
              : 'Brand logos from performance marketer'}
          </p>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {/* Brand Logo */}
            {brandSettings.logos?.primary?.filePath && (
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedLogo === 'brand'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => editable && handleLogoSelection('brand')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">Brand Primary Logo</h4>
                    {selectedLogo === 'brand' && (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(brandSettings.logos.primary.filePath, '_blank');
                    }}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <img
                    src={brandSettings.logos.primary.filePath}
                    alt="Brand logo"
                    className="max-h-24 mx-auto object-contain"
                  />
                </div>
                {brandSettings.logos.primary.fileName && (
                  <p className="text-xs text-gray-500 mt-2">{brandSettings.logos.primary.fileName}</p>
                )}
              </div>
            )}

            {/* Custom Logo */}
            {task?.customLogo?.path ? (
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedLogo === 'custom'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => editable && handleLogoSelection('custom')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">Your Custom Logo</h4>
                    {selectedLogo === 'custom' && (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(task.customLogo.path, '_blank');
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    {editable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomLogo();
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <img
                    src={task.customLogo.path}
                    alt="Custom logo"
                    className="max-h-24 mx-auto object-contain"
                  />
                </div>
                {task.customLogo.name && (
                  <p className="text-xs text-gray-500 mt-2">{task.customLogo.name}</p>
                )}
              </div>
            ) : editable && taskId && (
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={handleUploadCustomLogo}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {uploadingLogo ? 'Uploading...' : 'Click to upload your own logo (optional)'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Use this if the brand logo doesn't work for your design</p>
                </label>
              </div>
            )}

            {/* Additional Brand Logos */}
            {brandSettings.logos?.secondary?.filePath && (
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Secondary Logo</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(brandSettings.logos.secondary.filePath, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <img
                    src={brandSettings.logos.secondary.filePath}
                    alt="Secondary logo"
                    className="max-h-20 mx-auto object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Brand Colors - Editable */}
      {editable && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Brand Colors
              </h3>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <Button variant="ghost" size="sm" onClick={resetToDefault}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Reset to Brand
                  </Button>
                )}
                <p className="text-sm text-gray-500">Click color to copy, use picker to change</p>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(editedColors).map(([key, color]) => (
                <div key={key} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 capitalize">
                    {key} Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color.hex || '#000000'}
                      onChange={(e) => handleColorChange(key, 'hex', e.target.value)}
                      className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={color.hex}
                      onChange={(e) => handleColorChange(key, 'hex', e.target.value)}
                      placeholder="#000000"
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* Preview */}
                  <div
                    className="w-full h-12 rounded-lg border border-gray-200 cursor-pointer"
                    style={{ backgroundColor: color.hex || '#ffffff' }}
                    onClick={() => color.hex && copyColorToClipboard(color.hex)}
                    title="Click to copy"
                  />
                </div>
              ))}
            </div>
            {/* Show original values if changed */}
            {hasChanges && brandSettings.colors && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> You've modified colors from the original brand guidelines.
                  The original colors were:
                  {brandSettings.colors.primary?.hex && ` Primary: ${brandSettings.colors.primary.hex}`}
                  {brandSettings.colors.secondary?.hex && `, Secondary: ${brandSettings.colors.secondary.hex}`}
                  {brandSettings.colors.tertiary?.hex && `, Tertiary: ${brandSettings.colors.tertiary.hex}`}
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Typography - Editable */}
      {editable && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Type className="w-5 h-5" />
                Typography
              </h3>
              {hasChanges && (
                <Button variant="ghost" size="sm" onClick={resetToDefault}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reset to Brand
                </Button>
              )}
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {Object.entries(editedTypography).map(([key, typo]) => (
                <div key={key} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 capitalize">
                    {key} Font
                  </label>
                  <select
                    value={typo.fontFamily}
                    onChange={(e) => handleFontChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Font</option>
                    {FONT_FAMILIES.map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                  {/* Preview */}
                  {typo.fontFamily && (
                    <div
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                      style={{
                        fontFamily: typo.fontFamily,
                        fontSize: key === 'title' ? '24px' : key === 'subtitle' ? '18px' : '16px'
                      }}
                    >
                      {key === 'title' ? 'The Quick Brown Fox Jumps Over The Lazy Dog' :
                       key === 'subtitle' ? 'A compelling subtitle that captures attention' :
                       'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Save and Generate Buttons */}
      <div className="flex justify-end gap-2 flex-wrap">
        {hasChanges && (
          <Button variant="secondary" onClick={resetToDefault}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Original
          </Button>
        )}
        {editable && taskId && hasChanges && (
          <Button onClick={handleSaveBrandOverrides} disabled={saving}>
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        )}
        {onGeneratePrompt && (
          <Button
            onClick={() => {
              const prompt = generateBrandPrompt();
              if (!prompt) {
                toast.error('Please configure at least one color, font, or logo');
                return;
              }
              onGeneratePrompt(prompt);
            }}
          >
            Use in Prompt Generation
          </Button>
        )}
      </div>
    </div>
  );
}