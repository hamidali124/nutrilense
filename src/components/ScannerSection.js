import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOW_STYLES } from '../constants';

/**
 * Scanner Section Component
 */
export const ScannerSection = ({ isLoading, onTakePhoto, onPickImage }) => {
  return (
    <View style={styles.scannerSection}>
      <View style={styles.welcomeContainer}>
        <View style={styles.scannerIconContainer}>
          <Ionicons name="scan" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.scannerTitle}>Scan Product Label</Text>
        <Text style={styles.scannerDescription}>
          Point your camera at food packaging to extract ingredients and nutrition information
        </Text>
      </View>
      
      <View style={styles.featuresContainer}>
        <FeatureCard emoji="🍎" title="Ingredient Finder" />
        <FeatureCard emoji="⚠️" title="Allergen Detection" />
        <FeatureCard emoji="🚫" title="Haram Check" />
      </View>
      
      <View style={styles.actionButtons}>
        <ActionButton
          primary
          icon="camera"
          text="Scan Now"
          onPress={onTakePhoto}
          disabled={isLoading}
        />
        
        <ActionButton
          icon="image"
          text="Choose Photo"
          onPress={onPickImage}
          disabled={isLoading}
        />
      </View>
    </View>
  );
};

/**
 * Feature Card Component
 */
const FeatureCard = ({ emoji, title }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureEmoji}>{emoji}</Text>
    <Text style={styles.featureText}>{title}</Text>
  </View>
);

/**
 * Action Button Component
 */
const ActionButton = ({ primary, icon, text, onPress, disabled }) => (
  <TouchableOpacity
    style={[
      primary ? styles.primaryAction : styles.secondaryAction,
      disabled && (primary ? styles.disabledAction : styles.disabledSecondaryAction)
    ]}
    onPress={onPress}
    disabled={disabled}
  >
    <View style={styles.buttonContent}>
      <Ionicons 
        name={icon} 
        size={20} 
        color={primary ? COLORS.white : COLORS.primary} 
        style={{ marginRight: 8 }} 
      />
      <Text style={primary ? styles.actionText : styles.secondaryActionText}>
        {text}
      </Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  scannerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  scannerIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...SHADOW_STYLES.light,
  },
  scannerTitle: {
    fontSize: SIZES.fontSize.title,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    marginBottom: 15,
    textAlign: 'center',
  },
  scannerDescription: {
    fontSize: SIZES.fontSize.large,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 15,
    marginHorizontal: 5,
    ...SHADOW_STYLES.light,
  },
  featureEmoji: {
    fontSize: 30,
    marginBottom: 8,
  },
  featureText: {
    fontSize: SIZES.fontSize.small,
    color: COLORS.primaryDark,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButtons: {
    width: '100%',
    gap: 15,
  },
  primaryAction: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    ...SHADOW_STYLES.heavy,
  },
  secondaryAction: {
    backgroundColor: COLORS.white,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOW_STYLES.medium,
  },
  actionText: {
    fontSize: SIZES.fontSize.xlarge,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  secondaryActionText: {
    fontSize: SIZES.fontSize.xlarge,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  disabledAction: {
    backgroundColor: '#A5D6A7',
  },
  disabledSecondaryAction: {
    backgroundColor: '#f5f5f5',
    borderColor: '#A5D6A7',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});