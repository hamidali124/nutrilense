import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW_STYLES } from '../constants';

/**
 * Bottom Navigation Bar Component
 */
export const BottomBar = ({ onScanPress, isLoading, activeTab, onTabChange }) => {
  return (
    <View style={styles.bottomBar}>
      {/* Home Tab */}
      <TouchableOpacity 
        style={styles.navItem} 
        activeOpacity={0.7}
        onPress={() => onTabChange('home')}
      >
        <Ionicons 
          name={activeTab === 'home' ? "home" : "home-outline"} 
          size={28} 
          color={activeTab === 'home' ? COLORS.primary : "#666"} 
        />
      </TouchableOpacity>
      
      {/* Scanner Tab - middle button */}
      <TouchableOpacity 
        style={[styles.navItem, styles.activeNavItem]} 
        onPress={onScanPress}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <View style={[styles.scannerButton, activeTab === 'scanner' && styles.scannerButtonActive]}>
          <Ionicons name="scan" size={28} color="white" />
        </View>
      </TouchableOpacity>
      
      {/* History Tab */}
      <TouchableOpacity 
        style={styles.navItem} 
        activeOpacity={0.7}
        onPress={() => onTabChange('history')}
      >
        <Ionicons 
          name={activeTab === 'history' ? "time" : "time-outline"} 
          size={28} 
          color={activeTab === 'history' ? COLORS.primary : "#666"} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 15,
    paddingHorizontal: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    height: 50,
  },
  activeNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    height: 50,
  },
  scannerButton: {
    width: 55,
    height: 55,
    backgroundColor: COLORS.primary,
    borderRadius: 27.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scannerButtonActive: {
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
});