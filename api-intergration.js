// API Integration for Restaurant System
const API_BASE_URL = 'http://localhost:3000/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// API object
window.restaurantAPI = window.restaurantAPI || {};

window.restaurantAPI.auth = {
  login: async (username, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },
  getMe: async (token) => {
    return apiCall('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};

window.restaurantAPI.dashboard = {
  getStats: async () => apiCall('/dashboard/stats'),
  getTodayOrders: async () => apiCall('/dashboard/orders/today'),
  getRevenue: async (period = 'today') => apiCall(`/dashboard/revenue/${period}`),
  getPopularItems: async () => apiCall('/dashboard/popular-items')
};

window.restaurantAPI.menu = {
  getAll: async () => apiCall('/menu'),
  getById: async (id) => apiCall(`/menu/${id}`),
  getByCategory: async (category) => apiCall(`/menu/category/${category}`),
  create: async (item) => apiCall('/menu', { method: 'POST', body: JSON.stringify(item) }),
  update: async (id, item) => apiCall(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
  delete: async (id) => apiCall(`/menu/${id}`, { method: 'DELETE' })
};

window.restaurantAPI.orders = {
  create: async (order) => apiCall('/orders', { method: 'POST', body: JSON.stringify(order) }),
  getById: async (id) => apiCall(`/orders/${id}`),
  getQueue: async () => apiCall('/orders/queue/all'),
  updateStatus: async (id, status) => apiCall(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getByTable: async (tableId) => apiCall(`/orders/table/${tableId}`)
};

window.restaurantAPI.sessions = {
  create: async (session) => apiCall('/sessions', { method: 'POST', body: JSON.stringify(session) }),
  getById: async (sessionId) => apiCall(`/sessions/${sessionId}`),
  getByTable: async (tableId) => apiCall(`/sessions/table/${tableId}`),
  end: async (sessionId) => apiCall(`/sessions/${sessionId}/end`, { method: 'POST' })
};

window.restaurantAPI.tables = {
  getAll: async () => apiCall('/tables/all')
};

console.log('Restaurant API integration loaded');