/**
 * Billing Cron Service
 *
 * Handles scheduled tasks for subscription management:
 * - Daily check for expiring subscriptions
 * - Sends reminder notifications at 7, 5, and 1 days before expiry
 * - Suspends organizations when subscription expires
 */

const cron = require('node-cron');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Notification = require('../models/Notification');
const Membership = require('../models/Membership');
const { sendSubscriptionExpiryReminder, sendSubscriptionExpiredNotification } = require('./emailService');

// Reminder days before expiry
const REMINDER_DAYS = [7, 5, 1];

/**
 * Initialize billing cron jobs
 * Should be called when server starts
 */
const initBillingCronJobs = () => {
  console.log('Initializing billing cron jobs...');

  // Daily subscription check at midnight (00:00)
  // Cron format: minute hour day-of-month month day-of-week
  cron.schedule('0 0 * * *', async () => {
    console.log('[Billing Cron] Running daily subscription check...');
    try {
      await checkSubscriptions();
    } catch (error) {
      console.error('[Billing Cron] Error in daily subscription check:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('Billing cron jobs initialized successfully');
};

/**
 * Main function to check all subscriptions
 */
const checkSubscriptions = async () => {
  const now = new Date();

  // Check for each reminder day
  for (const days of REMINDER_DAYS) {
    await checkExpiringInDays(days);
  }

  // Check for expired subscriptions
  await checkExpiredSubscriptions();
};

/**
 * Check subscriptions expiring in X days and send reminders
 * @param {number} days - Number of days until expiry
 */
const checkExpiringInDays = async (days) => {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + days);

  // Set to start and end of the target day
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  try {
    // Find active organizations expiring on the target day
    const expiringOrgs = await Organization.find({
      isActive: true,
      isSuspended: false,
      subscriptionStatus: { $in: ['active', 'trialing'] },
      currentPeriodEnd: {
        $gte: dayStart,
        $lte: dayEnd
      }
    });

    console.log(`[Billing Cron] Found ${expiringOrgs.length} organizations expiring in ${days} days`);

    for (const org of expiringOrgs) {
      try {
        await sendExpiryReminder(org, days);
      } catch (error) {
        console.error(`[Billing Cron] Error sending reminder to org ${org._id}:`, error);
      }
    }
  } catch (error) {
    console.error(`[Billing Cron] Error checking subscriptions expiring in ${days} days:`, error);
  }
};

/**
 * Check for expired subscriptions and suspend organizations
 */
const checkExpiredSubscriptions = async () => {
  const now = new Date();

  try {
    // Find organizations where subscription has expired
    const expiredOrgs = await Organization.find({
      isActive: true,
      isSuspended: false,
      subscriptionStatus: { $in: ['active', 'trialing'] },
      currentPeriodEnd: { $lt: now }
    });

    console.log(`[Billing Cron] Found ${expiredOrgs.length} expired organizations`);

    for (const org of expiredOrgs) {
      try {
        await handleExpiredOrganization(org);
      } catch (error) {
        console.error(`[Billing Cron] Error handling expired org ${org._id}:`, error);
      }
    }
  } catch (error) {
    console.error('[Billing Cron] Error checking expired subscriptions:', error);
  }
};

/**
 * Send expiry reminder to organization admin
 * @param {Object} organization - The organization document
 * @param {number} daysRemaining - Days until expiry
 */
const sendExpiryReminder = async (organization, daysRemaining) => {
  console.log(`[Billing Cron] Sending ${daysRemaining}-day reminder to org: ${organization.name}`);

  // Get organization owner/admin
  const admin = await getOrganizationAdmin(organization._id);
  if (!admin) {
    console.log(`[Billing Cron] No admin found for organization ${organization._id}`);
    return;
  }

  // Get plan details
  const plan = await Plan.findOne({ slug: organization.plan });

  // Create in-app notification
  await Notification.createNotification({
    organizationId: organization._id,
    recipient: admin._id,
    type: 'subscription_expiring_soon',
    title: `Subscription Expiring in ${daysRemaining} Day${daysRemaining > 1 ? 's' : ''}`,
    message: `Your ${plan?.name || 'subscription'} for ${organization.name} will expire in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Renew now to avoid service interruption.`,
    link: '/dashboard/billing',
    metadata: {
      daysRemaining,
      planSlug: organization.plan,
      expiryDate: organization.currentPeriodEnd
    }
  });

  console.log(`[Billing Cron] Created notification for admin ${admin.email}`);

  // Send email reminder
  await sendSubscriptionExpiryReminder(admin, organization, plan, daysRemaining);

  console.log(`[Billing Cron] Reminder sent to ${admin.email} for org ${organization.name}`);
};

/**
 * Handle expired organization - suspend and notify
 * @param {Object} organization - The organization document
 */
const handleExpiredOrganization = async (organization) => {
  console.log(`[Billing Cron] Handling expired organization: ${organization.name}`);

  // Get organization owner/admin
  const admin = await getOrganizationAdmin(organization._id);
  if (!admin) {
    console.log(`[Billing Cron] No admin found for organization ${organization._id}`);
    return;
  }

  // Get plan details before suspension
  const plan = await Plan.findOne({ slug: organization.plan });

  // Suspend the organization
  organization.isSuspended = true;
  organization.suspendedReason = 'Subscription expired';
  organization.subscriptionStatus = 'expired';
  await organization.save();

  console.log(`[Billing Cron] Organization ${organization.name} has been suspended`);

  // Create in-app notification
  await Notification.createNotification({
    organizationId: organization._id,
    recipient: admin._id,
    type: 'subscription_expired',
    title: 'Subscription Expired',
    message: `Your subscription for ${organization.name} has expired. The organization has been suspended. Please renew to restore access.`,
    link: '/dashboard/billing',
    metadata: {
      planSlug: organization.plan,
      suspendedAt: new Date()
    }
  });

  // Update subscription record
  await Subscription.findOneAndUpdate(
    { organizationId: organization._id },
    {
      status: 'expired',
      canceledAt: new Date()
    }
  );

  // Send email notification
  await sendSubscriptionExpiredNotification(admin, organization, plan);

  console.log(`[Billing Cron] Expiry notification sent to ${admin.email} for org ${organization.name}`);
};

/**
 * Get the admin/owner of an organization
 * @param {ObjectId} organizationId - The organization ID
 * @returns {Object|null} - The admin user or null
 */
const getOrganizationAdmin = async (organizationId) => {
  // First try to get the organization owner
  const org = await Organization.findById(organizationId).populate('owner');

  if (org?.owner) {
    return org.owner;
  }

  // Fallback: find admin member
  const adminMembership = await Membership.findOne({
    organizationId,
    role: 'admin',
    status: 'active'
  }).populate('userId');

  return adminMembership?.userId || null;
};

/**
 * Manual trigger for testing (can be called from console or API)
 */
const manualCheck = async () => {
  console.log('[Billing Cron] Manual check triggered');
  await checkSubscriptions();
  console.log('[Billing Cron] Manual check completed');
};

module.exports = {
  initBillingCronJobs,
  checkSubscriptions,
  checkExpiringInDays,
  checkExpiredSubscriptions,
  sendExpiryReminder,
  handleExpiredOrganization,
  manualCheck
};