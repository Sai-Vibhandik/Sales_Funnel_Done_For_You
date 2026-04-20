/**
 * Marketing Framework Templates for Content Planner
 * These templates are used to generate AI-optimized prompts
 */

const FRAMEWORK_TEMPLATES = {
  // PAS - Problem-Agitate-Solution
  PAS: `You are an expert direct-response copywriter specializing in high-converting ad copy and social media content.

Create highly emotional and conversion-focused content using the PAS (Problem-Agitate-Solution) framework.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
Using the PAS framework, create compelling content that:

1. PROBLEM - Identify and articulate the core problem your audience is facing:
   - Use specific, relatable language that mirrors their inner dialogue
   - Make them feel understood ("You know that feeling when...")
   - State the problem in a way that creates instant recognition

2. AGITATE - Intensify the emotional impact:
   - Explore the consequences of leaving this problem unsolved
   - Paint a vivid picture of how this problem affects their daily life
   - Use sensory details to make the pain more real
   - Include emotional triggers: frustration, fear, embarrassment, missed opportunities

3. SOLUTION - Present your offer as the clear, obvious answer:
   - Position the solution as the natural next step
   - Show how it specifically addresses each pain point mentioned
   - Include the transformation they'll experience
   - End with a clear, compelling call-to-action

OUTPUT REQUIREMENTS:
- Match the tone and style to the platform ({{platform}})
- Use emotional hooks that stop the scroll
- Include platform-specific formatting
- Create a sense of urgency without being pushy
- End with a clear CTA that feels natural, not forced

Generate the complete content now:`,

  // AIDA - Attention-Interest-Desire-Action
  AIDA: `You are an expert marketing copywriter trained in the AIDA framework.

Create compelling content that guides prospects through the buying journey using AIDA.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}
- Hook: {{hook}}
- Headline: {{headline}}
- CTA: {{cta}}

TASK:
Using the AIDA framework, create content that:

1. ATTENTION - Grab immediate attention:
   - Use a powerful hook or headline that stops the scroll
   - Create curiosity or shock value
   - Use pattern interrupts specific to the platform
   - Make the first 3 seconds impossible to ignore

2. INTEREST - Build genuine interest:
   - Present fascinating facts or insights
   - Tell a compelling story or share a revelation
   - Connect the hook to their personal situation
   - Use data or stories that resonate with their worldview

3. DESIRE - Create strong desire for your solution:
   - Show the transformation and benefits
   - Use social proof and testimonials concepts
   - Paint the "after" picture vividly
   - Make them feel what success would be like

4. ACTION - Drive clear action:
   - Provide a single, clear call-to-action
   - Create urgency without pressure
   - Make the next step feel easy and natural
   - Remove friction from the action

OUTPUT REQUIREMENTS:
- Platform-optimized format ({{platform}})
- Mobile-first formatting
- Emotional depth appropriate for {{funnelStage}}
- Clear CTA: {{cta}}

Generate the complete content now:`,

  // BAB - Before-After-Bridge
  BAB: `You are an expert copywriter specializing in transformation stories using the BAB framework.

Create compelling content that shows the journey from current pain to desired outcome.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
Using the BAB framework, create content that:

1. BEFORE - Paint the "current reality" picture:
   - Describe their current struggle in vivid detail
   - Use sensory language (what they see, feel, hear)
   - Include specific, relatable scenarios
   - Make them say "That's exactly how I feel"
   - Include the frustration, wasted time, missed opportunities

2. AFTER - Show the "desired future" state:
   - Paint a vivid picture of life after the transformation
   - Include specific, tangible benefits
   - Show emotional and practical changes
   - Make them feel the relief and success
   - Include how others perceive them differently

3. BRIDGE - Present your solution as the path:
   - Show how your offer connects before to after
   - Explain the mechanism that makes transformation possible
   - Make it feel achievable and logical
   - Include proof elements (case studies, results)
   - End with a clear invitation to cross the bridge

OUTPUT REQUIREMENTS:
- Emotional storytelling that creates connection
- Platform-optimized formatting
- Strong visual language
- Natural transition from problem to solution
- Clear CTA

Generate the complete content now:`,

  // 4C - Clear-Concise-Compelling-Credible
  '4C': `You are an expert copywriter trained in the 4C framework for clear, persuasive communication.

Create content that is Clear, Concise, Compelling, and Credible.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
Using the 4C framework, create content that:

1. CLEAR - Make it instantly understandable:
   - Use simple, everyday language
   - Avoid jargon unless it's industry-standard
   - One idea per sentence
   - Logical flow that's easy to follow
   - Crystal clear value proposition

2. CONCISE - Respect their time:
   - Every word must earn its place
   - Remove filler words and fluff
   - Use short paragraphs and sentences
   - Get to the point quickly
   - Optimize for scanning/skimming

3. COMPELLING - Create irresistible pull:
   - Use power words that trigger emotion
   - Include specific benefits (not features)
   - Create urgency through scarcity or time
   - Use active voice and strong verbs
   - Include hooks that maintain interest

4. CREDIBLE - Build trust and belief:
   - Include specific numbers and data
   - Reference expertise or authority
   - Use social proof concepts
   - Be honest about limitations
   - Show, don't just tell

OUTPUT REQUIREMENTS:
- Scannable format with bullet points
- Platform-optimized for {{platform}}
- Trust-building elements
- Strong but believable claims
- Clear value proposition

Generate the complete content now:`,

  // STORY - Storytelling Framework
  STORY: `You are an expert storyteller and marketing copywriter.

Create compelling narrative content using the HRESTA storytelling framework.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
Using the storytelling framework, create content with:

1. HOOK - Open with an attention-grabbing moment:
   - Start in the middle of the action
   - Use curiosity or controversy
   - Create immediate emotional investment
   - Make them need to know what happens next

2. RELATE - Connect to the audience:
   - Introduce a relatable protagonist
   - Share their struggle (mirror the audience's pain)
   - Make the character feel real and authentic
   - Use "you" language to bring them into the story

3. EDUCATE - Share the transformation:
   - Show the discovery or turning point
   - Explain the mechanism of change
   - Include struggles and setbacks (authenticity)
   - Reveal the solution naturally

4. STIMULATE - Build desire:
   - Show the positive outcome
   - Include emotional and practical benefits
   - Use sensory details
   - Make them feel the transformation

5. TRANSITION - Natural call to action:
   - Connect the story to their situation
   - Present the offer as the path
   - Make the next step clear and easy
   - Add urgency or scarcity naturally

6. ACTION - Clear CTA:
   - Tell them exactly what to do
   - Remove friction from the action
   - Create a sense of immediacy
   - Make it feel like the natural next step

STORY ELEMENTS TO INCLUDE:
- A relatable character (could be you, a customer, or "someone like you")
- A conflict or challenge
- A turning point or discovery
- A resolution that includes your offer
- A clear takeaway or lesson

Generate the complete story-based content now:`,

  // DIRECT_RESPONSE - Direct Response Framework
  DIRECT_RESPONSE: `You are a direct-response copywriting expert focused on conversions.

Create high-converting direct response content.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}
- Headline: {{headline}}
- CTA: {{cta}}

TASK:
Create direct response content with these elements:

1. KILLER HEADLINE:
   - Benefit-driven or curiosity-inducing
   - Specific numbers when possible
   - Speaks directly to the target audience
   - Creates immediate interest

2. SUBHEADLINE/HOOK:
   - Expands on the headline promise
   - Creates more curiosity
   - Hooks them into reading more

3. PROBLEM IDENTIFICATION:
   - Call out the specific problem
   - Make it feel personal
   - Show you understand their struggle
   - Use "you" language throughout

4. SOLUTION PREVIEW:
   - Introduce your solution
   - Explain why it's different
   - Show the mechanism
   - Connect to their desired outcome

5. BENEFITS STACK:
   - List specific benefits
   - Use bullet points for scanning
   - Include emotional and practical benefits
   - Make each benefit clear and valuable

6. PROOF ELEMENTS:
   - Testimonials concepts
   - Case study hints
   - Statistics and numbers
   - Authority positioning

7. OFFER PRESENTATION:
   - Clear value proposition
   - What they get specifically
   - Risk reversal (guarantee)
   - Price anchoring if applicable

8. URGENCY/SCARCITY:
   - Limited time or quantity
   - Reason for urgency
   - What happens if they wait
   - FOMO triggers

9. CALL TO ACTION:
   - Clear, specific instruction
   - Single focused action
   - Low friction
   - Strong verb to start

OUTPUT REQUIREMENTS:
- {{platform}} optimized format
- Mobile-friendly structure
- Scan-friendly formatting
- Strong CTA: {{cta}}
- Direct and persuasive language

Generate the complete direct response content now:`,

  // HOOKS - Hook Generator Framework
  HOOKS: `You are an expert at creating scroll-stopping hooks for social media content.

Create multiple hook variations optimized for different platforms.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
Generate 5-10 powerful hooks using these HOOK FORMULAS:

1. CURIOSITY HOOKS:
   - "The one thing nobody tells you about..."
   - "Why [common belief] is actually wrong"
   - "The secret that [industry] doesn't want you to know"

2. PROBLEM HOOKS:
   - "Are you tired of [pain point]?"
   - "Stop doing [mistake] immediately"
   - "The #1 mistake [audience] make"

3. TRANSFORMATION HOOKS:
   - "From [before state] to [after state]"
   - "How I went from X to Y in [time]"
   - "The exact steps to [desired outcome]"

4. NUMBER HOOKS:
   - "[Number] ways to [achieve goal]"
   - "[Number] mistakes [audience] make"
   - "[Number] secrets to [desired outcome]"

5. STORY HOOKS:
   - "Last year I was [before state]..."
   - "I never thought I'd [transformation]..."
   - "When [event], I discovered..."

6. CONTRARIAN HOOKS:
   - "Unpopular opinion: [contrary belief]"
   - "Why everything you know about X is wrong"
   - "[Common advice] is actually hurting you"

7. RESULT HOOKS:
   - "How to [achieve result] without [pain]"
   - "Get [result] in [timeframe]"
   - "The fastest way to [outcome]"

8. QUESTION HOOKS:
   - "What if [desirable outcome]?"
   - "Have you ever wondered [question]?"
   - "Why do [audience] always [mistake]?"

OUTPUT REQUIREMENTS:
- Platform-specific formatting
- First 3 seconds optimized
- Emotional impact in first line
- Curiosity gap where appropriate
- Number each hook
- Brief explanation of why each works

Generate the hooks now:`,

  // OBJECTION - Objection Handling Framework
  OBJECTION: `You are an expert at handling objections and closing sales through content.

Create content that preemptively handles objections and builds trust.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
Using the objection handling framework, create content that:

1. ACKNOWLEDGE THE OBJECTION:
   - Validate their concern directly
   - Show you understand why they feel this way
   - Don't dismiss or minimize their worry
   - Use phrases like "I get why you might think..."
   - Make them feel heard and respected

2. ISOLATE THE OBJECTION:
   - Ask if this is their only concern
   - Confirm this specific objection
   - Address one objection at a time
   - Keep it conversational, not confrontational

3. REFRAME THE PERSPECTIVE:
   - Present a new way of looking at it
   - Use analogies and metaphors
   - Share relevant stories or examples
   - Introduce new information
   - Challenge the underlying assumption

4. PROVIDE EVIDENCE:
   - Share specific results or data
   - Include testimonial concepts
   - Reference case studies
   - Use industry statistics
   - Show proof that it works

5. OVERCOME WITH CLARITY:
   - Directly address the concern
   - Provide specific solutions
   - Remove risk where possible
   - Give clear next steps
   - Reinforce the benefits

COMMON OBJECTIONS TO HANDLE:
- "It's too expensive"
- "I don't have time"
- "I've tried something similar before"
- "I need to think about it"
- "I'm not sure it will work for me"
- "I'll do it later"

OUTPUT REQUIREMENTS:
- Empathetic, not defensive tone
- Specific, not vague answers
- Include 3-5 common objections
- Clear proof elements
- Natural flow between objections
- Strong CTA at the end

Generate the objection-handling content now:`,

  // PASTOR - Problem-Amplify-Story-Testimony-Offer-Response
  PASTOR: `You are an expert copywriter trained in the PASTOR framework for high-conversion content.

Create deep, persuasive content using PASTOR.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
Using the PASTOR framework, create content that:

1. PROBLEM - State the problem clearly:
   - Identify the specific problem they're facing
   - Make it feel personal and urgent
   - Use language that mirrors their thoughts
   - Show you deeply understand their situation
   - Include the emotional weight of the problem

2. AMPLIFY - Magnify the consequences:
   - Explore what happens if they don't solve it
   - Show the long-term impact
   - Include emotional and practical consequences
   - Make the cost of inaction clear
   - Use specific, relatable scenarios

3. STORY - Share a transformation narrative:
   - Tell a relatable story of transformation
   - Include the protagonist's struggle
   - Show the discovery moment
   - Demonstrate the solution in action
   - Create emotional connection

4. TESTIMONY - Provide social proof:
   - Include testimonial concepts
   - Share specific results
   - Use numbers and specifics
   - Show diverse success stories
   - Build credibility and trust

5. OFFER - Present your solution:
   - Clear, specific offer details
   - Stack the value
   - Include bonuses if applicable
   - Make the offer irresistible
   - Show exactly what they get

6. RESPONSE - Call for action:
   - Clear CTA with urgency
   - Explain what happens next
   - Remove friction
   - Add guarantee or risk reversal
   - Create immediate action motivation

OUTPUT REQUIREMENTS:
- Deep emotional connection
- Platform-optimized format
- Strong proof elements
- Clear, compelling offer
- Natural CTA progression

Generate the complete PASTOR content now:`,

  // QUEST - Qualify-Understand-Educate-Stimulate-Transition
  QUEST: `You are an expert copywriter using the QUEST framework for nurturing content.

Create relationship-building content using QUEST.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
Using the QUEST framework, create content that:

1. QUALIFY - Identify the right audience:
   - Call out specific audience characteristics
   - Use qualifying questions
   - Make it clear who this is for
   - Create "that's me" recognition
   - Separate ideal customers from others

2. UNDERSTAND - Show deep empathy:
   - Demonstrate understanding of their situation
   - Mirror their frustrations and desires
   - Share insights that show you "get it"
   - Validate their feelings and concerns
   - Build trust through understanding

3. EDUCATE - Provide valuable information:
   - Teach something useful and actionable
   - Share insights or frameworks
   - Provide value before asking
   - Position yourself as expert
   - Give them "aha" moments

4. STIMULATE - Create desire for more:
   - Show what's possible
   - Paint the transformation picture
   - Create aspiration
   - Hint at your solution
   - Make them want to learn more

5. TRANSITION - Move to next step:
   - Natural transition to offer
   - Soft or hard CTA based on funnel stage
   - Clear next action
   - Remove friction
   - Create appropriate urgency

OUTPUT REQUIREMENTS:
- Relationship-building tone
- Educational, not just promotional
- Platform-appropriate length
- Value-first approach
- Natural CTA progression

Generate the complete QUEST content now:`,

  // ACCA - Awareness-Comparison-Consideration-Action
  ACCA: `You are an expert copywriter using the ACCA framework for consideration-stage content.

Create content that guides prospects through evaluation using ACCA.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
Using the ACCA framework, create content that:

1. AWARENESS - Create problem awareness:
   - Help them realize the full scope of their problem
   - Show what they might be missing
   - Highlight consequences they haven't considered
   - Make the invisible visible
   - Create urgency through awareness

2. COMPARISON - Show alternatives:
   - Present different approaches to solving the problem
   - Compare DIY vs. professional solutions
   - Show pros and cons honestly
   - Position your approach as superior
   - Help them make informed decisions

3. CONSIDERATION - Present your solution:
   - Show how your offer fits their needs
   - Address specific concerns
   - Provide detailed benefits
   - Include proof elements
   - Overcome common objections

4. ACTION - Drive clear next step:
   - Single, focused CTA
   - Low-friction action
   - Clear expectation of what happens next
   - Appropriate urgency
   - Easy to take action

OUTPUT REQUIREMENTS:
- Balanced, not pushy tone
- Educational approach
- Thorough but scannable
- Trust-building throughout
- Clear CTA at the end

Generate the complete ACCA content now:`,

  // FAB - Features-Advantages-Benefits
  FAB: `You are an expert at translating features into compelling benefits using the FAB framework.

Create content that transforms technical details into emotional benefits.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
Using the FAB framework, create content that:

1. FEATURES - Present what it is:
   - List specific, concrete features
   - Be precise and factual
   - Include relevant technical details
   - Show what's included
   - Be specific about deliverables

2. ADVANTAGES - Explain what it does:
   - Translate each feature into advantage
   - Show how it solves problems
   - Explain the mechanism
   - Compare to alternatives
   - Highlight unique aspects

3. BENEFITS - Show what it means for them:
   - Transform advantages into emotional benefits
   - Connect to their deepest desires
   - Show life transformation
   - Include both tangible and intangible benefits
   - Make it personal and specific

FAB EXAMPLE STRUCTURE:
Feature: "24/7 customer support"
Advantage: "You can get help whenever you need it"
Benefit: "Never feel stuck or frustrated - help is always just a message away"

OUTPUT REQUIREMENTS:
- Clear feature-advantage-benefit progression
- Emotional depth in benefits
- Platform-optimized format
- Scannable structure
- Strong CTA at the end

Generate the complete FAB content now:`,

  // 5A - Aware-Appeal-Ask-Act-Assess
  '5A': `You are an expert copywriter using the 5A framework for engagement-focused content.

Create content that guides through the engagement journey using 5A.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
Using the 5A framework, create content that:

1. AWARE - Create awareness:
   - Grab attention with compelling hook
   - Make them aware of the opportunity
   - Introduce new perspective
   - Create curiosity about possibilities
   - Stop the scroll effectively

2. APPEAL - Build appeal:
   - Show why this matters to them
   - Connect to their desires
   - Create emotional resonance
   - Demonstrate value
   - Make it personally relevant

3. ASK - Make the request:
   - Clear, specific ask
   - Explain what you want them to do
   - Show why this action matters
   - Make it feel natural
   - Connect action to benefit

4. ACT - Enable the action:
   - Remove all friction
   - Show exactly how to take action
   - Make it as easy as possible
   - Provide clear instructions
   - Eliminate confusion

5. ASSESS - Follow up:
   - Set expectations for what's next
   - Preview the transformation
   - Create anticipation
   - Open loop for continued engagement
   - Thank and appreciate

OUTPUT REQUIREMENTS:
- Engagement-focused approach
- Platform-native format
- Clear action steps
- Easy to implement
- Relationship-building tone

Generate the complete 5A content now:`,

  // SLAP - Stop-Look-Act-Purchase
  SLAP: `You are an expert at creating high-impact, quick-conversion content using the SLAP framework.

Create content that stops the scroll and drives immediate action.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
Using the SLAP framework, create content that:

1. STOP - Stop them in their tracks:
   - Pattern-interrupt opening
   - Bold statement or question
   - Visual or verbal hook
   - Something unexpected
   - Immediate attention-grabber

2. LOOK - Make them look closer:
   - Compelling preview of value
   - Create curiosity gap
   - Show relevance to them
   - Build intrigue
   - Make them want to see more

3. ACT - Drive immediate action:
   - Clear, single action to take
   - Low commitment ask
   - High value for low effort
   - Remove all friction
   - Make it feel urgent but not pushy

4. PURCHASE - Present the offer:
   - Clear value proposition
   - Stack the value
   - Show the transformation
   - Include risk reversal
   - Create urgency to buy now

SLAP ELEMENTS:
- Maximum impact, minimum length
- Every word must earn its place
- No fluff or filler
- Focused on one outcome
- High conversion focus

OUTPUT REQUIREMENTS:
- Short, punchy content
- Platform-optimized for {{platform}}
- Maximum impact
- Clear CTA: {{cta}}
- Mobile-first formatting

Generate the complete SLAP content now:`,

  // HOOK_STORY_OFFER - Hook-Story-Offer Framework
  HOOK_STORY_OFFER: `You are an expert at the Hook-Story-Offer framework, the most powerful social media content formula.

Create engaging content using the Hook-Story-Offer structure.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
Using the Hook-Story-Offer framework, create content with:

HOOK (3-5 seconds):
- Stop the scroll immediately
- Create curiosity or shock
- Make a bold statement
- Ask a provocative question
- State a surprising fact
- Use pattern interrupt
- Create "I need to see this" feeling

STORY (15-30 seconds):
- Transition smoothly from hook
- Share relatable transformation
- Include specific details
- Show the problem → journey → solution
- Include emotional beats
- Keep it engaging throughout
- Use "I" or "You" perspective
- Make it feel authentic

OFFER (5-10 seconds):
- Natural transition from story
- Clear, specific offer
- Show the transformation
- Include CTA
- Create urgency
- Make it feel like an opportunity
- Remove friction

STRUCTURE EXAMPLE:
Hook: "I went from [before] to [after] in just [timeframe]"
Story: "Here's exactly how I did it..." (share the journey)
Offer: "Want to do the same? [CTA]"

OUTPUT REQUIREMENTS:
- Platform-optimized for {{platform}}
- Natural, conversational tone
- Specific and believable
- Emotional connection
- Clear CTA: {{cta}}

Generate the complete Hook-Story-Offer content now:`,

  // 4P - Picture-Promise-Prove-Push
  '4P': `You are an expert copywriter using the 4P framework for persuasive content.

Create compelling content using Picture-Promise-Prove-Push.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}
- CTA: {{cta}}

TASK:
Using the 4P framework, create content that:

1. PICTURE - Paint the vision:
   - Create vivid mental image
   - Show the transformation
   - Include sensory details
   - Make them feel the outcome
   - Use "imagine if..." language
   - Contrast before/after states

2. PROMISE - Make a clear commitment:
   - State what you'll deliver
   - Be specific about outcomes
   - Include timeframe if applicable
   - Make it believable
   - Connect to their desires
   - Show what's possible

3. PROVE - Provide evidence:
   - Share specific results
   - Include testimonial concepts
   - Use statistics and data
   - Show case studies
   - Demonstrate expertise
   - Build trust and credibility

4. PUSH - Drive action:
   - Clear call-to-action
   - Create urgency
   - Show what happens if they act now
   - Remove risk with guarantee
   - Make it easy to take action
   - Single, focused next step

OUTPUT REQUIREMENTS:
- Platform-optimized for {{platform}}
- Visual, descriptive language
- Strong proof elements
- Compelling CTA: {{cta}}
- Persuasive but ethical

Generate the complete 4P content now:`,

  // UI_DESIGN - UI/UX Design Brief Framework
  UI_DESIGN: `You are an expert UI/UX designer assistant specializing in creating comprehensive design briefs.

Generate a detailed design brief for landing pages and UI components based on the provided context.

INPUT DATA:
- Project: {{projectName}}
- Business: {{businessName}}
- Industry: {{industry}}
- Task: {{taskTitle}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Target Audience: {{targetAudience}}
- Offer: {{offer}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Hook: {{hook}}
- Headline: {{headline}}
- CTA: {{cta}}

TASK:
Create a comprehensive UI/UX design brief that covers:

1. DESIGN OBJECTIVES
   - Primary conversion goal
   - Secondary objectives
   - Key performance indicators
   - Success metrics

2. TARGET USER CONSIDERATIONS
   - User demographics and psychographics
   - User goals and expectations
   - User journey considerations
   - Accessibility requirements

3. VISUAL STYLE GUIDELINES
   - Color palette recommendations (primary, secondary, accent)
   - Typography hierarchy
   - Imagery style and direction
   - Brand consistency elements
   - Visual tone (professional, playful, modern, etc.)

4. LAYOUT RECOMMENDATIONS
   - Above-the-fold priorities
   - Section hierarchy
   - Content placement strategy
   - White space usage
   - Grid and alignment

5. USER EXPERIENCE FLOW
   - Navigation structure
   - Interaction patterns
   - Micro-animations and transitions
   - Loading states
   - Error handling UX

6. RESPONSIVE CONSIDERATIONS
   - Mobile-first approach
   - Tablet adaptations
   - Desktop optimization
   - Breakpoint recommendations

7. ACCESSIBILITY REQUIREMENTS
   - WCAG compliance level
   - Color contrast considerations
   - Screen reader compatibility
   - Keyboard navigation

8. TECHNICAL CONSTRAINTS
   - Performance optimization
   - Browser compatibility
   - Image format recommendations
   - Animation performance

OUTPUT REQUIREMENTS:
- Clear, actionable design direction
- Specific color codes and font suggestions
- Layout wireframe description
- Component specifications
- Interaction guidelines
- Accessibility checklist

Generate the complete design brief now:`,

  // MASTER - Multi-Framework Master Prompt
  MASTER: `You are a master copywriter with expertise in all major marketing frameworks.

Analyze the input and create content using the most effective combination of frameworks.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}
- Hook: {{hook}}
- Headline: {{headline}}
- CTA: {{cta}}

TASK:
Analyze the input and create content by strategically combining:

1. FRAMEWORK SELECTION:
   - Based on funnel stage, choose primary framework:
     * Awareness → HOOK_STORY_OFFER or STORY
     * Consideration → FAB or ACCA or QUEST
     * Conversion → PAS or AIDA or 4P

2. CONTENT STRUCTURE:
   - Open with strongest hook for platform
   - Build emotional connection
   - Provide proof and credibility
   - Present clear offer
   - Drive to action

3. OPTIMIZATION:
   - Match tone to platform
   - Optimize length for platform
   - Include platform-specific elements
   - Use appropriate formatting
   - Mobile-first design

4. FRAMEWORK COMBINATION:
   - Use PAS for problem-solution flow
   - Add FAB for feature-benefit clarity
   - Include HOOK_STORY_OFFER structure
   - Apply 4C principles throughout
   - End with strong CTA using SLAP

OUTPUT REQUIREMENTS:
- Best-practice framework combination
- Platform-optimized format
- Strong emotional connection
- Clear value proposition
- Compelling CTA
- All critical elements included

Analyze the inputs and generate the most effective content using the optimal framework combination:`,

  // LANDING_PAGE_DEV - Landing Page Development Framework
  LANDING_PAGE_DEV: `You are an expert Full-Stack Developer specializing in building high-converting landing pages.

Generate a comprehensive development brief for implementing a landing page based on the provided design and context.

INPUT DATA:
- Project: {{projectName}}
- Business: {{businessName}}
- Industry: {{industry}}
- Task: {{taskTitle}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Target Audience: {{targetAudience}}
- Offer: {{offer}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Hook: {{hook}}
- Headline: {{headline}}
- CTA: {{cta}}

DESIGN REFERENCE:
The UI/UX designer has provided a design file. Your task is to implement it with the following considerations.

TASK:
Create a comprehensive development brief that covers:

1. TECHNOLOGY STACK RECOMMENDATIONS
   - Frontend framework (React, Next.js, Vue, etc.)
   - CSS approach (Tailwind, CSS Modules, Styled Components)
   - Build tools and bundlers
   - Form handling libraries
   - Animation libraries (if needed)

2. PROJECT STRUCTURE
   - File organization
   - Component breakdown
   - Asset management
   - Environment configuration

3. LANDING PAGE SECTIONS IMPLEMENTATION
   - Hero section (headline, subheadline, CTA)
   - Features/Benefits section
   - Social proof section (testimonials, logos)
   - FAQ section (if applicable)
   - Final CTA section
   - Footer

4. RESPONSIVE DESIGN IMPLEMENTATION
   - Mobile-first approach
   - Breakpoint strategy
   - Touch-friendly interactions
   - Mobile navigation

5. PERFORMANCE OPTIMIZATION
   - Image optimization strategy
   - Lazy loading implementation
   - Code splitting recommendations
   - Core Web Vitals considerations
   - Caching strategy

6. SEO IMPLEMENTATION
   - Meta tags (title, description, Open Graph)
   - Schema markup (JSON-LD)
   - Semantic HTML structure
   - Canonical URLs

7. CONVERSION OPTIMIZATION FEATURES
   - CTA button styling and placement
   - Form validation and submission handling
   - Thank you page / success state
   - Error handling UX
   - Loading states

8. INTEGRATION REQUIREMENTS
   - Analytics setup (Google Analytics, Facebook Pixel)
   - CRM integration (form submissions)
   - Email marketing integration
   - A/B testing capability

9. ACCESSIBILITY (WCAG 2.1)
   - Keyboard navigation
   - Screen reader compatibility
   - Color contrast verification
   - ARIA labels

10. TESTING CHECKLIST
    - Cross-browser testing
    - Mobile device testing
    - Form submission testing
    - Performance testing
    - Accessibility audit

OUTPUT REQUIREMENTS:
- Clear, actionable implementation steps
- Code snippets for critical components
- File structure recommendations
- Dependency list
- Estimated implementation timeline
- Testing strategy

Generate the complete development brief now:`
};

/**
 * Get framework template by type
 * @param {string} frameworkType - The framework type
 * @returns {string} - The framework template
 */
function getFrameworkTemplate(frameworkType) {
  return FRAMEWORK_TEMPLATES[frameworkType] || '';
}

/**
 * Get all framework types
 * @returns {Array} - Array of framework types with labels
 */
function getFrameworkTypes() {
  return [
    { value: 'PAS', label: 'PAS - Problem-Agitate-Solution' },
    { value: 'AIDA', label: 'AIDA - Attention-Interest-Desire-Action' },
    { value: 'BAB', label: 'BAB - Before-After-Bridge' },
    { value: '4C', label: '4C - Clear-Concise-Compelling-Credible' },
    { value: 'STORY', label: 'STORY - Storytelling Framework' },
    { value: 'DIRECT_RESPONSE', label: 'Direct Response' },
    { value: 'HOOKS', label: 'Hook Generator' },
    { value: 'OBJECTION', label: 'Objection Handling' },
    { value: 'PASTOR', label: 'PASTOR - Problem-Amplify-Story-Testimony-Offer-Response' },
    { value: 'QUEST', label: 'QUEST - Qualify-Understand-Educate-Stimulate-Transition' },
    { value: 'ACCA', label: 'ACCA - Awareness-Comparison-Consideration-Action' },
    { value: 'FAB', label: 'FAB - Features-Advantages-Benefits' },
    { value: '5A', label: '5A - Aware-Appeal-Ask-Act-Assess' },
    { value: 'SLAP', label: 'SLAP - Stop-Look-Act-Purchase' },
    { value: 'HOOK_STORY_OFFER', label: 'Hook-Story-Offer' },
    { value: '4P', label: '4P - Picture-Promise-Prove-Push' },
    { value: 'UI_DESIGN', label: 'UI/UX Design Brief' },
    { value: 'LANDING_PAGE_DEV', label: 'Landing Page Development Brief' },
    { value: 'MASTER', label: 'MASTER - Multi-Framework (Recommended)' }
  ];
}

/**
 * Replace placeholders in framework template with context values
 * @param {string} template - The framework template
 * @param {Object} context - The context values
 * @returns {string} - Template with placeholders replaced
 */
function replaceTemplatePlaceholders(template, context) {
  let result = template;

  const placeholders = {
    '{{problem}}': context.problem || '',
    '{{audience}}': context.audience || '',
    '{{platform}}': context.platform || '',
    '{{funnelStage}}': context.funnelStage || '',
    '{{brandName}}': context.brandName || '',
    '{{industry}}': context.industry || '',
    '{{painPoints}}': Array.isArray(context.painPoints) ? context.painPoints.join(', ') : (context.painPoints || ''),
    '{{desires}}': Array.isArray(context.desires) ? context.desires.join(', ') : (context.desires || ''),
    '{{offer}}': context.offer || '',
    '{{hook}}': context.hook || '',
    '{{headline}}': context.headline || '',
    '{{cta}}': context.cta || '',
    '{{projectName}}': context.projectName || '',
    '{{businessName}}': context.businessName || '',
    '{{taskTitle}}': context.taskTitle || '',
    '{{targetAudience}}': context.targetAudience || ''
  };

  for (const [placeholder, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }

  return result;
}

module.exports = {
  FRAMEWORK_TEMPLATES,
  getFrameworkTemplate,
  getFrameworkTypes,
  replaceTemplatePlaceholders
};