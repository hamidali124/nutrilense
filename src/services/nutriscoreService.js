import axios from 'axios';
import AuthService from './authService';

// Get API base URL (same as authService)
const getApiBaseUrl = () => {
  // Use environment variable for all environments
  // Set EXPO_PUBLIC_API_BASE_URL in .env file
  if (__DEV__) {
    return process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-production-api.com/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Service for calculating Nutri-Score from nutrition data
 */
class NutriScoreService {
  /**
   * Extract and normalize nutrition data to per-100g format
   * @param {Object} nutritionData - NutritionFacts object or similar
   * @returns {Object} Normalized nutrition data per 100g
   */
  static extractNutritionForPrediction(nutritionData) {
    if (!nutritionData) {
      return null;
    }

    // Extract values from various possible structures
    let calories = 0;
    let sugars = 0;
    let saturatedFat = 0;
    let sodium = 0;
    let fiber = 0;
    let protein = 0;
    let servingSize = null;

    // Extract calories
    if (nutritionData.calories) {
      if (typeof nutritionData.calories === 'object') {
        calories = this.getNumericValue(nutritionData.calories.total) || 0;
      } else {
        calories = this.getNumericValue(nutritionData.calories) || 0;
      }
    }

    // Extract macronutrients
    if (nutritionData.macronutrients) {
      const macros = nutritionData.macronutrients;
      sugars = this.getNumericValue(macros.sugars || macros.sugar || macros.totalSugars) || 0;
      saturatedFat = this.getNumericValue(macros.saturatedFat || macros.saturated_fat) || 0;
      sodium = this.getNumericValue(macros.sodium) || 0;
      fiber = this.getNumericValue(macros.dietaryFiber || macros.fiber || macros.dietary_fiber) || 0;
      protein = this.getNumericValue(macros.protein) || 0;
    }

    // Handle missing nutrients - use defaults if not found
    if (sodium === 0 && nutritionData.vitaminsAndMinerals) {
      sodium = this.getNumericValue(nutritionData.vitaminsAndMinerals.sodium) || 0;
    }

    // Extract serving size if available
    if (nutritionData.servingInfo) {
      const servingInfo = nutritionData.servingInfo;
      if (servingInfo.servingSize) {
        servingSize = this.extractServingSizeInGrams(servingInfo.servingSize);
      }
    }

    return {
      calories,
      sugars,
      saturatedFat,
      sodium,
      fiber,
      protein,
      servingSize
    };
  }

  /**
   * Get numeric value from various formats
   */
  static getNumericValue(value) {
    if (value === null || value === undefined) return 0;
    
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }
    
    if (typeof value === 'object' && value.value !== undefined) {
      const num = parseFloat(value.value);
      return isNaN(num) ? 0 : num;
    }
    
    if (typeof value === 'string') {
      const match = value.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        const num = parseFloat(match[1]);
        return isNaN(num) ? 0 : num;
      }
    }
    
    return 0;
  }

  /**
   * Extract serving size in grams from serving size string
   * Handles formats like "100g", "1 cup (240ml)", "1 piece (50g)", etc.
   */
  static extractServingSizeInGrams(servingSizeStr) {
    if (!servingSizeStr || typeof servingSizeStr !== 'string') {
      return null;
    }

    // Try to find grams directly
    const gramMatch = servingSizeStr.match(/(\d+(?:\.\d+)?)\s*g/i);
    if (gramMatch) {
      return parseFloat(gramMatch[1]);
    }

    // Try to find ml and convert (approximate: 1ml ≈ 1g for most liquids)
    const mlMatch = servingSizeStr.match(/(\d+(?:\.\d+)?)\s*ml/i);
    if (mlMatch) {
      return parseFloat(mlMatch[1]);
    }

    // Try to find oz and convert (1 oz ≈ 28.35g)
    const ozMatch = servingSizeStr.match(/(\d+(?:\.\d+)?)\s*oz/i);
    if (ozMatch) {
      return parseFloat(ozMatch[1]) * 28.35;
    }

    return null;
  }

  /**
   * Calculate EU NutriScore for a single item (per 100g)
   * @param {Object} nutritionData - NutritionFacts object or similar
   * @returns {Promise<Object>} { success, eu_nutriscore, grade, error }
   */
  static async calculateEUNutriScoreForItem(nutritionData) {
    try {
      const extracted = this.extractNutritionForPrediction(nutritionData);
      
      if (!extracted) {
        return {
          success: false,
          error: 'No nutrition data provided'
        };
      }

      // Check if we have at least some data
      const hasData = extracted.calories > 0 || extracted.sugars > 0 || 
                     extracted.saturatedFat > 0 || extracted.sodium > 0 ||
                     extracted.fiber > 0 || extracted.protein > 0;

      if (!hasData) {
        return {
          success: false,
          error: 'Insufficient nutrition data to calculate EU Nutri-Score'
        };
      }

      // Log extracted features for debugging (only in development)
      if (__DEV__) {
        console.log(' EU NutriScore Feature Extraction:');
        console.log('  Calories:', extracted.calories, 'kcal');
        console.log('  Sugars:', extracted.sugars, 'g');
        console.log('  Saturated Fat:', extracted.saturatedFat, 'g');
        console.log('  Sodium:', extracted.sodium, 'mg');
        console.log('  Fiber:', extracted.fiber, 'g');
        console.log('  Protein:', extracted.protein, 'g');
        if (extracted.servingSize) {
          console.log('  Serving Size:', extracted.servingSize, 'g (normalized to per 100g)');
        }
      }

      // Call backend API
      const response = await axios.post(
        `${API_BASE_URL}/nutrition/calculate-eu-nutriscore`,
        extracted,
        {
          timeout: 10000
        }
      );

      // Log prediction result (only in development)
      if (__DEV__ && response.data.success) {
        console.log('✅ EU NutriScore Prediction:', {
          score: response.data.eu_nutriscore,
          grade: response.data.grade
        });
      }

      if (response.data.success) {
        return {
          success: true,
          eu_nutriscore: response.data.eu_nutriscore,
          grade: response.data.grade
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Failed to calculate EU Nutri-Score'
        };
      }
    } catch (error) {
      console.error('EU NutriScore calculation error:', error);
      
      let errorMessage = 'Failed to calculate EU Nutri-Score';
      if (error.response) {
        errorMessage = error.response.data?.error || errorMessage;
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        errorMessage = 'NutriScore service is not available. Please check server connection.';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Calculate combined NutriScore for a scanned item
   * Combines EU NutriScore (70%) with model predictions (30%)
   * @param {Object} nutritionData - NutritionFacts object for the scanned item
   * @param {Object} previousDaysNutrition - Previous days' aggregated nutrition totals (optional, uses defaults if not provided)
   * @returns {Promise<Object>} { success, nutriscore, nutriscore_rounded, grade, breakdown, error }
   */
  static async calculateCombinedNutriScoreForScan(nutritionData, previousDaysNutrition = null) {
    try {
      const extracted = this.extractNutritionForPrediction(nutritionData);
      
      if (!extracted) {
        return {
          success: false,
          error: 'No nutrition data provided'
        };
      }

      // Check if we have at least some data
      const hasData = extracted.calories > 0 || extracted.sugars > 0 || 
                     extracted.saturatedFat > 0 || extracted.sodium > 0 ||
                     extracted.fiber > 0 || extracted.protein > 0;

      if (!hasData) {
        return {
          success: false,
          error: 'Insufficient nutrition data to calculate Nutri-Score'
        };
      }

      // Get user profile
      const user = await AuthService.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated. Please login to calculate Nutri-Score.'
        };
      }

      // Prepare user profile
      const userProfile = {
        age: user.age || 30,
        bmi: user.bmi || 22.5,
        gender: user.gender || 'other',
        hba1c: user.hba1c || null
      };

      // Use provided previous days nutrition or defaults for testing
      const prevNutrition = previousDaysNutrition || {
        calories: 2000,
        fat: 65,
        protein: 50,
        carbs: 250,
        sugar: 50,
        fiber: 25,
        sodium: 2300
      };

      // Log for debugging (only in development)
      if (__DEV__) {
        console.log(' Combined NutriScore Calculation:');
        console.log('  Item Nutrition:', extracted);
        console.log('  User Profile:', userProfile);
        console.log('  Previous Days Nutrition:', prevNutrition);
      }

      // Call backend API
      const response = await axios.post(
        `${API_BASE_URL}/nutrition/calculate-scan-nutriscore`,
        {
          item_nutrition: extracted,
          user_profile: userProfile,
          previous_days_nutrition: prevNutrition
        },
        {
          timeout: 10000
        }
      );

      // Log prediction result (only in development)
      if (__DEV__ && response.data.success) {
        console.log('✅ Combined NutriScore Prediction:', {
          score: response.data.nutriscore,
          rounded: response.data.nutriscore_rounded,
          grade: response.data.grade,
          breakdown: response.data.breakdown
        });
      }

      if (response.data.success) {
        return {
          success: true,
          nutriscore: response.data.nutriscore,
          nutriscore_rounded: response.data.nutriscore_rounded,
          grade: response.data.grade,
          breakdown: response.data.breakdown || {}
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Failed to calculate Nutri-Score'
        };
      }
    } catch (error) {
      console.error('Combined NutriScore calculation error:', error);
      
      let errorMessage = 'Failed to calculate Nutri-Score';
      if (error.response) {
        errorMessage = error.response.data?.error || errorMessage;
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        errorMessage = 'NutriScore service is not available. Please check server connection.';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Check if NutriScore service is available
   */
  static async checkServiceHealth() {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/nutrition/nutriscore-health`,
        { timeout: 3000 }
      );
      return response.data.success;
    } catch (error) {
      return false;
    }
  }
}

export default NutriScoreService;
