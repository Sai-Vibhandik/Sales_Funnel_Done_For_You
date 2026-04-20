/**
 * Seed Script: Create default pricing plans
 *
 * Run: node scripts/seed-plans.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Plan = require('../src/models/Plan');
const { DEFAULT_PLANS } = require('../src/config/plans');

console.log('='.repeat(60));
console.log('SEED: Creating default pricing plans');
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

async function seedPlans() {
  try {
    // Check if plans already exist
    const existingPlans = await Plan.countDocuments();

    if (existingPlans > 0) {
      console.log(`\n⚠️  ${existingPlans} plans already exist.`);

      const overwrite = process.env.OVERWRITE_PLANS === 'true';

      if (!overwrite) {
        console.log('   Set OVERWRITE_PLANS=true to overwrite existing plans.');
        console.log('   Exiting...');
        return { seeded: false, count: existingPlans };
      }

      console.log('   Overwriting existing plans...');
      await Plan.deleteMany({});
    }

    // Create default plans
    const plans = [];

    for (const planData of DEFAULT_PLANS) {
      const plan = new Plan({
        ...planData,
        createdBy: null // System-generated
      });
      plans.push(plan);
    }

    await Plan.insertMany(plans);

    console.log(`\n✅ Successfully created ${plans.length} plans:`);
    plans.forEach(plan => {
      console.log(`   - ${plan.name} (${plan.tier}): $${(plan.monthlyPrice / 100).toFixed(2)}/month`);
    });

    return { seeded: true, count: plans.length };
  } catch (error) {
    console.error('\n❌ Error seeding plans:', error);
    throw error;
  }
}

async function main() {
  await connectDB();
  await seedPlans();
  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedPlans };