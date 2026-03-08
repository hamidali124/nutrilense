import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW_STYLES } from '../constants';

/**
 * Bottom Navigation Bar Component
 * 5 tabs: Home, Dashboard, Scanner (center), Coach, History
 */
export const BottomBar = ({ onScanPress, isLoading, activeTab, onTabChange }) => {
  const renderTab = (tabKey, iconActive, iconInactive, label) => (
    <TouchableOpacity 
      style={styles.navItem} 
      activeOpacity={0.7}
      onPress={() => onTabChange(tabKey)}
    >
      <Ionicons 
        name={activeTab === tabKey ? iconActive : iconInactive} 
        size={24} 
        color={activeTab === tabKey ? COLORS.primary : '#666'} 
      />
      <Text style={[styles.navLabel, activeTab === tabKey && styles.navLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.bottomBar}>
      {renderTab('home', 'home', 'home-outline', 'Home')}
      {renderTab('dashboard', 'stats-chart', 'stats-chart-outline', 'Dashboard')}
      
      {/* Scanner Tab - center prominent button */}
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
      
      {renderTab('coach', 'chatbubble-ellipses', 'chatbubble-ellipses-outline', 'Coach')}
      {renderTab('history', 'time', 'time-outline', 'History')}
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
    minWidth: 50,
    height: 50,
  },
  activeNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    height: 50,
  },
  navLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
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