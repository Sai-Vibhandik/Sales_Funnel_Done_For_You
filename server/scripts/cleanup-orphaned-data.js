/**
 * Cleanup Script: Delete orphaned data (memberships and users without valid organizations)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Organization = require('../src/models/Organization');
const Membership = require('../src/models/Membership');
const User = require('../src/models/User');

console.log('='.repeat(60));
console.log('CLEANUP: Removing orphaned data');
console.log('='.repeat(60));

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // Get all active organization IDs
  const activeOrgIds = await Organization.find({ isActive: true }).distinct('_id');
  console.log(`📋 Active organizations: ${activeOrgIds.length}`);

  // Find memberships with invalid organizationId
  const orphanedMemberships = await Membership.find({
    $or: [
      { organizationId: { $exists: false } },
      { organizationId: null },
      { organizationId: { $nin: activeOrgIds } }
    ]
  });
  console.log(`🔍 Found ${orphanedMemberships.length} orphaned memberships`);

  // Delete orphaned memberships
  if (orphanedMemberships.length > 0) {
    const result = await Membership.deleteMany({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null },
        { organizationId: { $nin: activeOrgIds } }
      ]
    });
    console.log(`🗑️  Deleted ${result.deletedCount} orphaned memberships`);
  }

  // Find users who have no active memberships
  const usersWithActiveMemberships = await Membership.find({ status: 'active' }).distinct('userId');
  const allUsers = await User.find({}, '_id');

  const orphanedUserIds = allUsers.filter(u => !usersWithActiveMemberships.some(m => m.toString() === u._id.toString()));
  console.log(`🔍 Found ${orphanedUserIds.length} users without active memberships`);

  // Delete orphaned users (except platform_admin)
  for (const user of orphanedUserIds) {
    const userDetails = await User.findById(user._id);
    if (userDetails && userDetails.role !== 'platform_admin') {
      await User.findByIdAndDelete(user._id);
      console.log(`   Deleted user: ${userDetails.name} (${userDetails.email})`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('CLEANUP COMPLETE');
  console.log('='.repeat(60));

  // Show remaining counts
  const remainingUsers = await User.countDocuments();
  const remainingMemberships = await Membership.countDocuments({ status: 'active' });
  const remainingOrgs = await Organization.countDocuments({ isActive: true });

  console.log(`Remaining organizations: ${remainingOrgs}`);
  console.log(`Remaining users: ${remainingUsers}`);
  console.log(`Remaining active memberships: ${remainingMemberships}`);

  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
}

cleanup().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});