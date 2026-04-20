/**
 * Ollama Service - Handles communication with Ollama LLM
 * Used for generating optimized prompts for content creation
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT) || 60000; // 60 seconds default

/**
 * System prompt for the Content Planner AI
 * This transforms base prompts into high-converting final prompts
 */
const CONTENT_PLANNER_SYSTEM_PROMPT = `You are an expert Performance Marketer and Prompt Engineer.

Your job is to transform a BASE PROMPT into a HIGH-CONVERTING FINAL PROMPT using the given CONTEXT.

Rules:
- Replace all placeholders with real context
- Make the prompt highly specific and actionable
- Optimize based on funnel stage:
  * Awareness → emotional, problem-focused
  * Consideration → solution-focused, trust-building
  * Conversion → urgency, CTA, offer-driven
- Optimize for platform behavior:
  * Instagram → scroll-stopping, visual
  * Facebook → emotional + descriptive
  * YouTube → storytelling
  * LinkedIn → professional, value-driven
  * Landing Page → structured, high-conversion
- Add marketing psychology: fear, desire, curiosity, urgency
- Ensure output can be used by writers, designers, or video editors
- Do NOT explain anything
- Output ONLY the final prompt, no introduction or conclusion`;

/**
 * Generate a final optimized prompt using Ollama
 * @param {Object} params - Parameters for prompt generation
 * @param {string} params.basePrompt - The base prompt template
 * @param {Object} params.context - Context information
 * @param {string} params.context.problem - The problem being solved
 * @param {string} params.context.audience - Target audience
 * @param {string} params.context.platform - Platform (Instagram, Facebook, etc.)
 * @param {string} params.context.funnelStage - Funnel stage (Awareness, Consideration, Conversion)
 * @param {string} params.context.goal - The goal of the content
 * @param {string} params.context.offer - The offer/product (optional)
 * @param {string} params.context.creativeType - Type of creative (optional)
 * @param {string} params.context.hook - Hook from strategy (optional)
 * @param {string} params.context.headline - Headline from strategy (optional)
 * @param {string} params.context.cta - Call to action (optional)
 * @returns {Promise<string>} - The generated final prompt
 */
async function generateFinalPrompt({ basePrompt, context }) {
  try {
    // Build the user prompt with context
    const userPrompt = buildUserPrompt(basePrompt, context);

    // Call Ollama API
    const response = await callOllama(CONTENT_PLANNER_SYSTEM_PROMPT, userPrompt);

    return response;
  } catch (error) {
    console.error('Error generating prompt with Ollama:', error);
    throw new Error('Failed to generate prompt. Please check if Ollama is running.');
  }
}

/**
 * Build the user prompt from base prompt and context
 */
function buildUserPrompt(basePrompt, context) {
  const {
    problem = '',
    audience = '',
    platform = '',
    funnelStage = '',
    goal = '',
    offer = '',
    creativeType = '',
    hook = '',
    headline = '',
    cta = '',
    brandName = '',
    industry = '',
    painPoints = [],
    desires = []
  } = context;

  let prompt = `BASE PROMPT:
${basePrompt}

CONTEXT:
`;

  if (problem) prompt += `Problem: ${problem}\n`;
  if (audience) prompt += `Audience: ${audience}\n`;
  if (platform) prompt += `Platform: ${platform}\n`;
  if (funnelStage) prompt += `Funnel Stage: ${funnelStage}\n`;
  if (goal) prompt += `Goal: ${goal}\n`;
  if (offer) prompt += `Offer: ${offer}\n`;
  if (creativeType) prompt += `Creative Type: ${creativeType}\n`;
  if (brandName) prompt += `Brand: ${brandName}\n`;
  if (industry) prompt += `Industry: ${industry}\n`;
  if (hook) prompt += `Hook: ${hook}\n`;
  if (headline) prompt += `Headline: ${headline}\n`;
  if (cta) prompt += `Call to Action: ${cta}\n`;
  if (painPoints && painPoints.length > 0) prompt += `Pain Points: ${painPoints.join(', ')}\n`;
  if (desires && desires.length > 0) prompt += `Desires: ${desires.join(', ')}\n`;

  prompt += `\nGenerate the FINAL PROMPT now:`;

  return prompt;
}

/**
 * Call Ollama API
 */
async function callOllama(systemPrompt, userPrompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT);

  try {
    // Prepare headers - add Authorization if API key is configured
    const headers = {
      'Content-Type': 'application/json'
    };

    if (OLLAMA_API_KEY) {
      headers['Authorization'] = `Bearer ${OLLAMA_API_KEY}`;
    }

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.response) {
      throw new Error('No response from Ollama');
    }

    return data.response.trim();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Ollama request timed out');
    }

    throw error;
  }
}

/**
 * Check if Ollama is available
 */
async function checkOllamaHealth() {
  try {
    // Prepare headers - add Authorization if API key is configured
    const headers = {
      'Content-Type': 'application/json'
    };

    if (OLLAMA_API_KEY) {
      headers['Authorization'] = `Bearer ${OLLAMA_API_KEY}`;
    }

    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      return { available: false, error: 'Ollama not responding' };
    }

    const data = await response.json();
    const models = data.models || [];

    // Check if the configured model is available
    const modelAvailable = models.some(m => m.name.includes(OLLAMA_MODEL.split(':')[0]));

    return {
      available: true,
      modelAvailable,
      model: OLLAMA_MODEL,
      models: models.map(m => m.name)
    };
  } catch (error) {
    return {
      available: false,
      error: 'Cannot connect to Ollama. Make sure Ollama is running on ' + OLLAMA_BASE_URL
    };
  }
}

/**
 * Generate prompt for specific creative type
 */
async function generateCreativePrompt({ basePrompt, task, creativeStrategy }) {
  // Extract context from task and creative strategy
  const context = {
    platform: task?.strategyContext?.platform || '',
    funnelStage: task?.strategyContext?.funnelStage || 'awareness',
    hook: task?.strategyContext?.hook || creativeStrategy?.adTypes?.[0]?.creatives?.hook || '',
    headline: task?.strategyContext?.headline || creativeStrategy?.adTypes?.[0]?.creatives?.headline || '',
    cta: task?.strategyContext?.cta || creativeStrategy?.adTypes?.[0]?.creatives?.cta || '',
    creativeType: task?.taskType || '',
    offer: creativeStrategy?.offer?.value || '',
    problem: creativeStrategy?.marketResearch?.painPoints?.join(', ') || '',
    audience: creativeStrategy?.marketResearch?.avatar?.description || '',
    goal: 'Create engaging content that converts'
  };

  return generateFinalPrompt({ basePrompt, context });
}

module.exports = {
  generateFinalPrompt,
  generateCreativePrompt,
  checkOllamaHealth,
  CONTENT_PLANNER_SYSTEM_PROMPT
};