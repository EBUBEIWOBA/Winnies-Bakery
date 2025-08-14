//EmployeePanel API
import axios from 'axios';

// Remove '/employee' from base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const validatedApiUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;

const api = axios.create({
  baseURL: validatedApiUrl,  // Now points to /api instead of /api/employee
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(config => {
  let token = localStorage.getItem('employeeToken');

  if (!token) {
    token = document.cookie
      .split('; ')
      .find(row => row.startsWith('employeeToken='))
      ?.split('=')[1];
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const employeeData = JSON.parse(localStorage.getItem('employeeData') || '{}');
  if (employeeData._id) {
    config.headers['x-dev-employee-id'] = employeeData._id;
  }

  return config;
}, error => Promise.reject(error));

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('employeeToken');
      document.cookie = 'employeeToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      window.location = '/employee/login';
    }
    return Promise.reject(error);
  }
);

// Attendance Helper Functions
const normalizeAttendanceRecord = (records) => {
  if (!Array.isArray(records)) {
    console.error('Expected array but received:', records);
    return [];
  }
  
  // Return records directly without normalization
  return records.map(record => {
    return {
      id: record._id || record.id || Date.now().toString(),
      date: record.date || '',
      localDate: record.localDate || record.date || '',
      clockIn: record.clockIn || null,
      clockOut: record.clockOut || null,
      status: record.status || 'pending',
      location: record.location || 'Unknown',
      notes: record.notes || '',
      hoursWorked: parseFloat(record.hoursWorked || 0).toFixed(2),
      lastUpdated: record.lastUpdated ? new Date(record.lastUpdated) : new Date(),
    };
  });
};

const normalizeCorrectionRequest = (correction) => {
  return {
    id: correction._id || correction.id,
    date: correction.date || '',
    type: correction.type || correction.correctionType || '',
    time: correction.time || correction.correctTime || null,
    reason: correction.reason || '',
    status: correction.status || 'pending',
    requestedAt: correction.requestedAt ? new Date(correction.requestedAt) : new Date()
  };
};

const enhanceAttendanceError = (error) => {
  let message = 'Unknown attendance error';
  
  if (error.response) {
    if (error.response.data && error.response.data.message) {
      message = error.response.data.message;
    } else {
      message = `Request failed with status ${error.response.status}`;
    }
  } else if (error.message) {
    message = error.message;
  }
  
  const enhancedError = new Error(message);
  enhancedError.code = error.response?.data?.code || error.code || 'ATTENDANCE_ERROR';
  enhancedError.status = error.response?.status || 500;
  
  return enhancedError;
};

const isValidDate = (date) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date).getTime());
};

const isValidTime = (time) => {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
};

// Auth Api
export const employeeLogin = (credentials) => {
  return api.post('/employee/auth/login', credentials)  // Added /employee prefix
    .then(res => {
      if (res.data.success && res.data.token) {
        localStorage.setItem('employeeToken', res.data.token);
        localStorage.setItem('employeeData', JSON.stringify(res.data.employee));
        return res.data;
      }
      throw new Error(res.data.message || 'Login failed');
    })
    .catch(error => {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Login failed. Please try again.');
    });
};

export const employeeLogout = () => {
  const token = localStorage.getItem('employeeToken');
  return api.post('/employee/auth/logout', {}, {  // Added /employee prefix
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).finally(() => {
    localStorage.removeItem('employeeToken');
  });
};

export const verifyEmail = (token) => {
    token = token.toLowerCase(); // Normalize token case
  return api.get(`/employee/auth/verify-email/${token}`)
    .then(res => {
      console.log('Verification response:', res.data); // Log the response
      if (res.data.success && res.data.token) {
        // Store the token and user data
        localStorage.setItem('employeeToken', res.data.token);
        localStorage.setItem('employeeData', JSON.stringify(res.data.employee));
        return res.data;
      }
      throw new Error(res.data.message || 'Verification failed');
    })
    .catch(error => {
      console.error('Verification API error:', {
        message: error.message,
        response: error.response?.data
      });
      throw error;
    });
};

export const resendVerificationEmail = (email) => {
  return api.post('/employee/auth/resend-verification', { email });  // Added /employee prefix
};

// Updated all endpoints similarly
export const changePassword = async (data) => {
  try {
    const response = await api.put('/employee/auth/password', data);  // Added /employee prefix
    return response;
  } catch (error) {
    const message = error.response?.data?.message ||
      error.message ||
      'Password change failed';
    throw new Error(message);
  }
};

export const forgotPassword = (email) => {
  return api.post('/employee/auth/forgot-password', { email });  // Added /employee prefix
};

export const resetPassword = (token, password) => {
  return api.patch(`/employee/auth/reset-password/${token}`, { password });  // Added /employee prefix
};

// Dashboard API
export const getDashboardData = () =>
  api.get('/employee/panel/dashboard')  // Added /employee prefix
    .then(res => res.data.data)
    .catch(error => {
      throw error;
    });

// Profile API
export const getProfile = async () => {
  try {
    const response = await api.get('/employee/panel/profile');  // Added /employee prefix

    let profileData;
    if (response.data && response.data.data) {
      profileData = response.data.data;
    } else if (response.data) {
      profileData = response.data;
    } else {
      throw new Error('Invalid response structure');
    }

    const processedProfile = {
      ...profileData,
      firstName: profileData.firstName || '',
      lastName: profileData.lastName || '',
      photoUrl: profileData.photoUrl,
      position: profileData.position || 'Employee',
      phone: profileData.phone || '',
      address: profileData.address || '',
      department: profileData.department || '',
      hireDate: profileData.hireDate || null
    };

    localStorage.setItem('employeeProfile', JSON.stringify(processedProfile));
    return processedProfile;
  } catch (error) {
    console.error('Profile fetch error:', error);
    const cached = JSON.parse(localStorage.getItem('employeeProfile'));
    return cached || {
      firstName: '',
      lastName: '',
      email: '',
      position: 'Employee',
      photoUrl: null,
      phone: '',
      address: '',
      department: '',
      hireDate: null
    };
  }
};

export const updateProfile = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const formData = new FormData();

      // Explicitly handle each field
      if (data.phone !== undefined) {
        formData.append('phone', data.phone || '');
      }

      if (data.address !== undefined) {
        formData.append('address', data.address || '');
      }

      if (data.photo instanceof File) {
        formData.append('photo', data.photo);
      }

      // Debugging: Log FormData contents
      for (const [key, value] of formData.entries()) {
        console.log(`FormData: ${key} =`, value);
      }

      const response = await api.put('/employee/panel/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (formData) => formData,
        withCredentials: true,
        params: { _: Date.now() } // Cache buster
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Update failed');
      }

      // Verify the response contains all required fields
      const requiredFields = ['_id', 'firstName', 'lastName', 'email', 'photoUrl'];
      for (const field of requiredFields) {
        if (!response.data.data[field]) {
          console.warn(`Missing field in response: ${field}`);
        }
      }

      resolve(response.data);
    } catch (error) {
      console.error('API Error:', error);
      if (error.response) {
        reject(new Error(error.response.data.message || 'Update failed'));
      } else if (error.request) {
        reject(new Error('No response from server - check network connection'));
      } else {
        reject(new Error('Request setup error: ' + error.message));
      }
    }
  });
};

// Attendance API Service
export const getAttendance = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    // Validate and add filters
    if (params.startDate) {
      queryParams.append('startDate', params.startDate);
    }

    if (params.endDate) {
      queryParams.append('endDate', params.endDate);
    }

    if (params.status) {
      queryParams.append('status', params.status);
    }

    const response = await api.get(`/employee/panel/attendance?${queryParams.toString()}`);
    
    if (!response.data) {
      throw new Error('No attendance data received');
    }

    // Directly return the data without normalization
    return {
      records: response.data.data?.records || [],
      stats: response.data.data?.stats || {},
      pendingCorrections: response.data.data?.pendingCorrections || 0
    };
  } catch (error) {
    console.error('Attendance API Error:', error);
    throw enhanceAttendanceError(error, 'fetch attendance data');
  }
};

export const clockIn = async (locationData, notes = '') => {
    try {
        // Validate location data structure
        if (!locationData || typeof locationData !== 'object') {
            throw new Error('Invalid location data format', { code: 'INVALID_LOCATION_FORMAT' });
        }

        // Destructure with defaults
        const { latitude, longitude } = locationData || {};
        
        // Validate coordinates exist and are numbers
        if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
            isNaN(latitude) || isNaN(longitude)) {
            throw new Error('Valid location coordinates are required', { 
                code: 'LOCATION_REQUIRED',
                details: { received: { latitude, longitude } }
            });
        }

        // Validate coordinates are within reasonable bounds
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new Error('Invalid location coordinates', {
                code: 'INVALID_COORDINATES',
                details: { latitude, longitude }
            });
        }

        const response = await api.post('/employee/panel/attendance/clock-in', {
            location: `Lat:${latitude.toFixed(6)}, Long:${longitude.toFixed(6)}`,
            notes
        });

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Clock-in failed', {
                code: response.data?.code || 'CLOCK_IN_FAILED'
            });
        }

        return {
            ...response.data,
            record: normalizeAttendanceRecord(response.data.data)
        };
    } catch (error) {
        console.error('Clock-in Error:', error);
        throw enhanceAttendanceError(error, 'clock in');
    }
};

export const clockOut = async (notes = '') => {
  try {
    const response = await api.post('/employee/panel/attendance/clock-out', { notes });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Clock-out failed', {
        code: response.data?.code || 'CLOCK_OUT_FAILED'
      });
    }

    return {
      ...response.data,
      record: normalizeAttendanceRecord(response.data.data)
    };
  } catch (error) {
    console.error('Clock-out Error:', error);
    throw enhanceAttendanceError(error, 'clock out');
  }
};

export const requestCorrection = async (data) => {
  try {
    // Validate correction data
    if (!data.date || !isValidDate(data.date)) {
      throw new Error('Valid date is required (YYYY-MM-DD)', { code: 'INVALID_DATE' });
    }

    if (!['clock-in', 'clock-out', 'absence'].includes(data.type)) {
      throw new Error('Invalid correction type', { code: 'INVALID_CORRECTION_TYPE' });
    }

    if (data.type !== 'absence' && (!data.time || !isValidTime(data.time))) {
      throw new Error('Valid time is required (HH:mm)', { code: 'INVALID_TIME' });
    }

    if (!data.reason || data.reason.trim().length < 10) {
      throw new Error('Reason must be at least 10 characters', { code: 'INVALID_REASON' });
    }

    const response = await api.post('/employee/panel/attendance/correction', {
      date: data.date,
      correctionType: data.type,
      correctTime: data.time,
      reason: data.reason
    });

    return {
      ...response.data,
      correction: normalizeCorrectionRequest(response.data.data)
    };
  } catch (error) {
    console.error('Correction Request Error:', error);
    throw enhanceAttendanceError(error, 'submit correction request');
  }
};


// LeaveAPI
export const getLeaves = (params) =>
  api.get('/employee/panel/leaves', { params }) // Removed extra '/employee'
    .then(response => response.data)
    .catch(error => {
      throw new Error(
        error.response?.data?.message ||
        'Failed to fetch leave requests'
      );
    });

export const applyLeave = (data) =>
  api.post('/employee/panel/leaves', data) // Removed extra '/employee'
    .then(response => response.data)
    .catch(error => {
      throw new Error(
        error.response?.data?.message ||
        'Failed to submit leave request'
      );
    });

export const cancelLeaveRequest = (id) =>
  api.delete(`/employee/panel/leaves/${id}`) // Removed extra '/employee'
    .then(response => response.data)
    .catch(error => {
      throw new Error(
        error.response?.data?.message ||
        'Failed to cancel leave request'
      );
    });

//Schedule API
export const getSchedule = (params) =>
  api.get('/employee/panel/schedules', { params })
    .then(res => res.data.data)
    .catch(error => {
      console.error('API Error (getSchedule):', error);
      throw error;
    });

export const getUpcomingSchedule = (params = {}) =>
  api.get('/employee/panel/schedules/upcoming')
    .then(res => res.data.data)
    .catch(error => {
      console.error('API Error (getUpcomingSchedule):', error);
      throw error;
    });

const employeePanelApi = {
  getDashboardData,
  getProfile,
  updateProfile,
  employeeLogin,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  changePassword,
  getAttendance,
  clockIn,
  clockOut,
  requestCorrection,
  applyLeave,
  cancelLeaveRequest,
  getSchedule,
  getUpcomingSchedule,
};

export default employeePanelApi;