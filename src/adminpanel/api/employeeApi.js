//In the EmployeeAPI
import { format } from 'date-fns';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config
}, error => Promise.reject(error));

// Enhanced API calls with AbortController
const createApiCall = (axiosCall) => {
  const controller = new AbortController();
  const request = axiosCall(controller);
  request.cancel = () => controller.abort();
  return request;
};

const setAuthToken = token => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Employee API Methods
const getEmployees = async (params = {}) => {
  return createApiCall((controller) =>
    api.get('/employees', { params, signal: controller.signal })
      .then(res => res.data.data || [])
      .catch(error => {
        if (axios.isCancel(error)) {
          throw new Error('Request canceled');
        }
        throw new Error(
          error.response?.data?.message ||
          error.message ||
          'Failed to fetch employees'
        );
      })
  );
};

const getEmployeeById = async (id) => {
  return createApiCall((controller) =>
    api.get(`/employees/${id}`, { signal: controller.signal })
      .then(res => res.data.data)
      .catch(error => {
        if (axios.isCancel(error)) {
          throw new Error('Request canceled');
        }
        throw new Error(
          error.response?.data?.message ||
          error.message ||
          'Failed to fetch employee by ID'
        );
      })
  );
};

const createEmployee = async (formData) => {
  try {
    const response = await api.post('/employees', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    const errorData = error.response?.data || {};
    const errorMessage = errorData.message || 'Failed to create employee';
    const validationErrors = errorData.errors || [];

    // Format validation errors if they exist
    let formattedErrors = errorMessage;
    if (validationErrors.length > 0 || typeof validationErrors === 'object') {
      const errors = Array.isArray(validationErrors) 
        ? validationErrors 
        : Object.values(validationErrors).map(err => err.message || err);
      formattedErrors = errors.join(', ');
    }

    throw new Error(formattedErrors);
  }
};

const uploadPhoto = async (id, photoFile) => {
  try {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid employee ID');
    }

    const formData = new FormData();
    formData.append('photo', photoFile);

    const response = await api.post(`/employees/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000
    });

    
    return response.data;
  } catch (error) {
    let errorMessage = 'Failed to upload photo';
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
};

const updateEmployee = async (id, employeeData, photoFile = null) => {
  try { 
    const formData = new FormData();
    
    // Append all non-photo fields
    Object.entries(employeeData).forEach(([key, value]) => {
      if (key !== 'photo' && value !== undefined) {
        formData.append(key, value);
      }
    });

    // Handle photo removal
    if (employeeData.photo === null) {
      formData.append('photo', '');
    }

    // Append new photo if provided
    if (photoFile) {
      formData.append('photo', photoFile);
    }

    const response = await api.put(`/employees/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    return response.data;
  } catch (error) {
    let errorMessage = 'Failed to update employee';
    
    if (error.response) {
      if (error.response.data?.errors) {
        const errors = Object.values(error.response.data.errors)
          .map(err => err.message || err)
          .join(', ');
        errorMessage = `Validation errors: ${errors}`;
      } else if (error.response.data?.message) {
        errorMessage = error.response.data.message;
      } else {
        errorMessage = error.response.statusText || errorMessage;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
};

const deleteEmployee = async (id) => {
  try {
    await api.delete(`/employees/${id}`);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete employee');
  }
};

// Shift Management API Methods
const getEmployeeShifts = async (employeeId) => {
  try {
    const response = await api.get(`/shifts/employee/${employeeId}`);
    return {
      success: true,
      data: response.data.data || response.data
    };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch employee shifts');
  }
};

const getAllShifts = async (params = {}) => {
  try {
    const response = await api.get('/employees/shifts', {
      params: {
        ...params,
        startDate: params.startDate ? format(new Date(params.startDate), 'yyyy-MM-dd') : undefined,
        endDate: params.endDate ? format(new Date(params.endDate), 'yyyy-MM-dd') : undefined
      }
    });
    return {
      success: true,
      data: response.data.data || response.data
    };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch shifts');
  }
};

const createShift = async (shiftData) => {
  try {
    const payload = {
      employeeId: shiftData.employeeId || shiftData.employee, // Use employeeId consistently
      employeeName: shiftData.employeeName,
      position: shiftData.position,
      startDate: shiftData.startDate || shiftData.date,
      endDate: shiftData.endDate || shiftData.date,
      startTime: shiftData.startTime,
      endTime: shiftData.endTime,
      location: shiftData.location || 'Main Bakery',
      notes: shiftData.notes,
      status: shiftData.status || 'scheduled'
    };

    // Remove date formatting - let backend handle it
    const response = await api.post('/employees/shifts', payload);
    return response.data;
  } catch (error) {
    let errorMessage = 'Failed to create shift';

    if (error.response) {
      if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.data.missing) {
        errorMessage = `Missing fields: ${error.response.data.missing.join(', ')}`;
      }
    }

    throw new Error(errorMessage);
  }
};

const deleteShift = async (shiftId) => {
  try {
    const response = await api.delete(`/employees/shifts/${shiftId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete shift');
  }
};

const updateShiftStatus = async (shiftId, status) => {
  try {
    const response = await api.put(`/employees/shifts/${shiftId}/status`, { status });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update shift status');
  }
};

// Attendance API Methods
const recordAttendance = async (employeeId, attendanceData) => {
  try {
    // FIX: Proper payload formatting
    const payload = {
      date: attendanceData.date,
      clockIn: attendanceData.clockIn || undefined, // Use undefined for empty
      clockOut: attendanceData.clockOut || undefined,
      notes: attendanceData.notes || undefined
    };

    // Remove empty values
    Object.keys(payload).forEach(key =>
      payload[key] === undefined && delete payload[key]
    );

    const response = await api.post(
      `/employees/${employeeId}/attendance`,
      payload
    );

    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Failed to record attendance';

    throw new Error(errorMessage);
  }
};

const getAllAttendance = async (params = {}) => {
  try {
    // Convert date parameters to ISO strings
    const formattedParams = {};
    for (const key in params) {
      if (params[key] !== undefined) {
        if (key === 'startDate' || key === 'endDate') {
          // Convert to ISO string without time component
          formattedParams[key] = new Date(params[key]).toISOString().split('T')[0];
        } else {
          formattedParams[key] = params[key];
        }
      }
    }

    const response = await api.get('/employees/attendance/all', {
      params: formattedParams
    });

    return response.data.data || response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
      'Failed to fetch attendance records'
    );
  }
};

const deleteAttendanceRecord = async (employeeId, attendanceId) => {
  try {
    // FIX: Validate IDs before request
    if (!employeeId || !attendanceId) {
      throw new Error('Both employee ID and attendance ID are required');
    }

    const response = await api.delete(
      `/employees/${employeeId}/attendance/${attendanceId}`
    );
    return response.data;
  } catch (error) {
    const serverMessage = error.response?.data?.message;
    throw new Error(serverMessage || 'Failed to delete attendance record');
  }
};

// Leave Management API Methods
const getAllLeaveRequests = async (params = {}) => {
  const MAX_RETRIES = 2;
  let retryCount = 0;

  const executeRequest = async () => {
    try {
      const response = await api.get('/employees/leaves/all', { params });
      return response.data.data || response.data;
    } catch (error) {
      if (error.response?.status === 429 && retryCount < MAX_RETRIES) {
        const retryAfter = error.response.headers['retry-after'] || 1;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        retryCount++;
        return executeRequest();
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch leave requests');
    }
  };

  return executeRequest();
};

const createLeaveRequest = async (employeeId, leaveData) => {
  try {
    const response = await api.post(`/employees/${employeeId}/leaves`, {
      type: leaveData.type,
      startDate: leaveData.startDate,
      endDate: leaveData.endDate,
      notes: leaveData.notes
    });
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
      'Failed to create leave request'
    );
  }
};

const updateLeaveStatus = async (leaveId, status) => {
  try {
    const response = await api.patch(`/employees/leaves/${leaveId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('API Leave status update error:', {
      error: error.response?.data || error.message,
      leaveId,
      status
    });
    throw new Error(
      error.response?.data?.message ||
      'Failed to update leave status. Please try again.'
    );
  }
};

const employeeApi = {
  setAuthToken,
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  uploadPhoto,
  getAllShifts,
  createShift,
  deleteShift,
  updateShiftStatus,
  getEmployeeShifts,
  recordAttendance,
  getAllAttendance,
  deleteAttendanceRecord,
  getAllLeaveRequests,
  createLeaveRequest,
  updateLeaveStatus
};

export default employeeApi;