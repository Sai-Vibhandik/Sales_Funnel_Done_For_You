// Platform Admin API Service
// For platform-wide management (super admin functionality)

import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api` //|| 'http://localhost:5000/api',
  ,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || { message });
  }
);

export const platformAdminService = {
  // Platform Statistics
  getStats: () => api.get('/platform/stats'),

  // Organizations Management
  getOrganizations: (params) => api.get('/platform/organizations', { params }),
  getOrganization: (id) => api.get(`/platform/organizations/${id}`),
  suspendOrganization: (id, data) => api.put(`/platform/organizations/${id}/suspend`, data),
  deleteOrganization: (id) => api.delete(`/platform/organizations/${id}`),
  updateOrganizationLimits: (id, limits) => api.put(`/platform/organizations/${id}/limits`, { limits }),

  // Users Management
  getUsers: (params) => api.get('/platform/users', { params }),
  getUsersGroupedByOrg: (params) => api.get('/platform/users', { params: { ...params, groupByOrg: true } }),
  updateUserRole: (id, data) => api.put(`/platform/users/${id}/role`, data),

  // Pricing Plans Management
  getPlans: () => api.get('/platform/plans'),
  createPlan: (data) => api.post('/platform/plans', data),
  updatePlan: (id, data) => api.put(`/platform/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/platform/plans/${id}`),

  // System Prompts Management
  getPrompts: (params) => api.get('/platform/prompts', { params }),
  createPrompt: (data) => api.post('/platform/prompts', data),
  updatePrompt: (id, data) => api.put(`/platform/prompts/${id}`, data),
  deletePrompt: (id) => api.delete(`/platform/prompts/${id}`),

  // Activity Logs
  getLogs: (params) => api.get('/platform/logs', { params }),
};

export default platformAdminService;