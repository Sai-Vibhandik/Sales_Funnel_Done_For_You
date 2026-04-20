const mongoose = require('mongoose');
require('dotenv').config();
const Organization = require('../src/models/Organization');
const Membership = require('../src/models/Membership');
const User = require('../src/models/User');

async function debugStats() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  // Get active org IDs
  const activeOrgIds = await Organization.find({ isActive: true }).distinct('_id');
  console.log('Active Organizations:', activeOrgIds.length);

  // Get active member user IDs
  const activeMemberUserIds = await Membership.distinct('userId', {
    organizationId: { $in: activeOrgIds },
    status: 'active'
  });
  console.log('Unique Users with Active Memberships:', activeMemberUserIds.length);

  // Get users by role
  const usersByRole = await User.aggregate([
    { $match: { _id: { $in: activeMemberUserIds } } },
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]);

  console.log('\n=== USERS BY ROLE ===');
  usersByRole.forEach(item => {
    console.log(`  ${item._id}: ${item.count}`);
  });

  // Get all admin users
  console.log('\n=== ADMIN USERS ===');
  const adminUsers = await User.find({
    _id: { $in: activeMemberUserIds },
    role: 'admin'
  });
  adminUsers.forEach(u => {
    console.log(`  ${u.name} (${u.email}) - ${u.role}`);
  });
  console.log(`Total Admin Users: ${adminUsers.length}`);

  // Check memberships for admin users
  console.log('\n=== ADMIN MEMBERSHIPS ===');
  for (const user of adminUsers) {
    const memberships = await Membership.find({ userId: user._id, status: 'active' })
      .populate('organizationId', 'name');
    console.log(`  ${user.name}:`);
    memberships.forEach(m => {
      console.log(`    - ${m.organizationId?.name || 'Unknown Org'}`);
    });
  }

  // Check if there are users with role 'admin' NOT in activeMemberUserIds
  console.log('\n=== ALL ADMIN USERS IN DB ===');
  const allAdmins = await User.find({ role: 'admin' });
  allAdmins.forEach(u => {
    const isActive = activeMemberUserIds.some(id => id.toString() === u._id.toString());
    console.log(`  ${u.name} (${u.email}) - Active Member: ${isActive}`);
  });
  console.log(`Total Admin Users in DB: ${allAdmins.length}`);

  await mongoose.disconnect();
}

debugStats().catch(console.error);