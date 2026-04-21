import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { brandSettingsService } from '@/services/api';
import {
  Upload, Palette, Type, FileText, Image, Trash2, Download, Loader2, RefreshCw
} from 'lucide-react';
import { Card, CardBody, CardHeader, Button, Input, Spinner } from '@/components/ui';

// Common font families
const FONT_FAMILIES = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway',
  'Nunito', 'Ubuntu', 'Playfair Display', 'Merriweather', 'Lora', 'Source Sans Pro',
  'PT Sans', 'Work Sans', 'Quicksand', 'Rubik', 'Heebo', 'Barlow',
  'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana',
  'Proxima Nova', 'Avenir', 'Futura', 'Gill Sans', 'Century Gothic', 'Arial Black'
];

export default function BrandSettingsManager({ projectId, onSave }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [brandSettings, setBrandSettings] = useState(null);

  // Form state
  const [colors, setColors] = useState({
    primary: { hex: '', name: 'Primary' },
    secondary: { hex: '', name: 'Secondary' },
    tertiary: { hex: '', name: 'Tertiary' }
  });

  const [typography, setTypography] = useState({
    title: { fontFamily: '' },
    subtitle: { fontFamily: '' },
    body: { fontFamily: '' }
  });

  const [logos, setLogos] = useState({
    primary: null,
    secondary: null,
    favicon: null
  });

  const [brandManual, setBrandManual] = useState(null);
  const [additionalAssets, setAdditionalAssets] = useState([]);

  useEffect(() => {
    fetchBrandSettings();
  }, [projectId]);

  const fetchBrandSettings = async () => {
    try {
      setLoading(true);
      const response = await brandSettingsService.getBrandSettings(projectId);

      if (response.data) {
        setBrandSettings(response.data);

        if (response.data.colors) {
          setColors(prev => ({ ...prev, ...response.data.colors }));
        }
        if (response.data.typography) {
          setTypography(prev => ({ ...prev, ...response.data.typography }));
        }
        if (response.data.logos) {
          setLogos(response.data.logos);
        }
        if (response.data.brandManual) {
          setBrandManual(response.data.brandManual);
        }
        if (response.data.additionalAssets) {
          setAdditionalAssets(response.data.additionalAssets);
        }
      }
    } catch (error) {
      console.error('Error fetching brand settings:', error);
      toast.error('Failed to load brand settings');
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (colorType, field, value) => {
    setColors(prev => ({
      ...prev,
      [colorType]: { ...prev[colorType], [field]: value }
    }));
  };

  const handleTypographyChange = (typoType, field, value) => {
    setTypography(prev => ({
      ...prev,
      [typoType]: { ...prev[typoType], [field]: value }
    }));
  };

  const handleManualUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    try {
      setSaving(true);
      const response = await brandSettingsService.uploadBrandManual(projectId, file);
      setBrandManual(response.data.brandManual);
      toast.success('Brand manual uploaded successfully');
    } catch (error) {
      console.error('Error uploading brand manual:', error);
      toast.error('Failed to upload brand manual');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e, logoType) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, or WEBP file');
      return;
    }

    try {
      setSaving(true);
      const response = await brandSettingsService.uploadLogo(projectId, file, logoType);
      setLogos(response.data.logos);
      toast.success(`${logoType} logo uploaded successfully`);
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setSaving(false);
    }
  };

  const handleExtract = async () => {
    if (!brandManual) {
      toast.error('Please upload a brand manual first');
      return;
    }

    try {
      setExtracting(true);
      const response = await brandSettingsService.extractFromManual(projectId);

      if (response.extractedData) {
        if (response.extractedData.colors) {
          setColors(prev => ({ ...prev, ...response.extractedData.colors }));
        }
        if (response.extractedData.typography) {
          setTypography(prev => ({ ...prev, ...response.extractedData.typography }));
        }

        const colorsFound = response.extractedData.colorsFound || 0;
        const fontsFound = response.extractedData.fontsFound || 0;

        if (response.extractedData.extractionFailed) {
          toast.error('Could not extract data from PDF. Please enter details manually.');
        } else if (colorsFound === 0 && fontsFound === 0) {
          toast.warning('No brand information found in PDF. Please enter details manually.');
        } else if (colorsFound < 3 || fontsFound < 3) {
          toast.success(`Extracted ${colorsFound} color(s) and ${fontsFound} font(s). Fill in missing fields manually.`);
        } else {
          toast.success('Brand information extracted successfully!');
        }
      }
    } catch (error) {
      console.error('Error extracting brand info:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';

      if (errorMessage.includes('Network Error') || errorMessage.includes('ECONNREFUSED')) {
        toast.error('Cannot connect to server. Please check if the server is running.');
      } else if (errorMessage.includes('No brand manual')) {
        toast.error('Please upload a brand manual first, then try extracting.');
      } else {
        toast.error('Failed to extract brand information. You can enter details manually.');
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await brandSettingsService.upsertBrandSettings(projectId, {
        colors,
        typography
      });
      toast.success('Brand settings saved successfully');
      onSave && onSave();
    } catch (error) {
      console.error('Error saving brand settings:', error);
      toast.error('Failed to save brand settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteManual = async () => {
    if (!confirm('Are you sure you want to delete the brand manual?')) return;

    try {
      await brandSettingsService.deleteBrandManual(projectId);
      setBrandManual(null);
      toast.success('Brand manual deleted');
    } catch (error) {
      console.error('Error deleting manual:', error);
      toast.error('Failed to delete brand manual');
    }
  };

  const handleDeleteLogo = async (logoType) => {
    if (!confirm(`Are you sure you want to delete the ${logoType} logo?`)) return;

    try {
      await brandSettingsService.deleteLogo(projectId, logoType);
      setLogos(prev => ({ ...prev, [logoType]: null }));
      toast.success('Logo deleted');
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast.error('Failed to delete logo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brand Manual Upload */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Brand Manual
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload your brand manual (PDF) to automatically extract brand colors and typography
          </p>
        </CardHeader>
        <CardBody>
          {brandManual ? (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-medium">{brandManual.fileName}</p>
                  <p className="text-sm text-gray-500">
                    Uploaded {new Date(brandManual.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExtract}
                  disabled={extracting}
                >
                  {extracting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Extract Brand Info
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(brandManual.filePath, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteManual}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                id="brandManual"
                accept=".pdf"
                onChange={handleManualUpload}
                className="hidden"
              />
              <label
                htmlFor="brandManual"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <span className="text-gray-600 font-medium">Upload Brand Manual (PDF)</span>
                <span className="text-sm text-gray-400 mt-1">Click or drag file to upload</span>
              </label>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Brand Colors */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Brand Colors
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Define your brand's color palette
          </p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(colors).map(([key, color]) => (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 capitalize">
                  {key} Color
                </label>
                <div className="flex items-center gap-3">
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <input
                  type="text"
                  value={color.name || ''}
                  onChange={(e) => handleColorChange(key, 'name', e.target.value)}
                  placeholder="Color name (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Type className="w-5 h-5" />
            Typography
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Define font families for your brand
          </p>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {Object.entries(typography).map(([key, typo]) => (
              <div key={key} className="flex items-center gap-4">
                <label className="w-24 text-sm font-medium text-gray-700 capitalize">{key}</label>
                <select
                  value={typo.fontFamily}
                  onChange={(e) => handleTypographyChange(key, 'fontFamily', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Font</option>
                  {FONT_FAMILIES.map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Image className="w-5 h-5" />
            Brand Logo
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload your brand logos (PNG, JPG, or WEBP)
          </p>
        </CardHeader>
        <CardBody>
          <div className="grid ">
            {[''].map(logoType => (
              <div key={logoType} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 text-center capitalize">
                  {logoType} Logo
                </label>
                {logos[logoType]?.filePath ? (
                  <div className="relative">
                    <img
                      src={logos[logoType].filePath}
                      alt={`${logoType} logo`}
                      className="w-full h-32 object-contain border border-gray-200 rounded-lg bg-gray-50 p-2"
                    />
                    <button
                      onClick={() => handleDeleteLogo(logoType)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      id={`logo-${logoType}`}
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) => handleLogoUpload(e, logoType)}
                      className="hidden"
                    />
                    <label
                      htmlFor={`logo-${logoType}`}
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Upload {logoType} logo</span>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Brand Settings'
          )}
        </Button>
      </div>
    </div>
  );
}