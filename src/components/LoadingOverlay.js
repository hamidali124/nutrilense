import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, SIZES, SHADOW_STYLES } from '../constants';

/**
 * Loading Overlay Component
 */
export const LoadingOverlay = ({ visible, title = "Processing Image", subtitle = "Extracting nutrition information..." }) => {
  if (!visible) return null;

  return (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingTitle}>{title}</Text>
        <Text style={styles.loadingSubtitle}>{subtitle}</Text>
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
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 40,
    borderRadius: 20,
    ...SHADOW_STYLES.medium,
  },
  loadingTitle: {
    fontSize: SIZES.fontSize.xlarge,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: SIZES.fontSize.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});