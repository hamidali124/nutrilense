import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants';
import { LoadingOverlay } from './LoadingOverlay';
import { NutritionDisplay } from './NutritionDisplay';
import { IngredientsDisplay } from './IngredientsDisplay';
import { NoNutritionFound } from './NoNutritionFound';

/**
 * Scanner Page Component - Shows two scan options and handles scanning flow
 */
export const ScannerPage = ({ 
  scanMode, 
  onSelectMode, 
  onTakePhoto, 
  onPickImage,
  isLoading,
  nutritionData,
  ingredientData,
  scannedText,
  onRescan,
  onClear
}) => {
  // If no mode selected, show mode selection screen
  if (!scanMode && !nutritionData && !ingredientData && !scannedText) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons name="scan-circle-outline" size={64} color={COLORS.primary} />
            <Text style={styles.title}>Choose Scan Type</Text>
            <Text style={styles.subtitle}>Select what you want to scan</Text>
          </View>

          <TouchableOpacity 
            style={styles.optionCard}
            activeOpacity={0.7}
            onPress={() => onSelectMode('nutrition')}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="nutrition" size={40} color={COLORS.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Nutrition Data</Text>
              <Text style={styles.optionDescription}>
                Scan nutrition facts table from food packaging to analyze calories, proteins, fats, and other nutritional information
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionCard}
            activeOpacity={0.7}
            onPress={() => onSelectMode('ingredients')}
          >
            <View style={[styles.optionIconContainer, styles.ingredientIcon]}>
              <Ionicons name="list" size={40} color="#FF6B6B" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Ingredients List</Text>
              <Text style={styles.optionDescription}>
                Scan ingredient lists from food packages to see what's inside your food products
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // If mode selected and we have results, show results
  return (
    <View style={styles.scannerContainer}>
      {/* Results for nutrition mode */}
      {scanMode === 'nutrition' && nutritionData && (
        <NutritionDisplay nutritionData={nutritionData} />
      )}

      {/* No nutrition found */}
      {scanMode === 'nutrition' && !nutritionData && scannedText && (
        <NoNutritionFound
          onRescan={onRescan}
          onClear={onClear}
        />
      )}

      {/* Results for ingredients mode */}
      {scanMode === 'ingredients' && ingredientData && (
        <View style={styles.ingredientsResultContainer}>
          <View style={styles.ingredientsHeader}>
            <Text style={styles.ingredientsTitle}>Analysis Results</Text>
            <TouchableOpacity onPress={onClear} style={styles.clearButton}>
              <Ionicons name="close-outline" size={22} color="#666" />
            </TouchableOpacity>
          </View>
          
          <IngredientsDisplay ingredientData={ingredientData} />
          
          {/* Action Button */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.rescanButton} onPress={onRescan}>
              <Ionicons name="camera-outline" size={20} color={COLORS.white} />
              <Text style={styles.rescanButtonText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* No ingredients found */}
      {scanMode === 'ingredients' && !ingredientData && scannedText && (
        <View style={styles.noIngredientsFound}>
          <Ionicons name="search-outline" size={64} color="#ddd" />
          <Text style={styles.noIngredientsTitle}>No Ingredients Found</Text>
          <Text style={styles.noIngredientsMessage}>
            We couldn't extract ingredients from this image. Try scanning a clearer image of the ingredient list.
          </Text>
          <TouchableOpacity style={styles.rescanButton} onPress={onRescan}>
            <Ionicons name="camera-outline" size={20} color={COLORS.white} />
            <Text style={styles.rescanButtonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Show loading while scanning */}
      {isLoading && <LoadingOverlay visible={isLoading} />}
      
      {/* Show scanning message when mode is selected but no results yet */}
      {scanMode && !nutritionData && !ingredientData && !scannedText && !isLoading && (
        <View style={styles.scanningMessage}>
          <Ionicons name="camera-outline" size={64} color={COLORS.primary} />
          <Text style={styles.scanningText}>
            {scanMode === 'nutrition' ? 'Scanning Nutrition Data...' : 'Scanning Ingredients...'}
          </Text>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => {
              onClear();
              onSelectMode(null);
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.body2,
    color: '#666',
  },
  optionCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  optionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  ingredientIcon: {
    backgroundColor: '#FFE8E8',
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionTitle: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  optionDescription: {
    fontSize: SIZES.body3,
    color: '#666',
    lineHeight: 20,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 20,
  },
  backText: {
    fontSize: SIZES.body2,
    color: COLORS.primary,
    marginLeft: 8,
    fontWeight: '500',
  },
  ingredientsResultContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  ingredientsResult: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ingredientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ingredientsTitle: {
    fontSize: SIZES.h3,
    fontWeight: '600',
    color: COLORS.text,
  },
  clearButton: {
    padding: 4,
  },
  ingredientsContent: {
    flex: 1,
    marginBottom: 16,
  },
  ingredientsText: {
    fontSize: SIZES.body3,
    color: COLORS.text,
    lineHeight: 24,
  },
  rescanButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  rescanButtonText: {
    color: COLORS.white,
    fontSize: SIZES.body2,
    fontWeight: '600',
    marginLeft: 8,
  },
  scanningMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  scanningText: {
    fontSize: SIZES.h3,
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  cancelButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cancelButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.body2,
    fontWeight: '600',
  },
  // New ingredient display styles
  ingredientsList: {
    paddingHorizontal: 16,
  },
  ingredientItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  ingredientNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ingredientNumberText: {
    color: COLORS.white,
    fontSize: SIZES.body3,
    fontWeight: 'bold',
  },
  ingredientContent: {
    flex: 1,
  },
  ingredientName: {
    fontSize: SIZES.body2,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  ingredientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    color: '#F57C00',
    fontWeight: '600',
  },
  percentage: {
    fontSize: SIZES.body3,
    color: COLORS.primary,
    marginRight: 8,
    fontWeight: '600',
  },
  confidence: {
    fontSize: SIZES.body3,
    color: '#999',
  },
  actionButtons: {
    padding: 16,
  },
  noIngredientsFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noIngredientsTitle: {
    fontSize: SIZES.h3,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 12,
  },
  noIngredientsMessage: {
    fontSize: SIZES.body3,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
});
