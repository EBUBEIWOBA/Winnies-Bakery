import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

const MenuApi = {

getAllMenuItems: async () => {
  try {
    console.log('Making request to:', api.defaults.baseURL + '/menu');
    const response = await api.get('/menu');
    console.log('Full API response:', response); // Debug the complete response
    
    // Handle different possible response structures
    if (Array.isArray(response.data)) {
      // Case 1: Direct array response
      console.log('Received direct array of items');
      return response.data;
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      // Case 2: { data: [], ... } structure
      console.log('Received nested data array');
      return response.data.data;
    } else if (response.data?.items && Array.isArray(response.data.items)) {
      // Case 3: { items: [], ... } structure
      console.log('Received items array');
      return response.data.items;
    } else if (response.data?.success && Array.isArray(response.data.data)) {
      // Case 4: { success: true, data: [] } structure
      console.log('Received success with data array');
      return response.data.data;
    }

    console.warn('Unexpected response structure:', response.data);
    return []; // Fallback for unexpected structures
  } catch (error) {
    console.error('Error fetching menu items:', error);
    throw error;
  }
},

  createMenuItem: async (menuItemData) => {
    try {
      const formData = new FormData();
      formData.append('name', menuItemData.name);
      formData.append('description', menuItemData.description);
      formData.append('category', menuItemData.category);
      formData.append('price', menuItemData.price);
      if (menuItemData.image) {
        formData.append('image', menuItemData.image);
      }

      const response = await api.post('/menu', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error creating menu item:', error);
      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to create menu item. Please try again.'
      );
    }
  },

  deleteMenuItem: async (id) => {
    try {
      const response = await api.delete(`/menu/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error deleting menu item:', error);
      throw new Error(
        error.response?.data?.message ||
        'Failed to delete menu item. Please try again.'
      );
    }
  },

  rateMenuItem: async (itemId, userRating) => {
  try {
    const response = await api.post(`/menu/${itemId}/rate`, { userRating });
    return response.data; // or response.data.data if that's your backend format
  } catch (error) {
    console.error('Error rating menu item:', error);
    throw new Error(
      error.response?.data?.message || 'Failed to submit rating'
    );
  }
}
};

export default MenuApi;