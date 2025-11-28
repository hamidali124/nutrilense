import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants';

/**
 * Reusable TopBar component
 */
export const TopBar = ({ title = "NutriLens", ocrService, onToggleOCR }) => {
  const getServiceDisplay = (service) => {
    switch (service) {
      case 'azure': return '🔷 Azure Vision';
      case 'google': return '🤖 Google Vision';
      case 'ocrspace': return '🔍 OCR.space';
      default: return '🔍 OCR Service';
    }
  };

  return (
    <View style={styles.topBar}>
      <View style={styles.titleContainer}>
        <Text style={styles.appTitle}>{title}</Text>
        <View style={styles.titleIconContainer}>
          <Ionicons name="scan" size={16} color={COLORS.primary} />
        </View>
      </View>
      
      {onToggleOCR && (
        <TouchableOpacity 
          style={styles.toggleButton} 
          onPress={onToggleOCR}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleText}>
            {getServiceDisplay(ocrService)}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: COLORS.white,
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: SIZES.padding,
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  appTitle: {
    fontSize: SIZES.fontSize.xxlarge,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  titleIconContainer: {
    marginLeft: 6,
    marginTop: -2,
    width: 24,
    height: 24,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  toggleButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
});