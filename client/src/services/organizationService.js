import api from './api';

const organizationService = {
  // Get all organizations for current user
  getOrganizations: async () => {
    const response = await api.get('/organizations');
    return response.data;
  },

  // Get current organization
  getCurrentOrganization: async () => {
    const response = await api.get('/organizations/current');
    return response.data;
  },

  // Create organization - returns full response with success field
  createOrganization: async (data) => {
    const response = await api.post('/organizations', data);
    return response; // Return full response (includes success, message, data)
  },

  // Get available plans
  getPlans: async () => {
    const response = await api.get('/organizations/plans');
    return response.data;
  },

  // Switch organization
  switchOrganization: async (organizationId) => {
    const response = await api.put(`/organizations/${organizationId}/switch`);
    return response.data;
  },

  // Update organization
  updateOrganization: async (organizationId, data) => {
    const response = await api.put(`/organizations/${organizationId}`, data);
    return response.data;
  },

  // Get organization members
  getMembers: async (organizationId) => {
    const response = await api.get(`/organizations/${organizationId}/members`);
    return response.data;
  },

  // Invite member
  inviteMember: async (organizationId, data) => {
    const response = await api.post(`/organizations/${organizationId}/invite`, data);
    return response.data;
  },

  // Accept invitation
  acceptInvitation: async (token) => {
    const response = await api.post(`/organizations/invitations/accept/${token}`);
    return response.data;
  },

  // Get organization usage
  getUsage: async (organizationId) => {
    const response = await api.get(`/organizations/${organizationId}/usage`);
    return response.data;
  },
};

export default organizationService;