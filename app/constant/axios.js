import axios from 'axios';
import { API_URL_APP } from './api';

// Base Axios instance
const axiosInstance = axios.create({
  baseURL: API_URL_APP,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await getData('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling global errors
axiosInstance.interceptors.response.use(
  (response) => {
    // Always resolve with data for simplicity
    return { success: true, data: response.data };
  },
  (error) => {
    // console.error('Axios error hu mai :', error.response|| error.message);

    // Detect if error is related to URL/endpoint
    const isUrlError = detectUrlError(error);
    
    // Get the failed URL for logging
    const failedUrl = error.config?.url || 'Unknown URL';
    const fullUrl = error.config?.baseURL 
      ? `${error.config.baseURL}${failedUrl}` 
      : failedUrl;

    // Construct a consistent error object
    const errorData = {
      success: false,
      status: error.response?.status || 500,
      message:
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Something went wrong',
      data: error.response?.data || null,
      
      // URL error information
      isUrlError: isUrlError.isError,
      urlErrorType: isUrlError.type,
      errorUrl: fullUrl,
      endpoint: failedUrl,
    };

    // Log URL-specific errors
    if (isUrlError.isError) {
      console.error(`[URL ERROR] ${isUrlError.type}: ${fullUrl}`);
      console.error(`[REASON] ${isUrlError.reason}`);
    }

    return Promise.resolve(errorData); // Resolve promise instead of rejecting
  }
);


function detectUrlError(error) {
  // 404 - Endpoint not found
  if (error.response?.status === 404) {
    return {
      isError: true,
      type: 'NOT_FOUND',
      reason: 'API endpoint does not exist (404)'
    };
  }

  // 405 - Method not allowed (wrong HTTP method for URL)
  if (error.response?.status === 405) {
    return {
      isError: true,
      type: 'METHOD_NOT_ALLOWED',
      reason: 'HTTP method not allowed for this endpoint (405)'
    };
  }

  // Network errors (no response received)
  if (!error.response) {
    // ENOTFOUND - DNS lookup failed (invalid domain)
    if (error.code === 'ENOTFOUND') {
      return {
        isError: true,
        type: 'INVALID_DOMAIN',
        reason: 'Cannot resolve domain name (DNS error)'
      };
    }

    // ECONNREFUSED - Server not reachable
    if (error.code === 'ECONNREFUSED') {
      return {
        isError: true,
        type: 'CONNECTION_REFUSED',
        reason: 'Server refused connection (server might be down)'
      };
    }

    // Timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        isError: true,
        type: 'TIMEOUT',
        reason: 'Request timed out (server not responding)'
      };
    }

    // Generic network error
    return {
      isError: true,
      type: 'NETWORK_ERROR',
      reason: 'Network error or invalid base URL'
    };
  }

  // 400 - Sometimes indicates malformed URL
  if (error.response?.status === 400) {
    const message = error.response?.data?.message || '';
    if (message.toLowerCase().includes('url') || 
        message.toLowerCase().includes('endpoint') ||
        message.toLowerCase().includes('path')) {
      return {
        isError: true,
        type: 'BAD_REQUEST_URL',
        reason: 'Malformed URL or invalid endpoint format (400)'
      };
    }
  }

  // Not a URL-related error
  return {
    isError: false,
    type: 'OTHER',
    reason: 'Not a URL-related error'
  };
}

export default axiosInstance;