import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens';

/**
 * Main App Component
 * 
 * This is the entry point of the NutriLens application.
 * It sets up the SafeAreaProvider and renders the main HomeScreen.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <HomeScreen />
    </SafeAreaProvider>
  );
}