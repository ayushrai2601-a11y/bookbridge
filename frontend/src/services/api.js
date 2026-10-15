const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // essential for Flask-Login session cookies
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.message || `Request failed with status ${res.status}`;
      const error = new Error(errorMsg);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Auth
  auth: {
    me: () => request('/auth/me'),
    login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
    register: (userData) => request('/auth/register', { method: 'POST', body: userData }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: data }),
    changePassword: (data) => request('/auth/password', { method: 'PUT', body: data }),
  },

  // Stats
  stats: {
    getPublic: () => request('/stats/public'),
  },

  // Books
  books: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/books?${query}`);
    },
    get: (id) => request(`/books/${id}`),
    create: (data) => request('/books', { method: 'POST', body: data }),
    update: (id, data) => request(`/books/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/books/${id}`, { method: 'DELETE' }),
    addCopy: (bookId, data) => request(`/books/${bookId}/copies`, { method: 'POST', body: data }),
    deleteCopy: (copyId) => request(`/books/copies/${copyId}`, { method: 'DELETE' }),
  },

  // Categories
  categories: {
    list: () => request('/categories'),
    create: (data) => request('/categories', { method: 'POST', body: data }),
  },

  // Borrowings
  borrowings: {
    getRequests: (all = false) => request(`/borrowings/requests?all=${all}`),
    getTransactions: (all = false, status = '') => request(`/borrowings/transactions?all=${all}${status ? `&status=${status}` : ''}`),
    requestBorrow: (data) => request('/borrowings/request', { method: 'POST', body: data }),
    cancelRequest: (id) => request(`/borrowings/requests/${id}/cancel`, { method: 'POST' }),
    reviewRequest: (id, data) => request(`/borrowings/requests/${id}/review`, { method: 'PATCH', body: data }),
  },

  // Returns
  returns: {
    getRequests: (all = false) => request(`/returns/requests?all=${all}`),
    submit: (data) => request('/returns/request', { method: 'POST', body: data }),
    confirm: (id, data) => request(`/returns/confirm/${id}`, { method: 'POST', body: data }),
  },

  // Donations
  donations: {
    list: (all = false) => request(`/donations?all=${all}`),
    create: (data) => request('/donations', { method: 'POST', body: data }),
    review: (id, data) => request(`/donations/${id}/status`, { method: 'PATCH', body: data }),
  },

  // Exchanges
  exchanges: {
    getListings: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/exchanges/listings?${query}`);
    },
    getListing: (id) => request(`/exchanges/listings/${id}`),
    createListing: (data) => request('/exchanges/listings', { method: 'POST', body: data }),
    deleteListing: (id) => request(`/exchanges/listings/${id}`, { method: 'DELETE' }),
    createRequest: (data) => request('/exchanges/requests', { method: 'POST', body: data }),
    getMyRequests: () => request('/exchanges/requests/my'),
    respondRequest: (id, data) => request(`/exchanges/requests/${id}/respond`, { method: 'POST', body: data }),
    cancelRequest: (id) => request(`/exchanges/requests/${id}/cancel`, { method: 'POST' }),
  },

  // Notifications
  notifications: {
    list: () => request('/notifications'),
    markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request('/notifications/read-all', { method: 'POST' }),
    delete: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
  },

  // Admin
  admin: {
    getOverview: () => request('/admin/overview'),
    getUsers: () => request('/admin/users'),
    updateUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),
    getCharts: () => request('/admin/charts'),
    getOverdue: () => request('/admin/overdue'),
  },
};
