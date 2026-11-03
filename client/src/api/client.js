import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true
});

// Attach appropriate token based on route
api.interceptors.request.use((config) => {
  const customerToken = localStorage.getItem('tc_customer_token');
  const adminToken = localStorage.getItem('tc_admin_token');

  // Admin routes always get adminToken
  if (config.url?.startsWith('/admin') || config.url?.includes('/admin/') || config.url?.startsWith('/dashboard') || config.url?.startsWith('/settings') || config.url?.startsWith('/activity') || config.url?.startsWith('/customers')) {
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
  } else if (customerToken) {
    // Customer routes (including /orders, /me, /requests) get customerToken
    config.headers.Authorization = `Bearer ${customerToken}`;
  } else if (adminToken && config.method === 'get' && config.url?.startsWith('/orders')) {
    // Admin viewing orders list
    config.headers.Authorization = `Bearer ${adminToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standard error formatting
    const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;

