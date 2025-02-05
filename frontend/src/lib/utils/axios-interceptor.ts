import axios from 'axios';
import { API_URL } from '../utils';
import { setAuthToken, clearAuthToken } from '../api/auth';

interface ApiError {
  response?: {
    status?: number;
    data?: {
      detail?: string;
    };
  };
  message?: string;
}

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export const handleApiError = (error: ApiError) => {
  // Handle 401 Unauthorized errors
  if (error.response?.status === 401) {
    // Clear authentication token and redirect to login
    clearAuthToken();
    window.location.href = '/auth/login';
    return;
  }

  // Log other errors
  console.error('API Error:', error);

  // Return a standardized error message
  const errorMessage = error.response?.data?.detail || error.message || 'An unexpected error occurred';
  return Promise.reject(new Error(errorMessage));
};

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  handleApiError
);

export default api;
