// stockApi.js (fixed)
import axios from 'axios';

const api = axios.create({
  baseURL: (process.env.REACT_APP_API_URL || 'http://localhost:5000/api') + '/stock',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      const message = error.response.data?.message ||
        error.response.data?.error ||
        `Request failed with status ${error.response.status}`;
      return Promise.reject(new Error(message));
    } else if (error.request) {
      return Promise.reject(new Error('Network error: No response from server'));
    } else {
      return Promise.reject(new Error(error.message));
    }
  }
);

// API methods
export const getStockItems = async () => {
  try {
    const response = await api.get('/');
    return response.data;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch stock items');
  }
};

export const getLowStockItems = async () => {
  try {
    const response = await api.get('/low-stock');
    return response.data;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch low stock items');
  }
};

export const createStockItem = async (itemData) => {
  try {
    const response = await api.post('/', itemData);

    // Handle successful response
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }

    // Handle error response
    const error = new Error(response.data?.message || 'Create failed');
    error.response = response;
    throw error;

  } catch (error) {
    // Extract meaningful error message
    let message = 'Failed to create item';

    if (error.response) {
      message = error.response.data?.message ||
        error.response.data?.error ||
        error.response.statusText;
    } else if (error.message) {
      message = error.message;
    }

    throw new Error(message);
  }
};

export const recordMovement = async (movementData) => {
  try {
    const response = await api.post('/movement', movementData);
    return response.data;
  } catch (error) {
    throw new Error(error.message || 'Failed to Record Stock Movement');
  }
};

export const updateStockItem = async (itemId, updateData) => {
  try {
    const response = await api.patch(`/${itemId}`, updateData);
    return response.data;
  } catch (error) {
    throw new Error(error.message || 'Failed to Update Stock items');
  }
};

export const deleteStockItem = async (itemId) => {
  try {
    const response = await api.delete(`/${itemId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.message || 'Failed to Delte Stock ttems');
  }
};

export const getStockMovementHistory = async (itemId) => {
  try {
    const response = await api.get(`/history/${itemId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

const stockApi = {
  getStockItems,
  getLowStockItems,
  createStockItem,
  recordMovement,
  updateStockItem,
  deleteStockItem,
  getStockMovementHistory
};

export default stockApi;