jest.mock('axios');

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const { default: AuthService } = jest.requireActual('../src/services/authService');

describe('Authentication Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('login should persist token and user when the API returns success', async () => {
    const user = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      age: 25,
      bmi: 21.8,
      gender: 'female',
    };

    axios.post.mockResolvedValue({
      data: {
        success: true,
        token: 'test-token',
        user,
      },
    });

    const result = await AuthService.login('user@example.com', 'secret123');

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/login$/),
      {
        email: 'user@example.com',
        password: 'secret123',
      }
    );
    expect(result).toEqual({
      success: true,
      token: 'test-token',
      user,
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'test-token');
    expect(await AsyncStorage.getItem('auth_token')).toBe('test-token');
    expect(JSON.parse(await AsyncStorage.getItem('user_data'))).toEqual(user);
  });

  test('login should return the API message when the backend rejects the request', async () => {
    axios.post.mockRejectedValue({
      response: {
        data: {
          message: 'Invalid email or password',
        },
      },
    });

    const result = await AuthService.login('user@example.com', 'wrong-password');

    expect(result).toEqual({
      success: false,
      message: 'Invalid email or password',
    });
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('auth_token')).toBeNull();
  });

  test('login should fall back to the thrown axios message when no response payload exists', async () => {
    axios.post.mockRejectedValue(new Error('Network Error'));

    const result = await AuthService.login('user@example.com', 'secret123');

    expect(result).toEqual({
      success: false,
      message: 'Network Error',
    });
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('auth_token')).toBeNull();
  });
});