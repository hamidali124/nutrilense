import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants';

export const NoNutritionFound = ({ onRescan, onClear }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>No Nutrition Table Found</Text>
        <TouchableOpacity onPress={onClear} style={styles.clearButton}>
          <Ionicons name="close-outline" size={22} color="#666" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Ionicons name="search-outline" size={64} color="#ddd" style={styles.icon} />
        <Text style={styles.message}>
          We couldn't find any nutrition information in this image.
        </Text>
        <Text style={styles.submessage}>
          Try scanning a clearer image of a nutrition label or food packaging.
        </Text>
        
        <TouchableOpacity style={styles.rescanButton} onPress={onRescan}>
          <Ionicons name="camera-outline" size={20} color={COLORS.white} />
          <Text style={styles.rescanButtonText}>Scan Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: SIZES.h3,
    fontWeight: '600',
    color: COLORS.text,
  },
  clearButton: {
    padding: 4,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  icon: {
    marginBottom: 16,
  },
  message: {
    fontSize: SIZES.body2,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  submessage: {
    fontSize: SIZES.body3,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  rescanButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rescanButtonText: {
    color: COLORS.white,
    fontSize: SIZES.body2,
    fontWeight: '600',
    marginLeft: 8,
  },
});