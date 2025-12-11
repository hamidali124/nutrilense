import React, { createContext, useState, useEffect, useContext } from 'react';
import AuthService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);


  // DEVELOPMENT MODE: Auto-login with hardcoded credentials
  const DEV_AUTO_LOGIN = __DEV__; 
  const DEV_EMAIL = 'hassaanafzal412@gmail.com';
  const DEV_PASSWORD = '123456';


  // Check if user is already logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const storedUser = await AuthService.getUser();
      const hasToken = await AuthService.isAuthenticated();

      if (hasToken && storedUser) {
        // Verify token is still valid by fetching profile
        const profileResult = await AuthService.getProfile();
        if (profileResult.success) {
          setUser(profileResult.user);
          setIsAuthenticated(true);
        } else {
          // Token invalid, clear everything
          await AuthService.logout();
          
          // DEVELOPMENT: Auto-login if token invalid
          if (DEV_AUTO_LOGIN) {
            console.log('DEV MODE: Auto-logging in with hardcoded credentials...');
            const autoLoginResult = await login(DEV_EMAIL, DEV_PASSWORD);
            if (autoLoginResult.success) {
              console.log('DEV MODE: Auto-login successful');
              return;
            }
          }
          
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        // DEVELOPMENT: Auto-login if no token
        if (DEV_AUTO_LOGIN) {
          console.log('🛠️ DEV MODE: No existing session, auto-logging in...');
          const autoLoginResult = await login(DEV_EMAIL, DEV_PASSWORD);
          if (autoLoginResult.success) {
            console.log('DEV MODE: Auto-login successful');
            return;
          } else {
            console.warn('DEV MODE: Auto-login failed:', autoLoginResult.message);
          }
        }
        
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      
      // DEVELOPMENT: Try auto-login on error
      if (DEV_AUTO_LOGIN) {
        console.log('🛠️ DEV MODE: Error occurred, attempting auto-login...');
        try {
          const autoLoginResult = await login(DEV_EMAIL, DEV_PASSWORD);
          if (autoLoginResult.success) {
            console.log('DEV MODE: Auto-login successful after error');
            return;
          }
        } catch (autoLoginError) {
          console.error('DEV MODE: Auto-login failed:', autoLoginError);
        }
      }
      
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const result = await AuthService.login(email, password);
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, message: result.message };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const result = await AuthService.register(userData);
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, message: result.message };
    } catch (error) {
      console.error('Register error in context:', error);
      // Re-throw the error so RegisterScreen can handle it
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: error.message };
    }
  };

  const updateProfile = async (userData) => {
    try {
      const result = await AuthService.updateProfile(userData);
      if (result.success) {
        setUser(result.user);
        return { success: true, message: result.message };
      }
      return { success: false, message: result.message };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: error.message || 'Update failed' };
    }
  };

  const refreshUser = async () => {
    try {
      const result = await AuthService.getProfile();
      if (result.success) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Refresh user error:', error);
      return { success: false };
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
    checkAuthStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

