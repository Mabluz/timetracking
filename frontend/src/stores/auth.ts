import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'));
  const isPasswordProtected = ref<boolean>(false);
  const isAuthenticated = computed(() => !!token.value);

  /**
   * Check if the application requires password protection
   */
  const checkIfPasswordProtected = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify`);
      const data = await response.json();
      isPasswordProtected.value = data.protected || data.requiresAuth;
      console.log('Password protection status:', isPasswordProtected.value);
      return isPasswordProtected.value;
    } catch (error) {
      console.error('Error checking password protection:', error);
      // Assume password protection is disabled if we can't check
      isPasswordProtected.value = false;
      return false;
    }
  };

  /**
   * Authenticate with password
   */
  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }

      const data = await response.json();
      token.value = data.token;
      localStorage.setItem('auth_token', data.token);
      console.log('Login successful, token stored:', token.value ? 'YES' : 'NO');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  /**
   * Logout
   */
  const logout = (): void => {
    token.value = null;
    localStorage.removeItem('auth_token');
  };

  /**
   * Get the authorization header for API requests
   */
  const getAuthHeader = (): Record<string, string> => {
    console.log('getAuthHeader called, token exists:', !!token.value);
    if (!token.value) {
      return {};
    }
    return {
      Authorization: `Bearer ${token.value}`,
    };
  };

  /**
   * Initialize auth state from stored token
   */
  const initializeAuth = async (): Promise<void> => {
    await checkIfPasswordProtected();

    // If password protection is disabled, we don't need a token
    if (!isPasswordProtected.value) {
      token.value = null;
      return;
    }

    // Try to use stored token, but it might be expired
    if (token.value) {
      // Token exists, it will be validated on first API request
      return;
    }
  };

  return {
    token,
    isAuthenticated,
    isPasswordProtected,
    checkIfPasswordProtected,
    login,
    logout,
    getAuthHeader,
    initializeAuth,
  };
});
