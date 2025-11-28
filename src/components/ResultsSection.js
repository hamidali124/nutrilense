import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants';
import { NutritionDisplay } from './NutritionDisplay';
import { IngredientsDisplay } from './IngredientsDisplay';

export const ResultsSection = ({ 
  scannedText, 
  nutritionData, 
  ingredientData, 
  scanMode, 
  onClear 
}) => {
  // Show nothing if no data
  if (!scannedText && !nutritionData && !ingredientData) return null;

  // Show ingredient display if in ingredient mode and has ingredient data
  if (scanMode === 'ingredients' && ingredientData) {
    return (
      <View style={styles.resultsSection}>
        <View style={styles.resultsHeader}>
          <View>
            <Text style={styles.resultsTitle}>Analysis Results</Text>
            <Text style={styles.resultsSubtitle}>Ingredient Analysis</Text>
          </View>
          <TouchableOpacity onPress={onClear} style={styles.clearButton}>
            <Ionicons name="close-outline" size={22} color="#666" />
          </TouchableOpacity>
        </View>
        
        <IngredientsDisplay ingredientData={ingredientData} />
      </View>
    );
  }

  // Show nutrition display if in nutrition mode and has nutrition data
  if (scanMode === 'nutrition' && nutritionData) {
    return (
      <View style={styles.resultsSection}>
        <View style={styles.resultsHeader}>
          <View>
            <Text style={styles.resultsTitle}>Analysis Results</Text>
            <Text style={styles.resultsSubtitle}>Nutrition Facts</Text>
          </View>
          <TouchableOpacity onPress={onClear} style={styles.clearButton}>
            <Ionicons name="close-outline" size={22} color="#666" />
          </TouchableOpacity>
        </View>
        
        <NutritionDisplay nutritionData={nutritionData} />
      </View>
    );
  }

  // Fallback: show extracted text
  return (
    <View style={styles.resultsSection}>
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>Extracted Text</Text>
        <TouchableOpacity onPress={onClear} style={styles.clearButton}>
          <Ionicons name="close-outline" size={22} color="#666" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.resultsContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.textCard} activeOpacity={0.7}>
          <Text style={styles.extractedText}>{scannedText}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// Simplified - no need for ResultCard component anymore

const styles = StyleSheet.create({
  resultsSection: {
    flex: 1,
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  resultsSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    fontWeight: '500',
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  textCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  extractedText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#2c2c2c',
    fontWeight: '400',
    letterSpacing: 0.1,
  },
});