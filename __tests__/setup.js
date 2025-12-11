// Jest setup file for React Native testing
import '@testing-library/jest-native/extend-expect';
import { IngredientAnalysisService } from '../src/services/ingredientAnalysisService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Single, in-memory AsyncStorage mock for unit-style tests
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Keep storage clean between tests
beforeEach(async () => {
  if (AsyncStorage.clear) {
    await AsyncStorage.clear();
  }
});

// Mock Expo modules
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    getCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  },
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn((uri, actions) => Promise.resolve({ uri })),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-file-system/legacy
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 1024 * 1024 })),
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  readDirectoryAsync: jest.fn(() => Promise.resolve([])),
  cacheDirectory: 'file://cache/',
  documentDirectory: 'file://documents/',
}));

// Mock Ingredient NLP Service 
jest.mock('../src/services/ingredientNLPService', () => ({
  IngredientNLPService: {
    analyzeIngredients: jest.fn((text) => {
      // Simple mock that extracts ingredients from comma-separated list
      if (!text || text.trim().length === 0) {
        return Promise.resolve([]);
      }
      // Remove "Ingredients:" label if present
      const ingredientText = text.split(/ingredients?:/i)[1] || text;
      const ingredients = ingredientText.split(',').map(ing => ing.trim()).filter(Boolean);
      if (ingredients.length === 0) {
        return Promise.resolve([]);
      }
      return Promise.resolve(ingredients.map((name, index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        confidence: 0.8,
        source: 'comma_separation',
        index
      })));
    }),
  },
}));



// Mock AuthService for user profile
jest.mock('../src/services/authService', () => ({
  __esModule: true,
  default: {
    getUser: jest.fn(() => Promise.resolve({
      id: 'test-user',
      age: 30,
      bmi: 22.5,
      gender: 'male',
      hba1c: null,
    })),
  },
}));


// Suppress console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

