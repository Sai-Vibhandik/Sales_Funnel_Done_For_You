/**
 * Image Generation Prompt Templates for Graphic Designers
 * These templates help create prompts for AI image generators (Midjourney, DALL-E, etc.)
 */

const IMAGE_PROMPT_TEMPLATES = {
  // Social Media Image - Single Post
  social_media_image: `You are an expert at creating prompts for AI image generators like Midjourney, DALL-E, and Stable Diffusion.

Create a detailed image generation prompt based on the following content and context.

BRAND & BUSINESS:
- Brand Name: {{brandName}}
- Industry: {{industry}}

APPROVED CONTENT (MUST INCORPORATE):
{{approvedContent}}

DESIGN CONTEXT:
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Creative Type: {{creativeType}}
- Target Audience: {{audience}}

DESIGN REQUIREMENTS:
- Visual Hook: {{hook}}
- Headline to Display: {{headline}}
- CTA to Include: {{cta}}

Create an image generation prompt that:
1. Visualizes the main message from the approved content
2. Matches the platform's best practices (aspect ratio, text placement, visual style)
3. Captures the emotion and tone appropriate for the funnel stage
4. Includes specific style directions (color palette, mood, composition)
5. Incorporates the headline and CTA as overlay text (if applicable)
6. Creates visual interest that stops the scroll

OUTPUT FORMAT:
Provide a complete image generation prompt that includes:
- Subject/Scene description
- Style and mood directions
- Color palette suggestions
- Composition and framing
- Text overlay specifications (headline, CTA placement)
- Platform-specific technical details (aspect ratio, dimensions)
- Negative prompt (what to avoid)

Generate the image prompt now:`,

  // Carousel/Slider Image
  carousel_image: `You are an expert at creating prompts for AI image generators for carousel/slider content.

Create a series of image generation prompts for a carousel post based on the following content.

BRAND & BUSINESS:
- Brand Name: {{brandName}}
- Industry: {{industry}}

APPROVED CONTENT (MUST INCORPORATE):
{{approvedContent}}

DESIGN CONTEXT:
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Target Audience: {{audience}}

CAROUSEL STRUCTURE:
- Number of Slides: Determine based on content
- Hook/Headline: {{headline}}
- CTA: {{cta}}

Create image generation prompts for each slide that:
1. Slide 1: Attention-grabbing hook that stops the scroll
2. Middle Slides: Build the story/message progressively
3. Final Slide: Strong CTA with clear next step

For each slide, provide:
- Visual description
- Style and mood
- Text overlay specifications
- How it connects to the next slide
- Aspect ratio and dimensions

Generate the carousel image prompts now:`,

  // Story/Reel Thumbnail
  story_thumbnail: `You are an expert at creating prompts for story/reel thumbnails and covers.

Create an eye-catching thumbnail/cover image prompt based on the following content.

BRAND & BUSINESS:
- Brand Name: {{brandName}}
- Industry: {{industry}}

APPROVED CONTENT (MUST INCORPORATE):
{{approvedContent}}

DESIGN CONTEXT:
- Platform: {{platform}}
- Content Type: Story/Reel
- Target Audience: {{audience}}

STORY ELEMENTS:
- Hook: {{hook}}
- Headline: {{headline}}
- CTA: {{cta}}

Create a thumbnail image prompt that:
1. Creates instant visual impact (stops the scroll in feed)
2. Communicates the story topic at a glance
3. Uses bold, readable text overlays
4. Uses attention-grabbing colors and contrast
5. Matches the story content (no clickbait)
6. Works in small size (mobile screen)

OUTPUT FORMAT:
- Subject and scene
- Style and mood
- Color recommendations (high contrast)
- Text overlay specifications (bold, readable)
- Technical specs (9:16 aspect ratio for stories)

Generate the thumbnail image prompt now:`,

  // Video Thumbnail
  video_thumbnail: `You are an expert at creating prompts for video thumbnails.

Create a compelling video thumbnail image prompt based on the following content.

BRAND & BUSINESS:
- Brand Name: {{brandName}}
- Industry: {{industry}}

APPROVED CONTENT (MUST INCORPORATE):
{{approvedContent}}

DESIGN CONTEXT:
- Platform: {{platform}}
- Video Topic: {{headline}}
- Target Audience: {{audience}}

THUMBNAIL REQUIREMENTS:
- Hook: {{hook}}
- CTA: {{cta}}

Create a video thumbnail prompt that:
1. Creates curiosity and urgency to click
2. Features a clear, compelling headline
3. Uses expressive imagery that conveys emotion
4. Includes branding elements
5. Works at small sizes
6. Follows platform best practices

OUTPUT FORMAT:
- Scene description
- Mood and style
- Text specifications
- Color recommendations
- Aspect ratio

Generate the video thumbnail image prompt now:`,

  // Ad Creative
  ad_creative: `You are an expert at creating prompts for performance ad creatives.

Create a high-converting ad creative image prompt based on the following content.

BRAND & BUSINESS:
- Brand Name: {{brandName}}
- Industry: {{industry}}

APPROVED CONTENT (MUST INCORPORATE):
{{approvedContent}}

AD CONTEXT:
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Creative Type: {{creativeType}}
- Target Audience: {{audience}}

AD ELEMENTS:
- Hook: {{hook}}
- Headline: {{headline}}
- CTA: {{cta}}
- Offer: {{offer}}

Create an ad creative prompt that:
1. Grabs attention in the first 0.5 seconds
2. Communicates the value proposition clearly
3. Creates urgency and desire
4. Includes clear CTA visual
5. Matches platform specifications
6. A/B test friendly (variations possible)

DESIGN DIRECTIONS:
- Use contrasting colors for CTA button
- Clear hierarchy: Image → Headline → CTA
- Mobile-first design
- Platform-native feel

OUTPUT FORMAT:
Provide complete image prompt with:
- Scene and subject
- Style and mood (trust-building, urgent, aspirational)
- Color palette (brand-aligned but attention-grabbing)
- Text overlay specifications
- CTA button style and placement
- Technical specs (aspect ratios for different placements)
- A/B variation suggestions

Generate the ad creative image prompt now:`,

  // Landing Page Hero
  landing_page_hero: `You are an expert at creating prompts for landing page hero images.

Create a landing page hero image prompt based on the following content.

BRAND & BUSINESS:
- Brand Name: {{brandName}}
- Industry: {{industry}}

APPROVED CONTENT (MUST INCORPORATE):
{{approvedContent}}

PAGE CONTEXT:
- Funnel Stage: {{funnelStage}}
- Target Audience: {{audience}}
- Page Goal: Conversion

HERO ELEMENTS:
- Headline: {{headline}}
- Subheadline/Hook: {{hook}}
- CTA: {{cta}}
- Value Proposition: {{offer}}

Create a hero image prompt that:
1. Immediately communicates the value proposition
2. Creates emotional connection with the target audience
3. Supports (doesn't compete with) the headline
4. Feels premium and trustworthy
5. Works across devices (desktop, tablet, mobile)

DESIGN DIRECTIONS:
- Professional, clean aesthetic
- Brand-appropriate color palette
- Human element (if applicable) for connection
- Negative space for text overlay
- High-quality, aspirational imagery

OUTPUT FORMAT:
- Scene description
- Style and mood
- Color palette
- Composition (rule of thirds, focal points)
- Text overlay areas
- Responsive considerations

Generate the landing page hero image prompt now:`,

  // Product/Feature Showcase
  product_showcase: `You are an expert at creating prompts for product/feature showcase images.

Create a product showcase image prompt based on the following content.

BRAND & BUSINESS:
- Brand Name: {{brandName}}
- Industry: {{industry}}

APPROVED CONTENT (MUST INCORPORATE):
{{approvedContent}}

SHOWCASE CONTEXT:
- Platform: {{platform}}
- Target Audience: {{audience}}

PRODUCT ELEMENTS:
- Key Benefit/Headline: {{headline}}
- Hook: {{hook}}
- CTA: {{cta}}

Create a product showcase prompt that:
1. Highlights the product/feature in an attractive way
2. Communicates the main benefit visually
3. Uses lifestyle context (product in use)
4. Creates desire and aspiration
5. Includes clear text overlays

OUTPUT FORMAT:
- Product presentation style
- Background/environment
- Lighting and mood
- Text overlay specifications
- Color grading
- Aspect ratio

Generate the product showcase image prompt now:`,

  // Generic Creative Prompt
  generic: `You are an expert at creating prompts for AI image generators like Midjourney, DALL-E, and Stable Diffusion.

Create a detailed image generation prompt based on the following content and context.

BRAND & BUSINESS:
- Brand Name: {{brandName}}
- Industry: {{industry}}

APPROVED CONTENT (MUST INCORPORATE):
{{approvedContent}}

DESIGN CONTEXT:
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Creative Type: {{creativeType}}
- Target Audience: {{audience}}

KEY ELEMENTS:
- Hook: {{hook}}
- Headline: {{headline}}
- CTA: {{cta}}

Create an image generation prompt that:
1. Visualizes the key message
2. Matches the platform and funnel stage
3. Includes specific style directions
4. Specifies text overlay requirements
5. Provides technical specifications

Generate the complete image prompt now:`
};

/**
 * Get image prompt template by type
 * @param {string} creativeType - The type of creative
 * @returns {string} - The image prompt template
 */
function getImagePromptTemplate(creativeType) {
  // Map creative types to templates
  const typeMap = {
    'image': 'social_media_image',
    'carousel': 'carousel_image',
    'story': 'story_thumbnail',
    'reel': 'story_thumbnail',
    'video': 'video_thumbnail',
    'ad_creative': 'ad_creative',
    'landing_page': 'landing_page_hero',
    'product': 'product_showcase'
  };

  const templateKey = typeMap[creativeType] || 'generic';
  return IMAGE_PROMPT_TEMPLATES[templateKey] || IMAGE_PROMPT_TEMPLATES.generic;
}

/**
 * Replace placeholders in image prompt template
 * @param {string} template - The template string
 * @param {Object} context - Context values
 * @returns {string} - Template with placeholders replaced
 */
function replaceImagePromptPlaceholders(template, context) {
  let result = template;

  const placeholders = {
    '{{brandName}}': context.brandName || '',
    '{{industry}}': context.industry || '',
    '{{approvedContent}}': context.approvedContent || '',
    '{{platform}}': context.platform || '',
    '{{funnelStage}}': context.funnelStage || '',
    '{{creativeType}}': context.creativeType || '',
    '{{audience}}': context.audience || '',
    '{{hook}}': context.hook || '',
    '{{headline}}': context.headline || '',
    '{{cta}}': context.cta || '',
    '{{offer}}': context.offer || '',
    '{{painPoints}}': Array.isArray(context.painPoints) ? context.painPoints.join(', ') : (context.painPoints || ''),
    '{{desires}}': Array.isArray(context.desires) ? context.desires.join(', ') : (context.desires || '')
  };

  for (const [placeholder, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }

  return result;
}

module.exports = {
  IMAGE_PROMPT_TEMPLATES,
  getImagePromptTemplate,
  replaceImagePromptPlaceholders
};