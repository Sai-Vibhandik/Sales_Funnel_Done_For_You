/**
 * AI Service - Handles communication with various AI providers
 * Supports: OpenAI, Ollama, Gemini, Hypereal, DeepSeek (configurable via AI_PROVIDER env var)
 */

const { replaceTemplatePlaceholders } = require('../utils/frameworkTemplates');

const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

// DeepSeek Configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

// Ollama Configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT) || 60000;

// Gemini Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Hypereal AI Configuration
const HYPEREAL_API_KEY = process.env.HYPEREAL_API_KEY;
const HYPEREAL_MODEL = process.env.HYPEREAL_MODEL || 'claude-sonnet-4-6';
const HYPEREAL_BASE_URL = process.env.HYPEREAL_BASE_URL || 'https://api.hypereal.tech/v1';

/**
 * System prompt for content generation
 */
const CONTENT_GENERATION_SYSTEM_PROMPT = `You are an expert Performance Marketer and Copywriter specializing in creating high-converting content.

Your job is to generate professional, engaging content based on the provided framework and context.

Rules:
- Follow the framework structure strictly
- Make content specific and actionable
- Use emotional hooks and persuasive language
- Optimize for the specified platform
- Include the hook, body, and call-to-action
- Use proper formatting and structure
- Do NOT include any meta-commentary or explanations
- Output ONLY the generated content, ready to use`;

/**
 * Generate content using OpenAI
 */
async function generateWithOpenAI(systemPrompt, userPrompt) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI');
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('OpenAI request timed out');
    }

    throw error;
  }
}

/**
 * Generate content using Ollama
 */
// async function generateWithOllama(systemPrompt, userPrompt) {
//   const controller = new AbortController();
//   const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT);

//   try {
//     // Prepare headers - add Authorization if API key is configured
//     const headers = {
//       'Content-Type': 'application/json'
//     };

//     if (OLLAMA_API_KEY) {
//       headers['Authorization'] = `Bearer ${OLLAMA_API_KEY}`;
//     }

//     const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
//       method: 'POST',
//       headers,
//       body: JSON.stringify({
//         model: OLLAMA_MODEL,
//         prompt: `${systemPrompt}\n\n${userPrompt}`,
//         stream: false,
//         options: {
//           temperature: 0.7,
//           top_p: 0.9,
//           top_k: 40
//         }
//       }),
//       signal: controller.signal
//     });

//     clearTimeout(timeoutId);

//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
//     }

//     const data = await response.json();

//     if (!data.response) {
//       throw new Error('No response from Ollama');
//     }

//     return data.response.trim();
//   } catch (error) {
//     clearTimeout(timeoutId);

//     if (error.name === 'AbortError') {
//       throw new Error('Ollama request timed out');
//     }

//     throw error;
//   }
// }
async function generateWithOllama(systemPrompt, userPrompt) {
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

    // Determine the endpoint URL
    // If OLLAMA_BASE_URL already ends with /api/chat or /api/generate, use it as-is
    // Otherwise append /api/chat
    let endpointUrl = OLLAMA_BASE_URL;
    if (!endpointUrl.endsWith('/api/chat') && !endpointUrl.endsWith('/api/generate')) {
      endpointUrl = `${endpointUrl}/api/chat`;
    }

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
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

    if (!data.message || !data.message.content) {
      throw new Error('No response from Ollama');
    }

    return data.message.content.trim();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Ollama request timed out');
    }

    throw error;
  }
}
/**
 * Generate content using Gemini
 */
async function generateWithGemini(systemPrompt, userPrompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY in your .env file');
  }

  // List of models to try in order
  const modelsToTry = [
    GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001'
  ].filter(Boolean);

  // Remove duplicates
  const uniqueModels = [...new Set(modelsToTry)];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  for (const model of uniqueModels) {
    try {
      console.log(`[Gemini] Trying model: ${model}`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\n${userPrompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
          }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || `Status ${response.status}`;
        console.error(`[Gemini] Model ${model} failed:`, errorMessage);

        // If it's an API key error, don't try other models
        if (errorMessage.includes('API key') || errorMessage.includes('API Key') || response.status === 400 || response.status === 401 || response.status === 403) {
          clearTimeout(timeoutId);
          throw new Error('Invalid Gemini API key. Get a new key from: https://aistudio.google.com/app/apikey');
        }

        // Try next model
        continue;
      }

      const data = await response.json();

      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.error(`[Gemini] Model ${model} returned invalid response`);
        continue;
      }

      clearTimeout(timeoutId);
      console.log(`[Gemini] Successfully used model: ${model}`);
      return data.candidates[0].content.parts[0].text.trim();

    } catch (error) {
      if (error.name === 'AbortError') {
        clearTimeout(timeoutId);
        throw new Error('Gemini request timed out after 90 seconds');
      }

      // Re-throw API key errors
      if (error.message.includes('API key')) {
        clearTimeout(timeoutId);
        throw error;
      }

      console.error(`[Gemini] Model ${model} error:`, error.message);
      // Continue to next model
    }
  }

  clearTimeout(timeoutId);
  throw new Error('All Gemini models failed. Please check your API key and try again. Get a key from: https://aistudio.google.com/app/apikey');
}

/**
 * Generate content using Hypereal AI (OpenAI-compatible API)
 */
async function generateWithHypereal(systemPrompt, userPrompt) {
  if (!HYPEREAL_API_KEY) {
    throw new Error('Hypereal AI API key not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${HYPEREAL_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HYPEREAL_API_KEY}`
      },
      body: JSON.stringify({
        model: HYPEREAL_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Hypereal API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from Hypereal AI');
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Hypereal AI request timed out');
    }

    throw error;
  }
}

/**
 * Generate content using DeepSeek (OpenAI-compatible API)
 */
async function generateWithDeepSeek(systemPrompt, userPrompt) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API key not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from DeepSeek');
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('DeepSeek request timed out');
    }

    throw error;
  }
}

/**
 * Main generate function - routes to appropriate AI provider
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @param {string} provider - Optional provider override (ollama, gemini, openai, hypereal, deepseek)
 */
async function generateContent(systemPrompt, userPrompt, provider = null) {
  const activeProvider = provider || AI_PROVIDER.toLowerCase();

  switch (activeProvider) {
    case 'openai':
      return generateWithOpenAI(systemPrompt, userPrompt);
    case 'ollama':
      return generateWithOllama(systemPrompt, userPrompt);
    case 'gemini':
      return generateWithGemini(systemPrompt, userPrompt);
    case 'hypereal':
      return generateWithHypereal(systemPrompt, userPrompt);
    case 'deepseek':
      return generateWithDeepSeek(systemPrompt, userPrompt);
    default:
      // Default to Ollama
      return generateWithOllama(systemPrompt, userPrompt);
  }
}

/**
 * Generate content brief for content planner
 * @param {Object} params - Parameters
 * @param {string} params.framework - Framework name
 * @param {string} params.frameworkTemplate - Framework template
 * @param {Object} params.context - Context object
 * @param {string} params.provider - Optional AI provider override
 */
async function generateContentBrief({ framework, frameworkTemplate, context, provider = null }) {
  // Build the user prompt with context
  const userPrompt = buildContentBriefPrompt(framework, frameworkTemplate, context);

  const systemPrompt = `You are an expert Content Planner and Copywriter specializing in ${framework} framework.

Your task is to create a comprehensive content brief based on the provided framework template and context.

IMPORTANT RULES:
1. Follow the framework structure exactly as provided
2. Replace ALL placeholders with actual content from the context
3. Make the content specific to the brand, audience, and platform
4. Use emotional hooks and persuasive language
5. Include actionable CTAs
6. Format the output clearly with headers and sections
7. Do NOT include any meta-commentary - only the actual content
8. Output should be ready to copy-paste and use directly

FRAMEWORK: ${framework}

Generate the content brief now:`;

  try {
    const content = await generateContent(systemPrompt, userPrompt, provider);
    return content;
  } catch (error) {
    console.error('Error generating content brief:', error);
    throw error;
  }
}

/**
 * Build the content brief prompt with all context
 */
function buildContentBriefPrompt(framework, frameworkTemplate, context) {
  // Replace placeholders in the template with context values
  const processedTemplate = replaceTemplatePlaceholders(frameworkTemplate, context);

  let prompt = `FRAMEWORK TEMPLATE:\n${processedTemplate}\n\n`;

  prompt += `PROJECT & TASK CONTEXT:\n`;
  prompt += `=====================\n\n`;

  // Project Info
  if (context.projectName) {
    prompt += `Project: ${context.projectName}\n`;
  }
  if (context.businessName) {
    prompt += `Brand/Business: ${context.businessName}\n`;
  }
  if (context.industry) {
    prompt += `Industry: ${context.industry}\n`;
  }

  prompt += `\nTARGET AUDIENCE:\n`;
  prompt += `----------------\n`;
  if (context.targetAudience) {
    prompt += `Target Audience: ${context.targetAudience}\n`;
  }
  if (context.avatar?.description) {
    prompt += `Avatar Description: ${context.avatar.description}\n`;
  }
  if (context.avatar?.ageRange) {
    prompt += `Age Range: ${context.avatar.ageRange}\n`;
  }
  if (context.avatar?.gender) {
    prompt += `Gender: ${context.avatar.gender}\n`;
  }

  // Pain Points
  if (context.painPoints && context.painPoints.length > 0) {
    prompt += `\nPAIN POINTS:\n`;
    prompt += `------------\n`;
    context.painPoints.forEach((point, i) => {
      prompt += `${i + 1}. ${point}\n`;
    });
  }

  // Desires
  if (context.desires && context.desires.length > 0) {
    prompt += `\nDESIRES:\n`;
    prompt += `--------\n`;
    context.desires.forEach((desire, i) => {
      prompt += `${i + 1}. ${desire}\n`;
    });
  }

  // Platform & Funnel
  prompt += `\nPLATFORM & FUNNEL:\n`;
  prompt += `------------------\n`;
  if (context.platform) {
    prompt += `Platform: ${context.platform}\n`;
  }
  if (context.funnelStage) {
    prompt += `Funnel Stage: ${context.funnelStage}\n`;
  }
  if (context.creativeType) {
    prompt += `Creative Type: ${context.creativeType}\n`;
  }

  // Strategy Elements
  prompt += `\nSTRATEGY ELEMENTS:\n`;
  prompt += `------------------\n`;
  if (context.hook) {
    prompt += `Hook: ${context.hook}\n`;
  }
  if (context.headline) {
    prompt += `Headline: ${context.headline}\n`;
  }
  if (context.cta) {
    prompt += `Call to Action: ${context.cta}\n`;
  }
  if (context.creativeAngle) {
    prompt += `Creative Angle: ${context.creativeAngle}\n`;
  }
  if (context.messaging) {
    prompt += `Messaging: ${context.messaging}\n`;
  }

  // Offer
  if (context.offer) {
    prompt += `\nOFFER:\n`;
    prompt += `-------\n`;
    prompt += `${context.offer}\n`;
  }

  // Task Specifics
  if (context.taskTitle) {
    prompt += `\nTASK:\n`;
    prompt += `------\n`;
    prompt += `Task: ${context.taskTitle}\n`;
  }
  if (context.taskType) {
    prompt += `Type: ${context.taskType}\n`;
  }

  // Approved Content (for Graphic Designers and Video Editors)
  if (context.approvedContent && context.approvedContent.trim()) {
    prompt += `\n\n*** APPROVED CONTENT (MUST USE THIS EXACT CONTENT) ***\n`;
    prompt += `======================================================\n\n`;
    prompt += `The following content has been approved by the Content Planner. You MUST incorporate this exact content into your design brief:\n\n`;
    prompt += context.approvedContent;
    prompt += `\n\n*** END APPROVED CONTENT ***\n`;
  }

  // Brand Guidelines (for UI/UX Designers and Developers)
  if (context.brandGuidelines && context.brandGuidelines.trim()) {
    prompt += `\n\n*** BRAND GUIDELINES (MUST FOLLOW) ***\n`;
    prompt += `====================================\n`;
    prompt += context.brandGuidelines;
    prompt += `\n\n*** END BRAND GUIDELINES ***\n`;
    prompt += `\nIMPORTANT: You must use these brand colors and typography in your design. Do not suggest different colors or fonts.\n`;
  }

  prompt += `\n\nGENERATE THE CONTENT BRIEF NOW using the ${framework} framework structure. Make sure all placeholders are replaced with actual content from the context above.`;

  return prompt;
}

/**
 * Check AI provider health
 */
async function checkAIHealth() {
  try {
    switch (AI_PROVIDER.toLowerCase()) {
      case 'openai':
        if (!OPENAI_API_KEY) {
          return { available: false, error: 'OpenAI API key not configured' };
        }
        // Simple test request
        const response = await fetch(`${OPENAI_BASE_URL}/models`, {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          }
        });
        if (!response.ok) {
          return { available: false, error: 'OpenAI API key is invalid' };
        }
        return {
          available: true,
          provider: 'openai',
          model: OPENAI_MODEL
        };

      case 'ollama':
        // Prepare headers - add Authorization if API key is configured
        const ollamaHeaders = {};
        if (OLLAMA_API_KEY) {
          ollamaHeaders['Authorization'] = `Bearer ${OLLAMA_API_KEY}`;
        }
        const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
          headers: ollamaHeaders
        });
        if (!ollamaResponse.ok) {
          return { available: false, error: 'Ollama not responding' };
        }
        const ollamaData = await ollamaResponse.json();
        return {
          available: true,
          provider: 'ollama',
          model: OLLAMA_MODEL,
          models: ollamaData.models?.map(m => m.name) || []
        };

      case 'gemini':
        if (!GEMINI_API_KEY) {
          return { available: false, error: 'Gemini API key not configured' };
        }
        // Test Gemini API with v1beta endpoint
        try {
          const geminiTest = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
          );
          if (!geminiTest.ok) {
            return { available: false, error: 'Gemini API key is invalid' };
          }
          return {
            available: true,
            provider: 'gemini',
            model: GEMINI_MODEL
          };
        } catch (e) {
          return { available: false, error: 'Cannot connect to Gemini API' };
        }

      case 'hypereal':
        if (!HYPEREAL_API_KEY) {
          return { available: false, error: 'Hypereal AI API key not configured' };
        }
        return {
          available: true,
          provider: 'hypereal',
          model: HYPEREAL_MODEL
        };

      case 'deepseek':
        if (!DEEPSEEK_API_KEY) {
          return { available: false, error: 'DeepSeek API key not configured' };
        }
        return {
          available: true,
          provider: 'deepseek',
          model: DEEPSEEK_MODEL
        };

      default:
        return { available: false, error: 'Unknown AI provider configured' };
    }
  } catch (error) {
    return {
      available: false,
      error: `Cannot connect to ${AI_PROVIDER}: ${error.message}`
    };
  }
}

module.exports = {
  generateContent,
  generateContentBrief,
  checkAIHealth,
  AI_PROVIDER,
  CONTENT_GENERATION_SYSTEM_PROMPT
};