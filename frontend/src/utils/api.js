// API utility functions for handling visibility and authentication

// Determine base URL based on environment
const getBaseURL = () => {
  // In development, use Vite proxy to backend
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  // In production, use environment variable or fallback
  const prodURL = import.meta.env.VITE_BACKEND_URL;
  if (prodURL) {
    // Ensure URL doesn't end with /api if it's already included
    return prodURL.endsWith('/api') ? prodURL : `${prodURL}/api`;
  }
  
  // Fallback for production if no env var is set
  return '/api';
};

const API_BASE_URL = getBaseURL();

// Debug logging (only in development)
if (import.meta.env.DEV) {
  console.log('🔧 Development mode - using Vite proxy:', API_BASE_URL);
} else {
  console.log('🚀 Production mode - API URL:', API_BASE_URL);
}

// Get auth headers if user is logged in
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Generic API call with enhanced error handling
export const apiCall = async (endpoint, options = {}) => {
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);

    // Handle different HTTP status codes
    if (!response.ok) {
      let errorData = {};
      
      try {
        errorData = await response.json();
      } catch (parseError) {
        // If response is not JSON, create a generic error object
        errorData = { 
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status
        };
      }
      
      // Handle specific error types
      switch (response.status) {
        case 401:
          // Unauthorized - token might be expired
          localStorage.removeItem('token');
          throw new AuthError(errorData.message || 'Authentication required');
        
        case 403:
          // Forbidden - access denied/visibility restriction
          throw new VisibilityError(errorData.message || 'Access denied');
        
        case 404:
          // Not found
          throw new NotFoundError(errorData.message || 'Resource not found');
        
        case 422:
          // Validation error
          throw new ValidationError(errorData.message || 'Validation failed', errorData.errors);
        
        case 429:
          // Rate limit exceeded
          throw new RateLimitError(errorData.message || 'Too many requests');
        
        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          throw new ServerError(errorData.message || 'Server error occurred');
        
        default:
          throw new APIError(errorData.message || `HTTP error ${response.status}`, response.status);
      }
    }

    // Handle different content types
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      // For non-JSON responses (like file downloads)
      return response;
    }

  } catch (error) {
    // Re-throw custom errors as-is
    if (error instanceof APIError) {
      throw error;
    }

    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new NetworkError('Network connection failed. Please check your internet connection.');
    }

    // Handle timeout errors
    if (error.name === 'AbortError') {
      throw new TimeoutError('Request timed out. Please try again.');
    }

    // Generic error fallback
    throw new NetworkError(`Request failed: ${error.message}`);
  }
};

// Custom error classes for better error handling
export class APIError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

export class AuthError extends APIError {
  constructor(message) {
    super(message, 401);
    this.name = 'AuthError';
  }
}

export class VisibilityError extends APIError {
  constructor(message) {
    super(message, 403);
    this.name = 'VisibilityError';
  }
}

export class NotFoundError extends APIError {
  constructor(message) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends APIError {
  constructor(message, errors = null) {
    super(message, 422);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class RateLimitError extends APIError {
  constructor(message) {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

export class ServerError extends APIError {
  constructor(message) {
    super(message, 500);
    this.name = 'ServerError';
  }
}

export class NetworkError extends APIError {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends APIError {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Utility function to add timeout to requests
const withTimeout = (promise, timeoutMs = 10000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new TimeoutError('Request timed out')), timeoutMs)
    )
  ]);
};

// Enhanced API call with timeout support
export const apiCallWithTimeout = async (endpoint, options = {}, timeoutMs = 10000) => {
  return withTimeout(apiCall(endpoint, options), timeoutMs);
};

// Convenience methods for different HTTP verbs
export const apiGet = (endpoint, options = {}) => {
  return apiCall(endpoint, { method: 'GET', ...options });
};

export const apiPost = (endpoint, data, options = {}) => {
  return apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options
  });
};

export const apiPut = (endpoint, data, options = {}) => {
  return apiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options
  });
};

export const apiPatch = (endpoint, data, options = {}) => {
  return apiCall(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
    ...options
  });
};

export const apiDelete = (endpoint, options = {}) => {
  return apiCall(endpoint, { method: 'DELETE', ...options });
};

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
