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
window.restaurantAPI = {
  // Auth endpoints
  auth: {
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
  },

  // Dashboard endpoints
  dashboard: {
    getStats: async () => {
      return apiCall('/dashboard/stats');
    },
    
    getTodayOrders: async () => {
      return apiCall('/dashboard/orders/today');
    },
    
    getRevenue: async (period = 'today') => {
      return apiCall(`/dashboard/revenue/${period}`);
    },
    
    getPopularItems: async () => {
      return apiCall('/dashboard/popular-items');
    }
  },

  // Menu endpoints
  menu: {
    getAll: async () => {
      return apiCall('/menu');
    },
    
    getById: async (id) => {
      return apiCall(`/menu/${id}`);
    },
    
    getByCategory: async (category) => {
      return apiCall(`/menu/category/${category}`);
    },
    
    create: async (item) => {
      return apiCall('/menu', {
        method: 'POST',
        body: JSON.stringify(item)
      });
    },
    
    update: async (id, item) => {
      return apiCall(`/menu/${id}`, {
        method: 'PUT',
        body: JSON.stringify(item)
      });
    },
    
    delete: async (id) => {
      return apiCall(`/menu/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Orders endpoints
  orders: {
    create: async (order) => {
      return apiCall('/orders', {
        method: 'POST',
        body: JSON.stringify(order)
      });
    },
    
    getById: async (id) => {
      return apiCall(`/orders/${id}`);
    },
    
    getQueue: async () => {
      return apiCall('/orders/queue/all');
    },
    
    updateStatus: async (id, status) => {
      return apiCall(`/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
    },
    
    getByTable: async (tableId) => {
      return apiCall(`/orders/table/${tableId}`);
    }
  },

  // Sessions endpoints
  sessions: {
    create: async (session) => {
      return apiCall('/sessions', {
        method: 'POST',
        body: JSON.stringify(session)
      });
    },
    
    getById: async (sessionId) => {
      return apiCall(`/sessions/${sessionId}`);
    },
    
    getByTable: async (tableId) => {
      return apiCall(`/sessions/table/${tableId}`);
    },
    
    end: async (sessionId) => {
      return apiCall(`/sessions/${sessionId}/end`, {
        method: 'POST'
      });
    }
  },

  // Tables endpoints
  tables: {
    getAll: async () => {
      return apiCall('/tables');
    },
    
    getById: async (id) => {
      return apiCall(`/tables/${id}`);
    },
    
    scan: async (tableNumber) => {
      return apiCall(`/tables/scan/${tableNumber}`, {
        method: 'POST'
      });
    },
    
    reset: async (tableId) => {
      return apiCall(`/tables/reset/${tableId}`, {
        method: 'POST'
      });
    },
    
    updateStatus: async (tableId, status) => {
      return apiCall(`/tables/${tableId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
    }
  }
};

console.log('Restaurant API integration loaded');