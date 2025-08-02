// API utility functions for handling visibility and authentication

// Use environment variable or fallback to relative URLs for development
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || '/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_BACKEND_URL?.replace('/api', '') || `${window.location.protocol}//${window.location.hostname}:5000`;

export { API_BASE_URL, SOCKET_URL };

// Get auth headers if user is logged in
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Generic API call with error handling for visibility restrictions
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle different error types
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 403) {
        // Visibility restriction - return a specific error type
        throw new VisibilityError(errorData.message || 'Access denied');
      } else if (response.status === 404) {
        throw new NotFoundError(errorData.message || 'Resource not found');
      } else {
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }
    }

    return await response.json();
  } catch (error) {
    if (error instanceof VisibilityError || error instanceof NotFoundError) {
      throw error;
    }
    throw new Error(`Network error: ${error.message}`);
  }
};

// Custom error classes for better error handling
export class VisibilityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VisibilityError';
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// Specific API functions for common operations
export const fetchUserProfile = (userId) => {
  return apiCall(`/users/${userId}`);
};

export const fetchUserLibrary = (userId, status = null) => {
  const statusParam = status ? `?status=${status}` : '';
  return apiCall(`/anime-library/user/${userId}${statusParam}`);
};

export const fetchList = (listId) => {
  return apiCall(`/lists/${listId}`);
};

export const fetchUserFavorites = (userId) => {
  return apiCall(`/favorites/user/${userId}`);
};

export const searchLists = (keyword) => {
  return apiCall(`/lists/search/${encodeURIComponent(keyword)}`);
};

export const searchUsers = (username) => {
  return apiCall(`/search?type=user&username=${encodeURIComponent(username)}`);
};

export const searchContent = (type, params) => {
  const queryParams = new URLSearchParams({ type, ...params });
  return apiCall(`/search?${queryParams}`);
};
