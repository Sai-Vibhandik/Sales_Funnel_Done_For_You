/**
 * Cleanup Script: Delete all data for soft-deleted organizations
 *
 * Run: node scripts/cleanup-deleted-orgs.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Models
const Organization = require('../src/models/Organization');
const Membership = require('../src/models/Membership');
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const Invitation = require('../src/models/Invitation');
const Notification = require('../src/models/Notification');
const MarketResearch = require('../src/models/MarketResearch');
const Offer = require('../src/models/Offer');
const TrafficStrategy = require('../src/models/TrafficStrategy');
const LandingPage = require('../src/models/LandingPage');
const Creative = require('../src/models/Creative');
const Task = require('../src/models/Task');
const UsageLog = require('../src/models/UsageLog');
const Prompt = require('../src/models/Prompt');

console.log('='.repeat(60));
console.log('CLEANUP: Deleting data for soft-deleted organizations');
console.log('='.repeat(60));

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function cleanupDeletedOrganizations() {
  try {
    // Find all soft-deleted organizations
    const deletedOrgs = await Organization.find({ isActive: false });

    if (deletedOrgs.length === 0) {
      console.log('\n✅ No deleted organizations found. Nothing to clean up.');
      return { cleaned: false };
    }

    console.log(`\n📋 Found ${deletedOrgs.length} deleted organization(s):`);
    deletedOrgs.forEach(org => {
      console.log(`   - ${org.name} (${org._id})`);
    });

    const deletedOrgIds = deletedOrgs.map(org => org._id);

    // Statistics
    const stats = {
      memberships: 0,
      projects: 0,
      invitations: 0,
      notifications: 0,
      marketResearch: 0,
      offers: 0,
      trafficStrategies: 0,
      landingPages: 0,
      creatives: 0,
      tasks: 0,
      usageLogs: 0,
      prompts: 0,
      users: 0,
    };

    console.log('\n🗑️  Cleaning up related data...');

    // 1. Delete Memberships
    stats.memberships = await Membership.deleteMany({
      organizationId: { $in: deletedOrgIds }
    }).then(r => r.deletedCount);
    console.log(`   Memberships: ${stats.memberships} deleted`);

    // 2. Delete Projects
    stats.projects = await Project.deleteMany({
      organizationId: { $in: deletedOrgIds }
    }).then(r => r.deletedCount);
    console.log(`   Projects: ${stats.projects} deleted`);

    // 3. Delete Invitations
    stats.invitations = await Invitation.deleteMany({
      organizationId: { $in: deletedOrgIds }
    }).then(r => r.deletedCount);
    console.log(`   Invitations: ${stats.invitations} deleted`);

    // 4. Delete Notifications
    stats.notifications = await Notification.deleteMany({
      organizationId: { $in: deletedOrgIds }
    }).then(r => r.deletedCount);
    console.log(`   Notifications: ${stats.notifications} deleted`);

    // 5. Get project IDs to delete related stage data
    const deletedProjectIds = await Project.find({
      organizationId: { $in: deletedOrgIds }
    }).distinct('_id');

    // 6. Delete Market Research
    stats.marketResearch = await MarketResearch.deleteMany({
      projectId: { $in: deletedProjectIds }
    }).then(r => r.deletedCount);
    console.log(`   Market Research: ${stats.marketResearch} deleted`);

    // 7. Delete Offers
    stats.offers = await Offer.deleteMany({
      projectId: { $in: deletedProjectIds }
    }).then(r => r.deletedCount);
    console.log(`   Offers: ${stats.offers} deleted`);

    // 8. Delete Traffic Strategies
    stats.trafficStrategies = await TrafficStrategy.deleteMany({
      projectId: { $in: deletedProjectIds }
    }).then(r => r.deletedCount);
    console.log(`   Traffic Strategies: ${stats.trafficStrategies} deleted`);

    // 9. Delete Landing Pages
    stats.landingPages = await LandingPage.deleteMany({
      projectId: { $in: deletedProjectIds }
    }).then(r => r.deletedCount);
    console.log(`   Landing Pages: ${stats.landingPages} deleted`);

    // 10. Delete Creatives
    stats.creatives = await Creative.deleteMany({
      projectId: { $in: deletedProjectIds }
    }).then(r => r.deletedCount);
    console.log(`   Creatives: ${stats.creatives} deleted`);

    // 11. Delete Tasks
    stats.tasks = await Task.deleteMany({
      projectId: { $in: deletedProjectIds }
    }).then(r => r.deletedCount);
    console.log(`   Tasks: ${stats.tasks} deleted`);

    // 12. Delete Usage Logs
    stats.usageLogs = await UsageLog.deleteMany({
      organizationId: { $in: deletedOrgIds }
    }).then(r => r.deletedCount);
    console.log(`   Usage Logs: ${stats.usageLogs} deleted`);

    // 13. Delete organization-specific prompts
    stats.prompts = await Prompt.deleteMany({
      organizationId: { $in: deletedOrgIds }
    }).then(r => r.deletedCount);
    console.log(`   Prompts: ${stats.prompts} deleted`);

    // 14. Find and delete users who only belonged to deleted organizations
    // First, find users who have memberships only in deleted orgs
    const usersWithOnlyDeletedOrgs = await Membership.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$userId', orgCount: { $sum: 1 } } },
      { $match: { orgCount: { $lte: 0 } } }
    ]);

    // Actually, let's find users who have NO active memberships
    const allDeletedOrgMembers = await Membership.find({
      organizationId: { $in: deletedOrgIds }
    }).distinct('userId');

    // Check which users have no other active memberships
    for (const userId of allDeletedOrgMembers) {
      const activeMemberships = await Membership.countDocuments({
        userId,
        status: 'active'
      });

      if (activeMemberships === 0) {
        // User has no active memberships, can be deleted
        await User.findByIdAndDelete(userId);
        stats.users++;
      }
    }
    console.log(`   Users (with no other orgs): ${stats.users} deleted`);

    // 15. Finally, hard delete the organizations
    await Organization.deleteMany({ isActive: false });
    console.log(`\n✅ Deleted ${deletedOrgs.length} organization(s) permanently`);

    // Summary
    const totalDeleted = Object.values(stats).reduce((a, b) => a + b, 0);
    console.log('\n' + '='.repeat(60));
    console.log('CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`Organizations permanently deleted: ${deletedOrgs.length}`);
    console.log(`Memberships deleted: ${stats.memberships}`);
    console.log(`Projects deleted: ${stats.projects}`);
    console.log(`Invitations deleted: ${stats.invitations}`);
    console.log(`Notifications deleted: ${stats.notifications}`);
    console.log(`Market Research deleted: ${stats.marketResearch}`);
    console.log(`Offers deleted: ${stats.offers}`);
    console.log(`Traffic Strategies deleted: ${stats.trafficStrategies}`);
    console.log(`Landing Pages deleted: ${stats.landingPages}`);
    console.log(`Creatives deleted: ${stats.creatives}`);
    console.log(`Tasks deleted: ${stats.tasks}`);
    console.log(`Usage Logs deleted: ${stats.usageLogs}`);
    console.log(`Prompts deleted: ${stats.prompts}`);
    console.log(`Users deleted: ${stats.users}`);
    console.log('-'.repeat(60));
    console.log(`Total records deleted: ${totalDeleted}`);

    return { cleaned: true, stats };
  } catch (error) {
    console.error('\n❌ Cleanup error:', error);
    throw error;
  }
}

async function main() {
  await connectDB();
  await cleanupDeletedOrganizations();
  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { cleanupDeletedOrganizations };