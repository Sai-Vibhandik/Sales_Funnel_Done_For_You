/**
 * Script to verify plan currencies
 * Run with: node src/scripts/checkPlans.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/growth-valley';

async function checkPlans() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const plansCollection = db.collection('plans');

    const plans = await plansCollection.find({}).toArray();
    console.log(`\nFound ${plans.length} plans:\n`);

    plans.forEach(plan => {
      console.log(`Plan: ${plan.name}`);
      console.log(`  - Monthly Price: ${plan.monthlyPrice}`);
      console.log(`  - Yearly Price: ${plan.yearlyPrice}`);
      console.log(`  - Currency: ${plan.currency?.code || 'N/A'} (${plan.currency?.symbol || 'N/A'})`);
      console.log('');
    });

    await mongoose.disconnect();
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPlans();