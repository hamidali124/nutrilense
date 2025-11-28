// Application constants and configuration
export const COLORS = {
  primary: '#4CAF50',
  primaryDark: '#2E7D32',
  primaryLight: '#E8F5E8',
  secondary: '#81C784',
  background: '#f9f9f9',
  white: '#FFFFFF',
  black: '#000000',
  text: {
    primary: '#333333',
    secondary: '#666666',
    light: '#999999'
  },
  alert: {
    warning: '#FFB800',
    warningBg: '#FFF9E6',
    error: '#FF4444',
    errorBg: '#FFF0F0',
    info: '#2196F3',
    infoBg: '#F0F8FF'
  }
};

export const SIZES = {
  padding: 20,
  margin: 15,
  borderRadius: 12,
  iconSize: {
    small: 16,
    medium: 24,
    large: 40,
    xlarge: 60
  },
  fontSize: {
    small: 12,
    medium: 14,
    large: 16,
    xlarge: 18,
    xxlarge: 24,
    title: 28
  }
};

export const DIMENSIONS = {
  screenWidth: require('react-native').Dimensions.get('window').width,
  screenHeight: require('react-native').Dimensions.get('window').height
};

export const SHADOW_STYLES = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5
  },
  heavy: {
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  }
};