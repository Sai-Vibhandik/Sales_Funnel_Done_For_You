/**
 * Migration Script: Add organizationId to existing collections
 *
 * This script migrates existing single-tenant data to multi-tenant structure.
 * NO TRANSACTIONS VERSION - Works with MongoDB Atlas free tier
 *
 * Steps:
 * 1. Create default organization for each existing user (user becomes admin)
 * 2. Add organizationId to all existing documents
 * 3. Update user documents with organizationId and role='admin'
 *
 * IMPORTANT: This version uses simplified role system:
 * - Single role per account (stored on User model)
 * - No role/permissions on Membership model
 *
 * Run: node scripts/migrate-to-multi-tenant.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Import models
const User = require('../src/models/User');
const Organization = require('../src/models/Organization');
const Membership = require('../src/models/Membership');
const Project = require('../src/models/Project');
const Task = require('../src/models/Task');
const Client = require('../src/models/Client');
const MarketResearch = require('../src/models/MarketResearch');
const Offer = require('../src/models/Offer');
const TrafficStrategy = require('../src/models/TrafficStrategy');
const LandingPage = require('../src/models/LandingPage');
const Creative = require('../src/models/Creative');
const Notification = require('../src/models/Notification');

// Configuration
const DRY_RUN = process.env.DRY_RUN === 'true';

console.log('='.repeat(60));
console.log('MIGRATION: Add organizationId to existing collections');
console.log('Mode:', DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be saved)');
console.log('='.repeat(60));

/**
 * Connect to database
 */
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

/**
 * Create organization for user
 */
async function createOrganizationForUser(user) {
  const orgData = {
    name: `${user.name}'s Organization`,
    slug: user.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `org-${Date.now()}`,
    plan: 'free',
    planName: 'Free Plan',
    owner: user._id,
    createdBy: user._id,
    subscriptionStatus: 'active'
  };

  return await Organization.create(orgData);
}

/**
 * Create membership for user (simplified - no role field)
 */
async function createMembership(user, organization) {
  const membershipData = {
    userId: user._id,
    organizationId: organization._id,
    status: 'active',
    joinedAt: new Date(),
    invitedBy: user._id
  };

  return await Membership.create(membershipData);
}

/**
 * Migrate a collection by adding organizationId
 */
async function migrateCollection(model, userIdField, organizationMap) {
  const modelName = model.modelName;
  console.log(`\n📦 Migrating ${modelName}...`);

  try {
    // Get all documents without organizationId
    const documents = await model.find({ organizationId: { $exists: false } });

    if (documents.length === 0) {
      console.log(`   ✅ No documents to migrate in ${modelName}`);
      return { migrated: 0, skipped: 0, errors: 0 };
    }

    console.log(`   📄 Found ${documents.length} documents to migrate`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const doc of documents) {
      try {
        // Get the user who created this document
        const userId = doc.createdBy || doc[userIdField];

        if (!userId) {
          console.log(`   ⚠️  Skipping ${modelName} ${doc._id} - no user reference`);
          skipped++;
          continue;
        }

        // Get organization for this user
        const organizationId = organizationMap.get(userId.toString());

        if (!organizationId) {
          console.log(`   ⚠️  Skipping ${modelName} ${doc._id} - no organization for user ${userId}`);
          skipped++;
          continue;
        }

        // Update document with organizationId
        if (!DRY_RUN) {
          await model.findByIdAndUpdate(doc._id, { organizationId });
        }

        migrated++;
      } catch (error) {
        console.error(`   ❌ Error migrating ${modelName} ${doc._id}:`, error.message);
        errors++;
      }
    }

    console.log(`   ✅ ${modelName}: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
  } catch (error) {
    console.error(`   ❌ Error in ${modelName}:`, error.message);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

/**
 * Main migration function
 */
async function migrate() {
  const startTime = Date.now();

  // Connect to database first
  await connectDB();

  console.log('\n📊 Step 1: Analyzing existing data...');

  // Get all users
  const users = await User.find({});
  console.log(`   Found ${users.length} users`);

  // Create organization map
  const organizationMap = new Map();
  const userStats = {
    total: users.length,
    migrated: 0,
    errors: 0
  };

  console.log('\n📊 Step 2: Creating organizations for users...');

  for (const user of users) {
    try {
      // Check if user already has an organization
      let organization;
      const existingMembership = await Membership.findOne({
        userId: user._id,
        status: 'active'
      });

      if (existingMembership) {
        organization = await Organization.findById(existingMembership.organizationId);
        console.log(`   ✓ User ${user.email} already has organization: ${organization?.name}`);
      } else {
        // Create organization for user
        if (!DRY_RUN) {
          organization = await createOrganizationForUser(user);

          // Create membership (simplified - no role)
          await createMembership(user, organization);

          // Update user (set role to admin for org creator)
          await User.findByIdAndUpdate(user._id, {
            currentOrganization: organization._id,
            role: 'admin' // First user becomes admin
          });

          console.log(`   ✓ Created organization for ${user.email}: ${organization.name}`);
        } else {
          console.log(`   [DRY RUN] Would create organization for ${user.email}`);
          organization = { _id: 'dry-run-id' };
        }
      }

      if (organization) {
        organizationMap.set(user._id.toString(), organization._id);
      }
      userStats.migrated++;
    } catch (error) {
      console.error(`   ❌ Error processing user ${user.email}:`, error.message);
      userStats.errors++;
    }
  }

  console.log(`\n✅ Organizations: ${userStats.migrated} processed, ${userStats.errors} errors`);

  // Migrate collections
  const collectionStats = {};

  console.log('\n📊 Step 3: Migrating collections...');

  // Projects
  collectionStats.projects = await migrateCollection(Project, 'createdBy', organizationMap);

  // Tasks
  collectionStats.tasks = await migrateCollection(Task, 'createdBy', organizationMap);

  // Clients
  collectionStats.clients = await migrateCollection(Client, 'createdBy', organizationMap);

  // Market Research
  collectionStats.marketResearch = await migrateCollection(MarketResearch, 'createdBy', organizationMap);

  // Offers
  collectionStats.offers = await migrateCollection(Offer, 'createdBy', organizationMap);

  // Traffic Strategy
  collectionStats.trafficStrategy = await migrateCollection(TrafficStrategy, 'createdBy', organizationMap);

  // Landing Pages
  collectionStats.landingPages = await migrateCollection(LandingPage, 'createdBy', organizationMap);

  // Creatives
  collectionStats.creatives = await migrateCollection(Creative, 'createdBy', organizationMap);

  // Notifications
  collectionStats.notifications = await migrateCollection(Notification, 'recipient', organizationMap);

  // Print summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Duration: ${duration}s`);
  console.log(`\nUsers:`);
  console.log(`  Total: ${userStats.total}`);
  console.log(`  Processed: ${userStats.migrated}`);
  console.log(`  Errors: ${userStats.errors}`);

  console.log(`\nCollections:`);
  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const [name, stats] of Object.entries(collectionStats)) {
    console.log(`  ${name}: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.errors} errors`);
    totalMigrated += stats.migrated;
    totalSkipped += stats.skipped;
    totalErrors += stats.errors;
  }

  console.log(`\nTotal: ${totalMigrated} migrated, ${totalSkipped} skipped, ${totalErrors} errors`);
  console.log('='.repeat(60));

  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');

  return {
    success: userStats.errors === 0 && totalErrors === 0,
    userStats,
    collectionStats,
    duration
  };
}

// Run migration
if (require.main === module) {
  migrate()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { migrate };