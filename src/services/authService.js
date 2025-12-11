import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';


const API_BASE_URL = __DEV__ 
  ? (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api') 
  : (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-production-api.com/api');

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

class AuthService {
  /**
   * Get stored authentication token
   */
  static async getToken() {
    try {
      // Try secure store first 
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) return token;
      
      // Fallback to AsyncStorage
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Store authentication token
   */
  static async setToken(token) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error storing token:', error);
      // Fallback to AsyncStorage
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  }

  /**
   * Remove authentication token
   */
  static async removeToken() {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  /**
   * Get stored user data
   */
  static async getUser() {
    try {
      const userJson = await AsyncStorage.getItem(USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  /**
   * Store user data
   */
  static async setUser(user) {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user:', error);
    }
  }

  /**
   * Remove user data
   */
  static async removeUser() {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Error removing user:', error);
    }
  }

  /**
   * Register new user
   */
  static async register(userData) {
    try {
      console.log('Sending register request to:', `${API_BASE_URL}/auth/register`);
      console.log('Request data:', { ...userData, password: '***' });
      
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Register response:', response.data);
      
      if (response.data.success) {
        await this.setToken(response.data.token);
        await this.setUser(response.data.user);
        return {
          success: true,
          user: response.data.user,
          token: response.data.token
        };
      }
      
      return {
        success: false,
        message: response.data.message || 'Registration failed'
      };
    } catch (error) {
      console.error('Register error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Throw the error so it can be caught and displayed properly
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(email, password) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      });
      
      if (response.data.success) {
        await this.setToken(response.data.token);
        await this.setUser(response.data.user);
        return {
          success: true,
          user: response.data.user,
          token: response.data.token
        };
      }
      
      return {
        success: false,
        message: response.data.message || 'Login failed'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Login failed'
      };
    }
  }

  /**
   * Logout user
   */
  static async logout() {
    try {
      await this.removeToken();
      await this.removeUser();
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get user profile
   */
  static async getProfile() {
    try {
      const token = await this.getToken();
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found'
        };
      }

      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        await this.setUser(response.data.user);
        return {
          success: true,
          user: response.data.user
        };
      }

      return {
        success: false,
        message: response.data.message || 'Failed to get profile'
      };
    } catch (error) {
      console.error('Get profile error:', error);
      if (error.response?.status === 401) {
        // Token expired or invalid
        await this.logout();
      }
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to get profile'
      };
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userData) {
    try {
      const token = await this.getToken();
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found'
        };
      }

      const response = await axios.put(`${API_BASE_URL}/auth/profile`, userData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        await this.setUser(response.data.user);
        return {
          success: true,
          user: response.data.user,
          message: response.data.message || 'Profile updated successfully'
        };
      }

      return {
        success: false,
        message: response.data.message || 'Failed to update profile'
      };
    } catch (error) {
      console.error('Update profile error:', error);
      if (error.response?.status === 401) {
        await this.logout();
      }
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to update profile'
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  }
}

export default AuthService;

