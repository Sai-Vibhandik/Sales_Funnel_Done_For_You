/**
 * URL Helper Utility
 * Extracts the correct frontend URL for email links and other purposes
 */

/**
 * Get the frontend URL for email links
 * Returns the production URL if available, otherwise the first URL
 * @returns {string} The frontend URL
 */
const getFrontendUrl = () => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  // Split by comma to handle multiple URLs (CORS configuration)
  const urls = clientUrl.split(',').map(url => url.trim());

  // Prefer production URL (non-localhost)
  const productionUrl = urls.find(url => !url.includes('localhost'));

  // Return production URL if found, otherwise first URL
  return productionUrl || urls[0] || 'http://localhost:5173';
};

/**
 * Get the server URL (API server) where static files are served
 * @returns {string} The server URL
 */
const getServerUrl = () => {
  // In production, server and frontend are on the same domain
  const frontendUrl = getFrontendUrl();

  // Check if we're in production (non-localhost)
  if (!frontendUrl.includes('localhost')) {
    return frontendUrl;
  }

  // In development, server runs on port 9000
  const port = process.env.PORT || 9000;
  return `http://localhost:${port}`;
};

/**
 * Build a full URL for a given path
 * @param {string} path - The path to append to the frontend URL
 * @returns {string} The full URL
 */
const buildUrl = (path) => {
  const baseUrl = getFrontendUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

/**
 * Get the asset URL for images and static files served from server
 * IMPORTANT: For emails, always use production URL since email clients
 * cannot access localhost URLs
 * @param {string} assetName - The name of the asset file
 * @returns {string} The full asset URL
 */
const getAssetUrl = (assetName) => {
  // Always use production URL for assets in emails
  // Email clients (Gmail, Outlook) cannot access localhost URLs
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const urls = clientUrl.split(',').map(url => url.trim());

  // Find production URL (non-localhost)
  const productionUrl = urls.find(url => !url.includes('localhost'));

  if (productionUrl) {
    // In production, frontend and backend are on the same domain
    return `${productionUrl}/uploads/assets/${assetName}`;
  }

  // Fallback for local testing - use the actual server port
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}/uploads/assets/${assetName}`;
};

/**
 * Get the logo URL
 * @returns {string} The logo URL
 */
const getLogoUrl = () => {
  return getAssetUrl('growth-valley-logo.webp');
};

module.exports = {
  getFrontendUrl,
  getServerUrl,
  buildUrl,
  getAssetUrl,
  getLogoUrl
};