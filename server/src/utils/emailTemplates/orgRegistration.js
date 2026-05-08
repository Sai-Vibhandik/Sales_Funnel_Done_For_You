const baseTemplate = require('./baseTemplate');
const { buildUrl } = require('../urlHelper');

/**
 * Organization Registration Email Template
 * Sent to platform admins when a new organization is created
 */

const orgRegistrationTemplate = (organization, owner, plan) => {
  const planName = plan?.displayName || plan?.name || organization.planName || 'Free';
  const billingCycle = organization.billingCycle || 'monthly';

  const content = `
    <p class="greeting">Dear Admin Team,</p>
    <p>A new organization has been registered on Growth Valley. Please find the details below:</p>

    <div class="info-table">
      <div class="info-table-header">Organization Information</div>

      <div class="info-row">
        <span class="info-label">Organization</span>
        <span class="info-value info-value-highlight">${organization.name}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Slug</span>
        <span class="info-value">${organization.slug}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Owner Name</span>
        <span class="info-value">${owner.name}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Owner Email</span>
        <span class="info-value">${owner.email}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Selected Plan</span>
        <span class="info-value">${planName}${billingCycle === 'yearly' ? ' (Yearly)' : ' (Monthly)'}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Registered</span>
        <span class="info-value">${new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      ${organization.description ? `
      <div class="info-row">
        <span class="info-label">Description</span>
        <span class="info-value">${organization.description}</span>
      </div>
      ` : ''}
    </div>

    <div class="button-wrapper">
      <a href="${buildUrl('/admin')}" class="primary-button">View in Admin Dashboard</a>
    </div>

    <hr class="divider">

    <p class="text-center text-muted text-small">
      This is an automated notification from the Growth Valley platform.
    </p>
  `;

  return {
    subject: `New Organization: ${organization.name} - Growth Valley`,
    html: baseTemplate(content, { title: 'Organization Registration' })
  };
};

module.exports = orgRegistrationTemplate;