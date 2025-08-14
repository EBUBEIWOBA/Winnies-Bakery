// src/adminpanel/api/adminApi.js
import axios from 'axios';

const api = axios.create({
  baseURL: (process.env.REACT_APP_API_URL || 'http://localhost:5000/api') + '/admin/auth',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Request interceptor for auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

// Response interceptor for error handling
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

// Authentication functions
export const adminLogin = async (credentials) => {
  try {
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required');
    }
    const response = await api.post('/login', credentials); // Changed from '/auth/login'
    localStorage.setItem('adminToken', response.token);
    localStorage.setItem('adminData', JSON.stringify(response.admin));
    return response;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const adminLogout = async () => {
  try {
    await api.post('/logout'); // Changed from '/auth/logout'
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false };
  }
};

export const forgotPassword = async (data) => {
  try {
    const response = await api.post('/forgot-password', {
      email: data.email
    });
    return response.data;
  } catch (error) {
    console.error('Forgot password error:', error);
    const formattedError = {
      message: error.response?.data?.message || error.message || 'Password reset failed',
      code: error.response?.data?.code || 'UNKNOWN_ERROR'
    };
    throw formattedError;
  }
};

export const resetPassword = async (data) => {
  try {
    const response = await api.patch(`/reset-password/${data.token}`, {
      password: data.password
    });
    return response.data;
  } catch (error) {
    console.error('Reset password error:', error);
    const formattedError = {
      message: error.response?.data?.message || error.message || 'Password reset failed',
      code: error.response?.data?.code || 'UNKNOWN_ERROR'
    };
    throw formattedError;
  }
};

export const adminRegister = async (data) => {
  try {
    const response = await api.post('/register', {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      position: data.position,
      department: data.department,
      password: data.password
    });

    return response.data;
  } catch (error) {
    console.error('Registration error:', error);

    // Extract error message from response
    const errorData = error.response?.data || {};
    const message = errorData.message || 'Registration failed';
    const code = errorData.code || 'UNKNOWN_ERROR';

    throw new Error(message, { cause: { code } });
  }
};

export const verifyAdminSession = async () => {
  try {
    const response = await api.get('/verify');
    if (response.data?.success) { // Handle nested response
      localStorage.setItem('adminData', JSON.stringify(response.data.admin));
      return response.data;
    }
    return { success: false };
  } catch (error) {
    return { success: false };
  }
};

//updateAdminProfile API
export const getAdmins = async () => {
  try {
    const response = await api.get('/admins');
    return response; // Return response data directly
  } catch (error) {
    console.error('Failed to fetch admins:', error);
    throw error;
  }
};

export const updateAdminProfile = async (formData) => {
  try {
    const response = await api.put('/updateProfile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response; // Return the full response object
  } catch (error) {
    console.error('Profile update error:', error);

    // Enhanced error formatting
    const errorMessage = error.response?.data?.message ||
      error.message ||
      'Profile update failed';

    const formattedError = new Error(errorMessage);
    formattedError.response = error.response;

    throw formattedError;
  }
};

export const updateAdminPassword = async (passwordData) => {
  try {
    const response = await api.put('/password', passwordData);
    // Update token in storage
    if (response.token) {
      localStorage.setItem('adminToken', response.token);
    }

    return response;
  } catch (error) {
    console.error('Password update error:', error);

    const errorMessage = error.response?.data?.message ||
      error.message ||
      'Password update failed';

    throw new Error(errorMessage);
  }
};

export const updateAdminSettings = async (settings) => {
  try {
    const response = await api.put('/settings', settings); // Changed from '/auth/preferences'
    return response;
  } catch (error) {
    console.error('Settings update error:', error);
    throw error;
  }
};

