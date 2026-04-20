/**
 * Seed Script: Create Platform Admin
 *
 * Creates the first platform_admin account for managing the entire platform.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const readline = require('readline');
const User = require('../src/models/User');

console.log('='.repeat(60));
console.log('SEED: Create Platform Admin Account');
console.log('='.repeat(60));

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

function promptInput(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function generatePassword(length = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

async function createPlatformAdmin() {
  try {
    let email = process.env.ADMIN_EMAIL;
    let password = process.env.ADMIN_PASSWORD;
    let name = process.env.ADMIN_NAME || 'Platform Admin';

    console.log('\n📋 Setting up platform admin account...\n');

    // Prompt for email
    if (!email) {
      email = await promptInput('Enter admin email (press Enter for default: platform.admin@example.com): ');
      if (!email) email = 'platform.admin@example.com';
    }

    // Prompt for name
    if (name === 'Platform Admin') {
      const inputName = await promptInput(`Enter admin name (press Enter for default: "${name}"): `);
      if (inputName) name = inputName;
    }

    // Generate or prompt for password
    if (!password) {
      const choice = await promptInput('Generate a secure password? (Y/n): ');
      if (choice.toLowerCase() !== 'n') {
        password = generatePassword(16);
      } else {
        password = await promptInput('Enter password (min 6 characters): ');
        if (!password || password.length < 6) {
          console.error('❌ Password must be at least 6 characters');
          return { success: false };
        }
      }
    }

    // Check existing user
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      console.log(`\n⚠️  User "${email}" already exists with role: ${existingUser.role}`);

      if (existingUser.role === 'platform_admin') {
        console.log('\n╔' + '═'.repeat(50) + '╗');
        console.log('║' + ' '.repeat(50) + '║');
        console.log('║  ✅ USER IS ALREADY A PLATFORM ADMIN'.padEnd(51) + '║');
        console.log('║' + ' '.repeat(50) + '║');
        console.log('╠' + '═'.repeat(50) + '╣');
        console.log('║' + `  Email: ${email}`.padEnd(51) + '║');
        console.log('║' + '  Password: [use existing password]'.padEnd(51) + '║');
        console.log('╚' + '═'.repeat(50) + '╝\n');
        return { success: true, user: existingUser };
      }

      const update = await promptInput('Update this user to platform_admin? (y/N): ');
      if (update.toLowerCase() === 'y') {
        existingUser.role = 'platform_admin';
        await existingUser.save();
        console.log('\n✅ User role updated to platform_admin');
        return { success: true, user: existingUser };
      }
      console.log('❌ Cancelled');
      return { success: false };
    }

    // Create admin
    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'platform_admin',
      isActive: true,
      emailVerified: true
    });

    // Display credentials prominently
    console.log('\n');
    console.log('╔' + '═'.repeat(60) + '╗');
    console.log('║' + ' '.repeat(60) + '║');
    console.log('║' + '   ✅ PLATFORM ADMIN CREATED SUCCESSFULLY'.padEnd(59) + '║');
    console.log('║' + ' '.repeat(60) + '║');
    console.log('╠' + '═'.repeat(60) + '╣');
    console.log('║' + ' '.repeat(60) + '║');
    console.log('║' + `   Name:     ${admin.name}`.padEnd(61) + '║');
    console.log('║' + `   Email:    ${admin.email}`.padEnd(61) + '║');
    console.log('║' + `   Password: ${password}`.padEnd(61) + '║');
    console.log('║' + `   Role:     ${admin.role}`.padEnd(61) + '║');
    console.log('║' + ' '.repeat(60) + '║');
    console.log('╠' + '═'.repeat(60) + '╣');
    console.log('║' + '   ⚠️  SAVE THESE CREDENTIALS SECURELY!'.padEnd(60) + '║');
    console.log('║' + '   This account has FULL PLATFORM ACCESS.'.padEnd(60) + '║');
    console.log('║' + ' '.repeat(60) + '║');
    console.log('╚' + '═'.repeat(60) + '╝');
    console.log('\n');

    return { success: true, user: admin, password };
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('   User with this email already exists');
    }
    return { success: false, error: error.message };
  }
}

async function listAdmins() {
  const admins = await User.find({ role: 'platform_admin' })
    .select('name email isActive createdAt')
    .sort({ createdAt: 1 });

  console.log('\n📋 Existing Platform Admins:');
  console.log('-'.repeat(50));
  if (admins.length === 0) {
    console.log('   No platform admins found');
  } else {
    admins.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.name} (${a.email}) - ${a.isActive ? '✅' : '❌'}`);
    });
  }
  console.log('-'.repeat(50));
  return admins;
}

async function main() {
  await connectDB();
  await listAdmins();

  console.log('\nOptions:');
  console.log('  1. Create new platform admin');
  console.log('  2. Exit\n');

  const choice = await promptInput('Select option (1-2): ');

  if (choice === '1') {
    await createPlatformAdmin();
  } else {
    console.log('👋 Exiting...');
  }

  await mongoose.disconnect();
  console.log('\n👋 Done\n');
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { createPlatformAdmin };