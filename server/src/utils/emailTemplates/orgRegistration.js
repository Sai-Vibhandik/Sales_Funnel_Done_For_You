const baseTemplate = require('./baseTemplate');

/**
 * Organization Registration Email Template
 * Sent to platform admins when a new organization is created
 */

const orgRegistrationTemplate = (organization, owner, plan) => {
  const planName = plan?.displayName || plan?.name || organization.planName || 'Free';
  const billingCycle = organization.billingCycle || 'monthly';

  const content = `
    <h2>New Organization Registered</h2>
    <p>A new organization has been registered on Growth Valley. Here are the details:</p>

    <div class="details">
      <div class="details-item">
        <span class="details-label">Organization:</span>
        <span class="details-value">${organization.name}</span>
      </div>
      <div class="details-item">
        <span class="details-label">Slug:</span>
        <span class="details-value">${organization.slug}</span>
      </div>
      <div class="details-item">
        <span class="details-label">Owner:</span>
        <span class="details-value">${owner.name}</span>
      </div>
      <div class="details-item">
        <span class="details-label">Owner Email:</span>
        <span class="details-value">${owner.email}</span>
      </div>
      <div class="details-item">
        <span class="details-label">Selected Plan:</span>
        <span class="details-value">${planName}${billingCycle === 'yearly' ? ' (Yearly)' : ' (Monthly)'}</span>
      </div>
      <div class="details-item">
        <span class="details-label">Registered:</span>
        <span class="details-value">${new Date().toLocaleString()}</span>
      </div>
      ${organization.description ? `
      <div class="details-item">
        <span class="details-label">Description:</span>
        <span class="details-value">${organization.description}</span>
      </div>
      ` : ''}
    </div>

    <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
      You can view more details in the <a href="${process.env.FRONTEND_URL || 'https://growthvalley.com'}/admin" style="color: #4F46E5;">Admin Dashboard</a>.
    </p>
  `;

  return {
    subject: `New Organization: ${organization.name} - Growth Valley`,
    html: baseTemplate(content, { title: 'Growth Valley' })
  };
};

module.exports = orgRegistrationTemplate;