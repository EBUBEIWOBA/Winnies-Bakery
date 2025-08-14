//In the dashboardAPi
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  withCredentials: true
});

// Request interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

// Response interceptor
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      window.location = '/admin/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Create a named object
const dashboardApi = {
  getDashboardStats: async () => {
    try {
      const response = await api.get('/dashboard/stats');
      return response;
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      throw error;
    }
  }
};

export default dashboardApi;