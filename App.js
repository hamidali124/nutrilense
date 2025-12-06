import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { HomeScreen, LoginScreen, RegisterScreen, ProfileScreen } from './src/screens';
import { COLORS } from './src/constants';

/**
 * Main App Component
 * 
 * This is the entry point of the NutriLens application.
 * It sets up the SafeAreaProvider, AuthProvider, and handles navigation.
 */
function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  // Initialize screen based on auth status
  const [currentScreen, setCurrentScreen] = useState(isAuthenticated ? 'home' : 'login');
  const [navigationStack, setNavigationStack] = useState([]);
  
  // Update screen when auth status changes
  useEffect(() => {
    if (!isAuthenticated && currentScreen !== 'login' && currentScreen !== 'register') {
      setCurrentScreen('login');
    } else if (isAuthenticated && (currentScreen === 'login' || currentScreen === 'register')) {
      setCurrentScreen('home');
    }
  }, [isAuthenticated]);

  const navigate = (screen, params = {}) => {
    setNavigationStack(prev => [...prev, { screen: currentScreen, params: {} }]);
    setCurrentScreen(screen);
  };

  const goBack = () => {
    if (navigationStack.length > 0) {
      const previous = navigationStack[navigationStack.length - 1];
      setNavigationStack(prev => prev.slice(0, -1));
      setCurrentScreen(previous.screen);
    } else {
      setCurrentScreen('home');
    }
  };

  const replace = (screen) => {
    setNavigationStack([]);
    setCurrentScreen(screen);
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    // Create navigation object for unauthenticated screens
    const unauthenticatedNavigation = {
      navigate: (screen) => {
        // Normalize screen name to lowercase
        const normalizedScreen = screen.toLowerCase();
        console.log('Navigating to:', normalizedScreen, 'from:', currentScreen);
        setCurrentScreen(normalizedScreen);
      },
      goBack: () => {
        console.log('Going back from:', currentScreen);
        if (currentScreen === 'register') {
          setCurrentScreen('login');
        } else {
          setCurrentScreen('login');
        }
      },
      replace: (screen) => {
        const normalizedScreen = screen.toLowerCase();
        console.log('Replacing with:', normalizedScreen);
        setCurrentScreen(normalizedScreen);
      }
    };

    if (currentScreen === 'register') {
      return (
        <RegisterScreen 
          navigation={unauthenticatedNavigation} 
        />
      );
    }
    return (
      <LoginScreen 
        navigation={unauthenticatedNavigation} 
      />
    );
  }

  // Authenticated screens
  const navigation = {
    navigate: (screen) => {
      if (screen === 'Profile') {
        setCurrentScreen('profile');
      } else if (screen === 'Register') {
        setCurrentScreen('register');
      } else if (screen === 'Login') {
        setCurrentScreen('login');
      } else {
        setCurrentScreen(screen.toLowerCase());
      }
    },
    goBack,
    replace: (screen) => {
      if (screen === 'Home') {
        setCurrentScreen('home');
      } else if (screen === 'Login') {
        setCurrentScreen('login');
      } else {
        setCurrentScreen(screen.toLowerCase());
      }
    }
  };

  if (currentScreen === 'profile') {
    return <ProfileScreen navigation={navigation} />;
  }

  return <HomeScreen navigation={navigation} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
});