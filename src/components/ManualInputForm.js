import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants';
import { NutritionFacts } from '../models/nutritionModels';
import NutriScoreService from '../services/nutriscoreService';

/**
 * Manual Input Form Component
 * Allows users to manually enter nutrition data for non-packaged products
 */
export const ManualInputForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    calories: '',
    carbs: '',
    fat: '',
    protein: '',
    sugar: ''
  });

  const handleInputChange = (field, value) => {
    // Only allow numbers and decimal points
    const numericValue = value.replace(/[^0-9.]/g, '');
    setFormData(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  const handleSubmit = async () => {
    // Check if at least one field has data
    const hasData = formData.calories || formData.carbs || formData.fat || 
                   formData.protein || formData.sugar;

    if (!hasData) {
      alert('Please enter at least one nutrition value');
      return;
    }

    // Create nutrition facts object from form data
    const nutritionFacts = new NutritionFacts();
    
    // Set calories (always set, even if 0)
    nutritionFacts.calories = {
      total: formData.calories ? parseFloat(formData.calories) || 0 : 0,
      fromFat: null
    };

    // Set macronutrients (always set, even if 0)
    nutritionFacts.macronutrients = {
      totalCarbohydrates: formData.carbs ? parseFloat(formData.carbs) || 0 : 0,
      totalFat: formData.fat ? parseFloat(formData.fat) || 0 : 0,
      protein: formData.protein ? parseFloat(formData.protein) || 0 : 0,
      sugars: formData.sugar ? parseFloat(formData.sugar) || 0 : 0,
      dietaryFiber: 0, // Default to 0 if not provided
      sodium: 0 // Default to 0 if not provided
    };

    // Calculate Nutri-Score (EU first, then combined)
    try {
      // Step 1: Calculate EU NutriScore
      const euNutriscoreResult = await NutriScoreService.calculateEUNutriScoreForItem(nutritionFacts);
      
      // Step 2: Calculate combined NutriScore (EU + models)
      const combinedNutriscoreResult = await NutriScoreService.calculateCombinedNutriScoreForScan(nutritionFacts);
      
      if (combinedNutriscoreResult.success) {
        nutritionFacts.nutriscore = {
          euScore: euNutriscoreResult.success ? euNutriscoreResult.eu_nutriscore : null,
          combinedScore: combinedNutriscoreResult.nutriscore,
          combinedScore_rounded: combinedNutriscoreResult.nutriscore_rounded,
          grade: combinedNutriscoreResult.grade,
          breakdown: combinedNutriscoreResult.breakdown || {}
        };
      } else if (euNutriscoreResult.success) {
        // Fallback: if combined fails, at least store EU score
        nutritionFacts.nutriscore = {
          euScore: euNutriscoreResult.eu_nutriscore,
          combinedScore: null,
          grade: euNutriscoreResult.grade,
          error: combinedNutriscoreResult.error || 'Combined NutriScore calculation failed'
        };
      }
    } catch (error) {
      // Continue without nutriscore if calculation fails
      console.error('NutriScore calculation error in manual input:', error);
    }

    onSubmit(nutritionFacts);
  };

  const renderInputField = (label, field, unit, icon) => {
    return (
      <View style={styles.inputGroup}>
        <View style={styles.inputLabelContainer}>
          <Ionicons name={icon} size={20} color={COLORS.primary} />
          <Text style={styles.inputLabel}>{label}</Text>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={formData[field]}
            onChangeText={(value) => handleInputChange(field, value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
          <Text style={styles.unitLabel}>{unit}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Ionicons name="create-outline" size={48} color={COLORS.primary} />
          <Text style={styles.title}>Manual Input</Text>
          <Text style={styles.subtitle}>
            Enter nutrition information for non-packaged products
          </Text>
        </View>

        <View style={styles.formContainer}>
          {renderInputField('Calories', 'calories', 'kcal', 'flame')}
          {renderInputField('Carbs', 'carbs', 'g', 'nutrition')}
          {renderInputField('Fat', 'fat', 'g', 'water')}
          {renderInputField('Protein', 'protein', 'g', 'fitness')}
          {renderInputField('Sugar', 'sugar', 'g', 'cafe')}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
          >
            <Ionicons name="checkmark" size={20} color={COLORS.white} />
            <Text style={styles.submitButtonText}>Add to Intake</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.body2,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: SIZES.body2,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    paddingVertical: 14,
  },
  unitLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

