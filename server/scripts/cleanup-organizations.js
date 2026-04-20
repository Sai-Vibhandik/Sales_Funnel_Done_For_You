/**
 * Script to delete all organizations and related data
 * Run with: node scripts/cleanup-organizations.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const User = require('../src/models/User');
const Organization = require('../src/models/Organization');
const Membership = require('../src/models/Membership');
const Subscription = require('../src/models/Subscription');
const Project = require('../src/models/Project');
const Task = require('../src/models/Task');
const UsageLog = require('../src/models/UsageLog');
const LandingPage = require('../src/models/LandingPage');
const Prompt = require('../src/models/Prompt');
const Client = require('../src/models/Client');
const Creative = require('../src/models/Creative');
const MarketResearch = require('../src/models/MarketResearch');
const Offer = require('../src/models/Offer');
const TrafficStrategy = require('../src/models/TrafficStrategy');
const FrameworkCategory = require('../src/models/FrameworkCategory');
const Invitation = require('../src/models/Invitation');
const Notification = require('../src/models/Notification');

async function cleanup() {
  try {
    console.log('Connecting to database...');

    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to database\n');

    // Get counts before deletion
    const orgCount = await Organization.countDocuments();
    const membershipCount = await Membership.countDocuments();
    const subscriptionCount = await Subscription.countDocuments();
    const projectCount = await Project.countDocuments();
    const taskCount = await Task.countDocuments();
    const usageLogCount = await UsageLog.countDocuments();
    const landingPageCount = await LandingPage.countDocuments();
    const clientCount = await Client.countDocuments();
    const creativeCount = await Creative.countDocuments();
    const invitationCount = await Invitation.countDocuments();

    console.log('=== Current Data Counts ===');
    console.log(`Organizations: ${orgCount}`);
    console.log(`Memberships: ${membershipCount}`);
    console.log(`Subscriptions: ${subscriptionCount}`);
    console.log(`Projects: ${projectCount}`);
    console.log(`Tasks: ${taskCount}`);
    console.log(`Usage Logs: ${usageLogCount}`);
    console.log(`Landing Pages: ${landingPageCount}`);
    console.log(`Clients: ${clientCount}`);
    console.log(`Creatives: ${creativeCount}`);
    console.log(`Invitations: ${invitationCount}`);
    console.log('');

    // Delete all related data
    console.log('Deleting all organizations and related data...\n');

    // 1. Delete memberships
    const membershipResult = await Membership.deleteMany({});
    console.log(`✓ Deleted ${membershipResult.deletedCount} memberships`);

    // 2. Delete subscriptions
    const subscriptionResult = await Subscription.deleteMany({});
    console.log(`✓ Deleted ${subscriptionResult.deletedCount} subscriptions`);

    // 3. Delete projects
    const projectResult = await Project.deleteMany({});
    console.log(`✓ Deleted ${projectResult.deletedCount} projects`);

    // 4. Delete tasks
    const taskResult = await Task.deleteMany({});
    console.log(`✓ Deleted ${taskResult.deletedCount} tasks`);

    // 5. Delete landing pages
    const landingPageResult = await LandingPage.deleteMany({});
    console.log(`✓ Deleted ${landingPageResult.deletedCount} landing pages`);

    // 6. Delete clients
    const clientResult = await Client.deleteMany({});
    console.log(`✓ Deleted ${clientResult.deletedCount} clients`);

    // 7. Delete creatives
    const creativeResult = await Creative.deleteMany({});
    console.log(`✓ Deleted ${creativeResult.deletedCount} creatives`);

    // 8. Delete market research
    const marketResearchResult = await MarketResearch.deleteMany({});
    console.log(`✓ Deleted ${marketResearchResult.deletedCount} market research`);

    // 9. Delete offers
    const offerResult = await Offer.deleteMany({});
    console.log(`✓ Deleted ${offerResult.deletedCount} offers`);

    // 10. Delete traffic strategies
    const trafficStrategyResult = await TrafficStrategy.deleteMany({});
    console.log(`✓ Deleted ${trafficStrategyResult.deletedCount} traffic strategies`);

    // 11. Delete invitations
    const invitationResult = await Invitation.deleteMany({});
    console.log(`✓ Deleted ${invitationResult.deletedCount} invitations`);

    // 12. Delete notifications
    const notificationResult = await Notification.deleteMany({});
    console.log(`✓ Deleted ${notificationResult.deletedCount} notifications`);

    // 13. Delete usage logs
    const usageLogResult = await UsageLog.deleteMany({});
    console.log(`✓ Deleted ${usageLogResult.deletedCount} usage logs`);

    // 14. Delete organization-specific prompts
    const promptResult = await Prompt.deleteMany({ organizationId: { $ne: null } });
    console.log(`✓ Deleted ${promptResult.deletedCount} organization-specific prompts`);

    // 15. Delete organizations
    const orgResult = await Organization.deleteMany({});
    console.log(`✓ Deleted ${orgResult.deletedCount} organizations`);

    // 16. Update users - remove organization references
    const userResult = await User.updateMany(
      {},
      {
        $set: {
          currentOrganization: null,
          organizations: []
        }
      }
    );
    console.log(`✓ Updated ${userResult.modifiedCount} users (removed organization references)`);

    console.log('\n=== Cleanup Complete ===');
    console.log('All organizations and related data have been deleted.');
    console.log('Users now have no organization associations.');
    console.log('Platform admins and plans are preserved.');

    // Get remaining counts
    const Plan = mongoose.model('Plan');
    console.log('\n=== Remaining Data ===');
    console.log(`Organizations: ${await Organization.countDocuments()}`);
    console.log(`Memberships: ${await Membership.countDocuments()}`);
    console.log(`Projects: ${await Project.countDocuments()}`);
    console.log(`Users (unchanged): ${await User.countDocuments()}`);
    console.log(`Plans (unchanged): ${await Plan.countDocuments()}`);

    await mongoose.disconnect();
    console.log('\nDatabase connection closed.');
    process.exit(0);

  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanup();