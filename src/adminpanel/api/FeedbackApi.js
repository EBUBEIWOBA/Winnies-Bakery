import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/feedback`
  : 'http://localhost:5000/api/feedback'; 

const api = axios.create({
  baseURL: API_URL,
 timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true,
  validateStatus: function (status) {
    return status < 500; // Consider all status codes < 500 as success
  }
});

api.interceptors.request.use(config => {
  if (config.data) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// response interceptor
api.interceptors.response.use(response => {
  return response;
}, error => {
  if (error.code === 'ECONNABORTED') {
    return Promise.reject({ 
      message: 'Request timeout - please try again later' 
    });
  }
  return Promise.reject(error);
});

// Enhanced error handling
const handleRequest = async (request) => {
  try {
    const response = await request;
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    console.error('API Error:', error);
    
    if (error.response) {
      // Handle different error response formats
      const errorMessage = error.response.data?.message 
        || error.response.data?.error?.message
        || error.response.data?.error
        || error.response.data?.data?.message
        || 'Request failed';
      
      return {
        success: false,
        error: errorMessage,
        status: error.response.status,
        data: error.response.data
      };
    } 
    
    if (error.request) {
      return {
        success: false,
        error: 'No response from server - the request was made but no response was received',
        status: 0
      };
    }
    
    return {
      success: false,
      error: error.message || 'Network error',
      status: 0
    };
  }
};

export const getFeedbackList = async (params = {}) => {
  const config = {
    params: {
      ...params,
      page: params.page || 1,
      limit: params.limit || 10
    }
  };
  
  try {
    const response = await api.get('/', config);
    
    // Transform the response to match frontend expectations
    return {
      success: true,
      data: {
        feedback: response.data.data || response.data, // Handle both formats
        total: response.data.total || response.headers['x-total-count'] || response.data.length
      },
      status: response.status
    };
  } catch (error) {
    return handleRequest(Promise.reject(error));
  }
};

export const getFeedbackDetails = async (id) => {
  if (!id) {
    return {
      success: false,
      error: 'No feedback ID provided',
      status: 400
    };
  }
  return handleRequest(api.get(`/${id}`));
};

export const createFeedback = async (feedbackData) => {
  if (!feedbackData) {
    return {
      success: false,
      error: 'No feedback data provided',
      status: 400
    };
  }
  return handleRequest(api.post('', feedbackData));
};

export const updateFeedback = async (id, updateData) => {
  if (!id) {
    return {
      success: false,
      error: 'No feedback ID provided',
      status: 400
    };
  }

  try {
    const response = await api.patch(`/${id}`, updateData);
    
    if (response.status === 404) {
      return {
        success: false,
        error: 'Feedback not found',
        status: 404
      };
    }

    return {
      success: response.status < 300,
      data: response.data,
      status: response.status,
      error: response.status >= 300 ? (response.data?.message || 'Update failed') : null
    };
  } catch (error) {
    let errorMessage = 'Network error';
    if (error.response) {
      errorMessage = error.response.data?.message || 'Request failed';
    } else if (error.request) {
      errorMessage = 'No response from server';
    }

    return {
      success: false,
      error: errorMessage,
      status: error.response?.status || 0
    };
  }
};

export const deleteFeedback = async (id) => {
  if (!id) {
    return {
      success: false,
      error: 'No feedback ID provided',
      status: 400
    };
  }
  return handleRequest(api.delete(`/${id}`));
};

export const getFeedbackStats = async () => {
  return handleRequest(api.get('/stats'));
};