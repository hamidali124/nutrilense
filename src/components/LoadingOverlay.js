import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, SIZES, SHADOW_STYLES } from '../constants';

/**
 * Loading Overlay Component
 */
export const LoadingOverlay = ({ visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>Extracting text from image... </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 16,
    gap: 12,
    ...SHADOW_STYLES.medium,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
});