/**
 * Seed script for Framework Categories
 *
 * This script populates the database with default subcategories
 * for the prompt management system.
 *
 * System categories (isSystem: true) cannot be deleted by admins.
 * Custom categories (isSystem: false) can be managed by admins.
 *
 * Run with: node server/src/scripts/seedFrameworkCategories.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const FrameworkCategory = require('../models/FrameworkCategory');
const User = require('../models/User');

// Default subcategories for each framework
// These are system defaults that cannot be deleted
const defaultCategories = [
  // ============================================
  // PAS FRAMEWORK - Problem-Agitate-Solution
  // ============================================
  { frameworkType: 'PAS', key: 'problem_hook_ads', displayName: 'Problem Hook Ads', description: 'Ads focused on problem identification and hooks', isSystem: true },
  { frameworkType: 'PAS', key: 'pain_point_ads', displayName: 'Pain Point Ads', description: 'Deep pain-focused emotional ads', isSystem: true },
  { frameworkType: 'PAS', key: 'fear_based_ads', displayName: 'Fear Based Ads', description: 'Fear and urgency driven content', isSystem: true },
  { frameworkType: 'PAS', key: 'retargeting_ads', displayName: 'Retargeting Ads', description: 'Re-engagement ads for warm audiences', isSystem: true },
  { frameworkType: 'PAS', key: 'emotional_story_ads', displayName: 'Emotional Story Ads', description: 'Story-driven emotional content', isSystem: true },
  { frameworkType: 'PAS', key: 'solution_pitch', displayName: 'Solution Pitch', description: 'Direct solution presentation copy', isSystem: true },

  // ============================================
  // AIDA FRAMEWORK - Attention-Interest-Desire-Action
  // ============================================
  { frameworkType: 'AIDA', key: 'product_ads', displayName: 'Product Ads', description: 'Product-focused ad copy', isSystem: true },
  { frameworkType: 'AIDA', key: 'lead_gen_ads', displayName: 'Lead Gen Ads', description: 'Lead generation focused copy', isSystem: true },
  { frameworkType: 'AIDA', key: 'landing_page_copy', displayName: 'Landing Page Copy', description: 'High-converting landing pages', isSystem: true },
  { frameworkType: 'AIDA', key: 'email_funnels', displayName: 'Email Funnels', description: 'Email sequence copy', isSystem: true },
  { frameworkType: 'AIDA', key: 'video_script', displayName: 'Video Script', description: 'Video ad scripts', isSystem: true },
  { frameworkType: 'AIDA', key: 'story_ads', displayName: 'Story Ads', description: 'Story-based ad copy', isSystem: true },

  // ============================================
  // BAB FRAMEWORK - Before-After-Bridge
  // ============================================
  { frameworkType: 'BAB', key: 'transformation_story', displayName: 'Transformation Story', description: 'Before-after transformation narratives', isSystem: true },
  { frameworkType: 'BAB', key: 'testimonial_ads', displayName: 'Testimonial Ads', description: 'Customer testimonial focused content', isSystem: true },
  { frameworkType: 'BAB', key: 'case_study_ads', displayName: 'Case Study Ads', description: 'Case study and proof-based content', isSystem: true },
  { frameworkType: 'BAB', key: 'carousel_ads', displayName: 'Carousel Ads', description: 'Multi-slide carousel content', isSystem: true },
  { frameworkType: 'BAB', key: 'social_proof_ads', displayName: 'Social Proof Ads', description: 'Proof and credibility focused', isSystem: true },

  // ============================================
  // 4C FRAMEWORK - Clear-Concise-Compelling-Credible
  // ============================================
  { frameworkType: '4C', key: 'product_description', displayName: 'Product Description', description: 'Clear product descriptions', isSystem: true },
  { frameworkType: '4C', key: 'ad_headlines', displayName: 'Ad Headlines', description: 'Concise compelling headlines', isSystem: true },
  { frameworkType: '4C', key: 'value_proposition', displayName: 'Value Proposition', description: 'Clear value statements', isSystem: true },
  { frameworkType: '4C', key: 'trust_building_copy', displayName: 'Trust Building Copy', description: 'Credibility-focused content', isSystem: true },

  // ============================================
  // STORY FRAMEWORK
  // ============================================
  { frameworkType: 'STORY', key: 'brand_story', displayName: 'Brand Story', description: 'Brand narrative and origin stories', isSystem: true },
  { frameworkType: 'STORY', key: 'customer_journey', displayName: 'Customer Journey', description: 'Customer transformation stories', isSystem: true },
  { frameworkType: 'STORY', key: 'behind_the_scenes', displayName: 'Behind the Scenes', description: 'Authentic BTS content', isSystem: true },
  { frameworkType: 'STORY', key: 'origin_story', displayName: 'Origin Story', description: 'How it started narratives', isSystem: true },

  // ============================================
  // HOOKS FRAMEWORK
  // ============================================
  { frameworkType: 'HOOKS', key: 'viral_hooks', displayName: 'Viral Hooks', description: 'Scroll-stopping viral hooks', isSystem: true },
  { frameworkType: 'HOOKS', key: 'curiosity_hooks', displayName: 'Curiosity Hooks', description: 'Curiosity-driven attention grabbers', isSystem: true },
  { frameworkType: 'HOOKS', key: 'question_hooks', displayName: 'Question Hooks', description: 'Question-based engagement', isSystem: true },
  { frameworkType: 'HOOKS', key: 'number_hooks', displayName: 'Number Hooks', description: 'Listicle and number-based hooks', isSystem: true },
  { frameworkType: 'HOOKS', key: 'bold_hooks', displayName: 'Bold Hooks', description: 'Bold statement hooks', isSystem: true },
  { frameworkType: 'HOOKS', key: 'story_hooks', displayName: 'Story Hooks', description: 'Story-opening hooks', isSystem: true },
  { frameworkType: 'HOOKS', key: 'reel_hooks', displayName: 'Reel/Short Hooks', description: 'First 3-second video hooks', isSystem: true },

  // ============================================
  // OBJECTION HANDLING FRAMEWORK
  // ============================================
  { frameworkType: 'OBJECTION', key: 'price_objections', displayName: 'Price Objections', description: 'Handle cost-related concerns', isSystem: true },
  { frameworkType: 'OBJECTION', key: 'trust_objections', displayName: 'Trust Objections', description: 'Build credibility and trust', isSystem: true },
  { frameworkType: 'OBJECTION', key: 'timing_objections', displayName: 'Timing Objections', description: 'Handle "not now" concerns', isSystem: true },
  { frameworkType: 'OBJECTION', key: 'skeptic_objections', displayName: 'Skeptic Objections', description: 'Handle doubt-based objections', isSystem: true },
  { frameworkType: 'OBJECTION', key: 'faq_responses', displayName: 'FAQ Responses', description: 'Common question responses', isSystem: true },

  // ============================================
  // PASTOR FRAMEWORK
  // ============================================
  { frameworkType: 'PASTOR', key: 'long_form_sales', displayName: 'Long Form Sales', description: 'Complete sales page copy', isSystem: true },
  { frameworkType: 'PASTOR', key: 'webinar_script', displayName: 'Webinar Script', description: 'Webinar presentation scripts', isSystem: true },
  { frameworkType: 'PASTOR', key: 'sales_email', displayName: 'Sales Email', description: 'Persuasive email sequences', isSystem: true },
  { frameworkType: 'PASTOR', key: 'vsl_script', displayName: 'VSL Script', description: 'Video sales letter scripts', isSystem: true },

  // ============================================
  // QUEST FRAMEWORK
  // ============================================
  { frameworkType: 'QUEST', key: 'audience_connection', displayName: 'Audience Connection', description: 'Deep audience engagement', isSystem: true },
  { frameworkType: 'QUEST', key: 'nurture_sequence', displayName: 'Nurture Sequence', description: 'Nurturing email sequences', isSystem: true },
  { frameworkType: 'QUEST', key: 'educational_content', displayName: 'Educational Content', description: 'Value-first content', isSystem: true },

  // ============================================
  // ACCA FRAMEWORK
  // ============================================
  { frameworkType: 'ACCA', key: 'awareness_content', displayName: 'Awareness Content', description: 'Problem awareness content', isSystem: true },
  { frameworkType: 'ACCA', key: 'comparison_content', displayName: 'Comparison Content', description: 'Comparison and alternatives', isSystem: true },
  { frameworkType: 'ACCA', key: 'consideration_content', displayName: 'Consideration Content', description: 'Decision-stage content', isSystem: true },

  // ============================================
  // FAB FRAMEWORK
  // ============================================
  { frameworkType: 'FAB', key: 'product_marketing', displayName: 'Product Marketing', description: 'Feature-benefit marketing', isSystem: true },
  { frameworkType: 'FAB', key: 'feature_highlight', displayName: 'Feature Highlight', description: 'Feature-focused content', isSystem: true },
  { frameworkType: 'FAB', key: 'benefit_driven', displayName: 'Benefit Driven', description: 'Benefit-focused content', isSystem: true },
  { frameworkType: 'FAB', key: 'product_launch', displayName: 'Product Launch', description: 'Launch sequence copy', isSystem: true },

  // ============================================
  // 5A FRAMEWORK
  // ============================================
  { frameworkType: '5A', key: 'engagement_content', displayName: 'Engagement Content', description: 'High-engagement social content', isSystem: true },
  { frameworkType: '5A', key: 'community_building', displayName: 'Community Building', description: 'Community-focused content', isSystem: true },
  { frameworkType: '5A', key: 'viral_content', displayName: 'Viral Content', description: 'Shareable viral content', isSystem: true },

  // ============================================
  // SLAP FRAMEWORK
  // ============================================
  { frameworkType: 'SLAP', key: 'short_ads', displayName: 'Short Ads', description: 'Quick conversion ads', isSystem: true },
  { frameworkType: 'SLAP', key: 'scroll_stopping', displayName: 'Scroll Stopping', description: 'Pattern-interrupt content', isSystem: true },
  { frameworkType: 'SLAP', key: 'direct_offer', displayName: 'Direct Offer', description: 'Direct response offers', isSystem: true },

  // ============================================
  // HOOK_STORY_OFFER FRAMEWORK
  // ============================================
  { frameworkType: 'HOOK_STORY_OFFER', key: 'viral_story_ads', displayName: 'Viral Story Ads', description: 'Viral story-based ads', isSystem: true },
  { frameworkType: 'HOOK_STORY_OFFER', key: 'social_content', displayName: 'Social Content', description: 'Social media content', isSystem: true },
  { frameworkType: 'HOOK_STORY_OFFER', key: 'short_video_ads', displayName: 'Short Video Ads', description: 'Reels and TikTok ads', isSystem: true },

  // ============================================
  // 4P FRAMEWORK
  // ============================================
  { frameworkType: '4P', key: 'trust_conversion', displayName: 'Trust Conversion', description: 'Trust-based conversion copy', isSystem: true },
  { frameworkType: '4P', key: 'proof_ads', displayName: 'Proof Ads', description: 'Proof-focused content', isSystem: true },
  { frameworkType: '4P', key: 'promise_content', displayName: 'Promise Content', description: 'Promise and guarantee copy', isSystem: true },

  // ============================================
  // MASTER FRAMEWORK
  // ============================================
  { frameworkType: 'MASTER', key: 'full_funnel', displayName: 'Full Funnel Content', description: 'Complete funnel content', isSystem: true },
  { frameworkType: 'MASTER', key: 'awareness_stage', displayName: 'Awareness Stage', description: 'Top-of-funnel content', isSystem: true },
  { frameworkType: 'MASTER', key: 'consideration_stage', displayName: 'Consideration Stage', description: 'Middle-of-funnel content', isSystem: true },
  { frameworkType: 'MASTER', key: 'conversion_stage', displayName: 'Conversion Stage', description: 'Bottom-of-funnel content', isSystem: true },
  { frameworkType: 'MASTER', key: 'multi_format', displayName: 'Multi-Format Output', description: 'Multiple content formats', isSystem: true },

  // ============================================
  // DIRECT_RESPONSE FRAMEWORK
  // ============================================
  { frameworkType: 'DIRECT_RESPONSE', key: 'sales_ads', displayName: 'Sales Ads', description: 'Direct sales copy', isSystem: true },
  { frameworkType: 'DIRECT_RESPONSE', key: 'urgency_ads', displayName: 'Urgency Ads', description: 'Urgency-driven content', isSystem: true },
  { frameworkType: 'DIRECT_RESPONSE', key: 'offer_positioning', displayName: 'Offer Positioning', description: 'Offer-focused copy', isSystem: true },
  { frameworkType: 'DIRECT_RESPONSE', key: 'vsl_script', displayName: 'VSL Script', description: 'Video sales letters', isSystem: true },
  { frameworkType: 'DIRECT_RESPONSE', key: 'sales_page', displayName: 'Sales Page', description: 'Long-form sales pages', isSystem: true },
];

async function seedFrameworkCategories() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find an admin user to be the creator
    const admin = await User.findOne({ role: 'admin' });

    if (!admin) {
      console.log('No admin user found. Creating categories without creator.');
    } else {
      console.log(`Found admin user: ${admin.email}`);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const category of defaultCategories) {
      // Check if category already exists
      const existing = await FrameworkCategory.findOne({
        frameworkType: category.frameworkType,
        key: category.key
      });

      if (existing) {
        // Update existing to set isSystem if not already set
        if (!existing.isSystem) {
          existing.isSystem = true;
          existing.displayName = category.displayName;
          existing.description = category.description;
          await existing.save();
          updated++;
          console.log(`Updated ${category.frameworkType}/${category.key}: set as system category`);
        } else {
          skipped++;
          console.log(`Skipping ${category.frameworkType}/${category.key} - already exists`);
        }
        continue;
      }

      // Create the category
      await FrameworkCategory.create({
        ...category,
        createdBy: admin?._id || null
      });

      console.log(`Created ${category.frameworkType}/${category.key}: ${category.displayName}`);
      created++;
    }

    console.log('\n========================================');
    console.log('Seed completed!');
    console.log(`Created: ${created}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log('========================================');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding framework categories:', error);
    process.exit(1);
  }
}

// Run the seed script
seedFrameworkCategories();