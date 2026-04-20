const mongoose = require('mongoose');
require('dotenv').config();
const Organization = require('../src/models/Organization');
const Membership = require('../src/models/Membership');
const User = require('../src/models/User');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);

  const orgs = await Organization.find({}, 'name isActive plan').lean();
  console.log('\n=== ORGANIZATIONS ===');
  orgs.forEach(o => console.log(`  ${o.name} - isActive: ${o.isActive}, plan: ${o.plan}`));
  console.log(`Total: ${orgs.length}`);

  const memberships = await Membership.find({ status: 'active' })
    .populate('userId', 'name email role')
    .populate('organizationId', 'name')
    .lean();
  console.log('\n=== ACTIVE MEMBERSHIPS ===');
  memberships.forEach(m => {
    const userName = m.userId?.name || 'Unknown';
    const userEmail = m.userId?.email || 'Unknown';
    const userRole = m.userId?.role || 'Unknown';
    const orgName = m.organizationId?.name || 'Unknown';
    console.log(`  ${userName} (${userEmail}) - ${userRole} - ${orgName}`);
  });
  console.log(`Total: ${memberships.length}`);

  const users = await User.find({}, 'name email role').lean();
  console.log('\n=== ALL USERS ===');
  users.forEach(u => console.log(`  ${u.name} (${u.email}) - ${u.role}`));
  console.log(`Total: ${users.length}`);

  await mongoose.disconnect();
}

check().catch(console.error);