/**
 * Quick Platform Admin Seeder
 *
 * Creates platform admin without prompts (for CI/CD or scripts).
 * Will fail if required env vars are not set.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secure123 ADMIN_NAME="Admin" \
 *   node scripts/seed-platform-admin-quick.js
 *
 * Or use defaults:
 *   node scripts/seed-platform-admin-quick.js
 *   (Creates: platform.admin@example.com with generated password)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../src/models/User');

const EXIT_CODES = {
  SUCCESS: 0,
  CONNECTION_ERROR: 1,
  MISSING_ENV: 2,
  USER_EXISTS: 3,
  CREATION_ERROR: 4
};

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(EXIT_CODES.CONNECTION_ERROR);
  }
}

function generatePassword(length = 20) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[crypto.randomInt(0, chars.length)];
  }
  return password;
}

async function createPlatformAdmin() {
  const email = process.env.ADMIN_EMAIL || 'platform.admin@example.com';
  const password = process.env.ADMIN_PASSWORD || generatePassword();
  const name = process.env.ADMIN_NAME || 'Platform Admin';

  console.log('\n' + '='.repeat(60));
  console.log('CREATING PLATFORM ADMIN');
  console.log('='.repeat(60));
  console.log(`Email: ${email}`);
  console.log(`Name: ${name}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`Generated Password: ${password}`);
  }
  console.log('='.repeat(60) + '\n');

  // Check if user exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    if (existingUser.role === 'platform_admin') {
      console.log('✅ Platform admin already exists');
      console.log(`   ID: ${existingUser._id}`);
      return existingUser;
    }

    // Update role to platform_admin
    existingUser.role = 'platform_admin';
    await existingUser.save();
    console.log('✅ Updated existing user to platform_admin');
    console.log(`   ID: ${existingUser._id}`);
    return existingUser;
  }

  // Create new platform admin
  const admin = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: 'platform_admin',
    isActive: true,
    emailVerified: true
  });

  console.log('✅ Platform admin created successfully');
  console.log(`   ID: ${admin._id}`);

  return admin;
}

async function main() {
  console.log('\n🚀 Platform Admin Quick Seeder');
  console.log('─'.repeat(40));

  await connectDB();

  try {
    const admin = await createPlatformAdmin();

    // Output for parsing by other scripts
    console.log('\n' + JSON.stringify({
      success: true,
      id: admin._id.toString(),
      email: admin.email,
      name: admin.name,
      role: admin.role
    }));

    await mongoose.disconnect();
    process.exit(EXIT_CODES.SUCCESS);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(EXIT_CODES.CREATION_ERROR);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createPlatformAdmin };