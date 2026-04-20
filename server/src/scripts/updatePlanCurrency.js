/**
 * Script to update all existing plans to use INR currency
 * Run with: node src/scripts/updatePlanCurrency.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/growth-valley';

async function updatePlanCurrency() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the plans collection directly
    const db = mongoose.connection.db;
    const plansCollection = db.collection('plans');

    // First, check current state
    const existingPlans = await plansCollection.find({}).toArray();
    console.log(`Found ${existingPlans.length} plans`);

    // Update each plan individually to handle different currency formats
    let updatedCount = 0;

    for (const plan of existingPlans) {
      const updateResult = await plansCollection.updateOne(
        { _id: plan._id },
        {
          $set: {
            currency: {
              code: 'INR',
              symbol: '₹'
            }
          }
        }
      );

      if (updateResult.modifiedCount > 0) {
        updatedCount++;
        console.log(`Updated plan: ${plan.name}`);
      }
    }

    console.log(`\nUpdated ${updatedCount} plans to use INR currency`);

    // Verify the update
    const plans = await plansCollection.find({}, { projection: { name: 1, currency: 1 } }).toArray();
    console.log('\nCurrent plan currencies:');
    plans.forEach(plan => {
      console.log(`- ${plan.name}: ${plan.currency?.code || 'N/A'} (${plan.currency?.symbol || 'N/A'})`);
    });

    await mongoose.disconnect();
    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating plans:', error);
    process.exit(1);
  }
}

updatePlanCurrency();