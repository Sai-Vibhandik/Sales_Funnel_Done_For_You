/**
 * Local Storage Utility for Stage Data Persistence
 *
 * This utility provides functions to save, load, and clear stage data
 * from localStorage. It allows performance marketers to navigate between
 * stages while preserving their work-in-progress data.
 */

const STORAGE_PREFIX = 'salesfunnel_stage_';

// Stage names mapped to their route paths
export const STAGE_ROUTES = {
  onboarding: '/dashboard/onboarding',
  marketResearch: '/dashboard/market-research',
  offerEngineering: '/dashboard/offer-engineering',
  trafficStrategy: '/dashboard/traffic-strategy',
  landingPage: '/dashboard/landing-pages',
  creativeStrategy: '/dashboard/creative-strategy',
};

// Stage order for navigation
export const STAGE_ORDER = [
  'onboarding',
  'marketResearch',
  'offerEngineering',
  'trafficStrategy',
  'landingPage',
  'creativeStrategy',
];

/**
 * Get the previous stage key based on current stage
 * @param {string} currentStage - The current stage key
 * @returns {string|null} - The previous stage key or null if no previous stage
 */
export function getPreviousStage(currentStage) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex <= 0) return null;
  return STAGE_ORDER[currentIndex - 1];
}

/**
 * Get the previous stage route based on current stage
 * @param {string} currentStage - The current stage key
 * @param {string} projectId - The project ID for the route
 * @returns {string|null} - The previous stage route or null if no previous stage
 */
export function getPreviousStageRoute(currentStage, projectId) {
  const prevStage = getPreviousStage(currentStage);
  if (!prevStage) return null;

  // Handle special case for landing pages which uses a different route structure
  if (prevStage === 'landingPage') {
    return `/dashboard/landing-pages?projectId=${projectId}`;
  }

  return `${STAGE_ROUTES[prevStage]}?projectId=${projectId}`;
}

/**
 * Save stage data to localStorage
 * @param {string} projectId - The project ID
 * @param {string} stageKey - The stage key (e.g., 'marketResearch')
 * @param {Object} data - The data to save
 */
export function saveStageData(projectId, stageKey, data) {
  try {
    const key = `${STORAGE_PREFIX}${projectId}_${stageKey}`;
    const dataToStore = {
      ...data,
      _savedAt: new Date().toISOString(),
      _isLocalDraft: true,
    };
    localStorage.setItem(key, JSON.stringify(dataToStore));
    return true;
  } catch (error) {
    console.error('Error saving stage data to localStorage:', error);
    return false;
  }
}

/**
 * Load stage data from localStorage
 * @param {string} projectId - The project ID
 * @param {string} stageKey - The stage key
 * @returns {Object|null} - The stored data or null if not found
 */
export function loadStageData(projectId, stageKey) {
  try {
    const key = `${STORAGE_PREFIX}${projectId}_${stageKey}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const data = JSON.parse(stored);
    return data;
  } catch (error) {
    console.error('Error loading stage data from localStorage:', error);
    return null;
  }
}

/**
 * Clear stage data from localStorage
 * @param {string} projectId - The project ID
 * @param {string} stageKey - The stage key
 */
export function clearStageData(projectId, stageKey) {
  try {
    const key = `${STORAGE_PREFIX}${projectId}_${stageKey}`;
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error clearing stage data from localStorage:', error);
    return false;
  }
}

/**
 * Clear all stage data for a project from localStorage
 * @param {string} projectId - The project ID
 */
export function clearAllStageData(projectId) {
  try {
    STAGE_ORDER.forEach(stageKey => {
      const key = `${STORAGE_PREFIX}${projectId}_${stageKey}`;
      localStorage.removeItem(key);
    });
    return true;
  } catch (error) {
    console.error('Error clearing all stage data from localStorage:', error);
    return false;
  }
}

/**
 * Check if there's locally saved data for a stage
 * @param {string} projectId - The project ID
 * @param {string} stageKey - The stage key
 * @returns {boolean} - True if local draft exists
 */
export function hasLocalDraft(projectId, stageKey) {
  const data = loadStageData(projectId, stageKey);
  return data !== null && data._isLocalDraft === true;
}

/**
 * Get timestamp of when local draft was saved
 * @param {string} projectId - The project ID
 * @param {string} stageKey - The stage key
 * @returns {string|null} - ISO timestamp or null
 */
export function getLocalDraftTimestamp(projectId, stageKey) {
  const data = loadStageData(projectId, stageKey);
  return data?._savedAt || null;
}