const baseTemplate = require('./baseTemplate');
const { buildUrl } = require('../urlHelper');

/**
 * Billing Reminder Email Template
 * Sent when a subscription is about to expire or has expired
 */

/**
 * Generate expiry reminder email
 * @param {Object} user - The user receiving the email
 * @param {Object} organization - The organization
 * @param {Object} plan - The current plan
 * @param {number} daysRemaining - Days until expiry
 * @returns {Object} - Email subject and HTML
 */
const expiryReminderTemplate = (user, organization, plan, daysRemaining) => {
  const billingUrl = buildUrl('/dashboard/billing');
  const expiryDate = organization.currentPeriodEnd
    ? new Date(organization.currentPeriodEnd).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'soon';

  const planName = plan?.name || organization.planName || 'Your Plan';
  const billingPeriod = organization.billingPeriod || 'monthly';

  // Determine urgency level
  const isUrgent = daysRemaining <= 1;
  const isWarning = daysRemaining <= 5;

  const title = isUrgent
    ? 'Subscription Expires Tomorrow!'
    : `Subscription Expiring in ${daysRemaining} Days`;

  const content = `
    <p class="greeting">Dear ${user.name},</p>

    <p>Your <strong>${planName}</strong> subscription${billingPeriod === 'yearly' ? ' (Annual)' : ''} for <strong>${organization.name}</strong> will expire in <strong>${daysRemaining} day${daysRemaining > 1 ? 's' : ''}</strong>.</p>

    <div class="info-table">
      <div class="info-table-header">Subscription Details</div>

      <div class="info-row">
        <span class="info-label">Plan</span>
        <span class="info-value info-value-highlight">${planName}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Billing Cycle</span>
        <span class="info-value">${billingPeriod === 'yearly' ? 'Annual' : 'Monthly'}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Expires On</span>
        <span class="info-value">${expiryDate}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Days Remaining</span>
        <span class="info-value ${isUrgent ? 'text-danger' : isWarning ? 'text-warning' : ''}">${daysRemaining} day${daysRemaining > 1 ? 's' : ''}</span>
      </div>
    </div>

    ${isUrgent ? `
    <div class="alert alert-error">
      <div class="alert-title">Action Required Immediately</div>
      <p>Your subscription expires tomorrow. Renew now to avoid service interruption.</p>
    </div>
    ` : isWarning ? `
    <div class="alert alert-warning">
      <div class="alert-title">Renewal Reminder</div>
      <p>Don't forget to renew your subscription to continue enjoying all features.</p>
    </div>
    ` : ''}

    <p>To ensure uninterrupted access to all features, please renew your subscription before the expiry date.</p>

    <div class="button-wrapper">
      <a href="${billingUrl}" class="primary-button">
        Renew Subscription
      </a>
    </div>

    <hr class="divider">

    <p class="text-center text-muted text-small">
      Manage your subscription in the <a href="${billingUrl}" class="secondary-link">Billing Dashboard</a>
    </p>
  `;

  return {
    subject: `${title} - Growth Valley`,
    html: baseTemplate(content, { title })
  };
};

/**
 * Generate subscription expired email
 * @param {Object} user - The user receiving the email
 * @param {Object} organization - The organization
 * @param {Object} plan - The expired plan
 * @returns {Object} - Email subject and HTML
 */
const subscriptionExpiredTemplate = (user, organization, plan) => {
  const billingUrl = buildUrl('/dashboard/billing');
  const planName = plan?.name || organization.planName || 'Your Plan';

  const title = 'Subscription Expired';

  const content = `
    <p class="greeting">Dear ${user.name},</p>

    <p>Your <strong>${planName}</strong> subscription for <strong>${organization.name}</strong> has expired.</p>

    <div class="alert alert-error">
      <div class="alert-title">Organization Suspended</div>
      <p>Your organization has been temporarily suspended due to subscription expiry. Team members will not be able to access projects or create new content until the subscription is renewed.</p>
    </div>

    <div class="info-table">
      <div class="info-table-header">Expired Subscription</div>

      <div class="info-row">
        <span class="info-label">Plan</span>
        <span class="info-value info-value-highlight">${planName}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Organization</span>
        <span class="info-value">${organization.name}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Status</span>
        <span class="info-value text-danger">Expired</span>
      </div>
    </div>

    <p>To restore access to your organization and continue using all features, please renew your subscription.</p>

    <div class="button-wrapper">
      <a href="${billingUrl}" class="primary-button">
        Renew Now
      </a>
    </div>

    <hr class="divider">

    <p class="text-center text-muted text-small">
      If you have any questions, please contact our <a href="${buildUrl('/support')}" class="secondary-link">support team</a>
    </p>
  `;

  return {
    subject: `${title} - ${organization.name} - Growth Valley`,
    html: baseTemplate(content, { title })
  };
};

module.exports = {
  expiryReminderTemplate,
  subscriptionExpiredTemplate
};