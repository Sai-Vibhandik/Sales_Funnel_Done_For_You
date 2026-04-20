/**
 * Database Verification Script
 *
 * Verifies that all required collections, indexes, and data exist for the multi-tenant SaaS system.
 *
 * Run: node scripts/verify-database.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

console.log('='.repeat(70));
console.log(`${colors.cyan}DATABASE VERIFICATION SCRIPT${colors.reset}`);
console.log('='.repeat(70));

// Required collections
const REQUIRED_COLLECTIONS = [
  'users',
  'organizations',
  'memberships',
  'invitations',
  'subscriptions',
  'plans',
  'usagelogs',
  'projects',
  'tasks',
  'clients',
  'marketresearches',
  'offers',
  'trafficstrategies',
  'landingpages',
  'creativestrategies',
  'notifications',
  'prompts',
  'frameworkcategories',
];

// Required indexes per collection
const REQUIRED_INDEXES = {
  users: [
    { key: { email: 1 }, unique: true },
    { key: { role: 1 } },
    { key: { currentOrganization: 1 } },
  ],
  organizations: [
    { key: { slug: 1 }, unique: true },
    { key: { owner: 1 } },
    { key: { isActive: 1 } },
  ],
  memberships: [
    { key: { userId: 1, organizationId: 1 }, unique: true },
    { key: { organizationId: 1, status: 1 } },
  ],
  invitations: [
    { key: { token: 1 }, unique: true },
    { key: { organizationId: 1, email: 1, status: 1 } },
    { key: { expiresAt: 1 } },
  ],
  projects: [
    { key: { organizationId: 1 } },
    { key: { organizationId: 1, status: 1 } },
  ],
  tasks: [
    { key: { organizationId: 1 } },
    { key: { projectId: 1 } },
  ],
  clients: [
    { key: { organizationId: 1 } },
  ],
  plans: [
    { key: { slug: 1 }, unique: true },
    { key: { tier: 1 } },
  ],
};

async function connectDB() {
  try {
    const dbUri = process.env.MONGODB_URI;
    console.log(`\n${colors.blue}Connecting to MongoDB...${colors.reset}`);
    console.log(`URI: ${dbUri?.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);

    await mongoose.connect(dbUri);
    console.log(`${colors.green}✅ Connected to MongoDB${colors.reset}`);

    const dbName = mongoose.connection.name;
    console.log(`${colors.cyan}Database: ${dbName}${colors.reset}`);

    return true;
  } catch (error) {
    console.error(`${colors.red}❌ MongoDB connection error:${colors.reset}`, error.message);
    return false;
  }
}

async function listCollections() {
  const collections = await mongoose.connection.db.listCollections().toArray();
  return collections.map(c => c.name);
}

async function getIndexes(collectionName) {
  try {
    const indexes = await mongoose.connection.db.collection(collectionName).getIndexes();
    return indexes;
  } catch (error) {
    return [];
  }
}

async function verifyCollections() {
  console.log(`\n${colors.cyan}═══ COLLECTIONS ═══${colors.reset}`);

  const existingCollections = await listCollections();

  let missing = [];
  let present = [];

  for (const collection of REQUIRED_COLLECTIONS) {
    if (existingCollections.includes(collection)) {
      present.push(collection);
      console.log(`  ${colors.green}✓${colors.reset} ${collection}`);
    } else {
      missing.push(collection);
      console.log(`  ${colors.red}✗${colors.reset} ${collection} ${colors.red}(MISSING)${colors.reset}`);
    }
  }

  // Check for extra collections
  const extraCollections = existingCollections.filter(c => !REQUIRED_COLLECTIONS.includes(c));
  if (extraCollections.length > 0) {
    console.log(`\n${colors.yellow}Additional collections found:${colors.reset}`);
    extraCollections.forEach(c => console.log(`  ${colors.yellow}•${colors.reset} ${c}`));
  }

  return { missing, present };
}

async function verifyIndexes() {
  console.log(`\n${colors.cyan}═══ INDEXES ═══${colors.reset}`);

  let allGood = true;

  for (const [collection, requiredIndexes] of Object.entries(REQUIRED_INDEXES)) {
    console.log(`\n${colors.blue}${collection}:${colors.reset}`);

    const existingIndexes = await getIndexes(collection);
    if (existingIndexes.length === 0) {
      console.log(`  ${colors.red}✗ Collection not found or no indexes${colors.reset}`);
      allGood = false;
      continue;
    }

    for (const reqIndex of requiredIndexes) {
      const keyStr = JSON.stringify(reqIndex.key);
      const found = existingIndexes.some(idx => {
        return JSON.stringify(idx.key) === keyStr &&
               (reqIndex.unique ? idx.unique === true : true);
      });

      if (found) {
        console.log(`  ${colors.green}✓${colors.reset} ${keyStr}${reqIndex.unique ? ' (unique)' : ''}`);
      } else {
        console.log(`  ${colors.red}✗${colors.reset} ${keyStr}${reqIndex.unique ? ' (unique)' : ''} ${colors.red}(MISSING)${colors.reset}`);
        allGood = false;
      }
    }
  }

  return allGood;
}

async function verifyPlatformAdmin() {
  console.log(`\n${colors.cyan}═══ PLATFORM ADMIN ═══${colors.reset}`);

  // Use existing model or create new one
  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  const platformAdmins = await User.find({ role: 'platform_admin' });

  if (platformAdmins.length === 0) {
    console.log(`  ${colors.red}✗ No platform_admin user found${colors.reset}`);
    console.log(`  ${colors.yellow}⚠ Run: npm run seed:admin${colors.reset}`);
    return false;
  }

  console.log(`  ${colors.green}✓${colors.reset} Found ${platformAdmins.length} platform admin(s):`);
  platformAdmins.forEach(admin => {
    console.log(`     - ${admin.name} (${admin.email})`);
    console.log(`       Status: ${admin.isActive ? 'Active' : 'Inactive'}`);
    console.log(`       Created: ${admin.createdAt?.toLocaleDateString()}`);
  });

  return true;
}

async function verifyPlans() {
  console.log(`\n${colors.cyan}═══ PRICING PLANS ═══${colors.reset}`);

  try {
    // Use existing model or create new one
    const Plan = mongoose.models.Plan || mongoose.model('Plan', new mongoose.Schema({}, { strict: false }));
    const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 });

    if (plans.length === 0) {
      console.log(`  ${colors.red}✗ No active pricing plans found${colors.reset}`);
      console.log(`  ${colors.yellow}⚠ Run: npm run seed:plans${colors.reset}`);
      return false;
    }

    console.log(`  ${colors.green}✓${colors.reset} Found ${plans.length} active plan(s):`);
    plans.forEach(plan => {
      const price = plan.monthlyPrice ? `$${(plan.monthlyPrice / 100).toFixed(2)}/mo` : 'Free';
      console.log(`     - ${plan.name} (${plan.tier}): ${price}`);
    });

    return true;
  } catch (error) {
    console.log(`  ${colors.red}✗ Error checking plans: ${error.message}${colors.reset}`);
    return false;
  }
}

async function verifyOrganizationStructure() {
  console.log(`\n${colors.cyan}═══ ORGANIZATION STRUCTURE ═══${colors.reset}`);

  try {
    // Use existing models or create new ones
    const Organization = mongoose.models.Organization || mongoose.model('Organization', new mongoose.Schema({}, { strict: false }));
    const Membership = mongoose.models.Membership || mongoose.model('Membership', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    const orgCount = await Organization.countDocuments();
    const membershipCount = await Membership.countDocuments();
    const userCount = await User.countDocuments();

    console.log(`  ${colors.blue}Statistics:${colors.reset}`);
    console.log(`     Users: ${userCount}`);
    console.log(`     Organizations: ${orgCount}`);
    console.log(`     Memberships: ${membershipCount}`);

    // Check for users without organizationId
    const usersWithoutOrg = await User.countDocuments({ currentOrganization: { $exists: false } });
    if (usersWithoutOrg > 0) {
      console.log(`  ${colors.yellow}⚠${colors.reset} ${usersWithoutOrg} users without currentOrganization`);
      console.log(`     ${colors.yellow}Run migration if needed: npm run migrate${colors.reset}`);
    } else {
      console.log(`  ${colors.green}✓${colors.reset} All users have organization context`);
    }

    // Check for memberships without role (should be fine now - role is on User)
    const membershipSample = await Membership.findOne({});
    if (membershipSample && membershipSample.role) {
      console.log(`  ${colors.yellow}⚠${colors.reset} Memberships still have 'role' field (legacy data)`);
      console.log(`     ${colors.yellow}This is OK - role is now on User model${colors.reset}`);
    } else {
      console.log(`  ${colors.green}✓${colors.reset} Membership schema correct (no role field)`);
    }

    return true;
  } catch (error) {
    console.log(`  ${colors.red}✗ Error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function verifyUserRoles() {
  console.log(`\n${colors.cyan}═══ USER ROLES ═══${colors.reset}`);

  try {
    // Use existing model or create new one
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    const validRoles = [
      'platform_admin',
      'admin',
      'performance_marketer',
      'graphic_designer',
      'video_editor',
      'ui_ux_designer',
      'developer',
      'tester',
      'content_writer',
      'content_creator'
    ];

    const roleStats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log(`  ${colors.blue}Role distribution:${colors.reset}`);
    roleStats.forEach(stat => {
      const isValid = validRoles.includes(stat._id);
      const icon = isValid ? colors.green + '✓' : colors.red + '✗';
      console.log(`     ${icon}${colors.reset} ${stat._id || 'undefined'}: ${stat.count} users`);
    });

    // Check for invalid roles
    const invalidRoles = roleStats.filter(s => !validRoles.includes(s._id));
    if (invalidRoles.length > 0) {
      console.log(`  ${colors.yellow}⚠ Found users with invalid roles${colors.reset}`);
      return false;
    }

    return true;
  } catch (error) {
    console.log(`  ${colors.red}✗ Error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function runVerification() {
  const startTime = Date.now();

  // Connect
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }

  // Run all verifications
  const results = {
    collections: await verifyCollections(),
    indexes: await verifyIndexes(),
    platformAdmin: await verifyPlatformAdmin(),
    plans: await verifyPlans(),
    organization: await verifyOrganizationStructure(),
    roles: await verifyUserRoles(),
  };

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${colors.cyan}VERIFICATION SUMMARY${colors.reset}`);
  console.log('='.repeat(70));

  const checks = [
    { name: 'Collections', passed: results.collections.missing.length === 0 },
    { name: 'Indexes', passed: results.indexes },
    { name: 'Platform Admin', passed: results.platformAdmin },
    { name: 'Pricing Plans', passed: results.plans },
    { name: 'Organization Structure', passed: results.organization },
    { name: 'User Roles', passed: results.roles },
  ];

  checks.forEach(check => {
    const icon = check.passed ? colors.green + '✓' : colors.red + '✗';
    console.log(`  ${icon}${colors.reset} ${check.name}`);
  });

  const allPassed = checks.every(c => c.passed);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n${'='.repeat(70)}`);
  if (allPassed) {
    console.log(`${colors.green}✅ ALL CHECKS PASSED (${duration}s)${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ SOME CHECKS FAILED (${duration}s)${colors.reset}`);
    console.log(`${colors.yellow}Please run the required setup scripts.${colors.reset}`);
  }
  console.log('='.repeat(70));

  await mongoose.disconnect();
  process.exit(allPassed ? 0 : 1);
}

// Run verification
runVerification().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});