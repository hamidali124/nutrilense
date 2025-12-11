import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './authService';

// Get user-specific storage keys
const getTrackerKey = async () => {
  const user = await AuthService.getUser();
  const userId = user?.id || 'anonymous';
  return `@nutrilens_nutrition_tracker_${userId}`;
};

const getDailyLimitsKey = async () => {
  const user = await AuthService.getUser();
  const userId = user?.id || 'anonymous';
  return `@nutrilens_daily_limits_${userId}`;
};

/**
 * Service for tracking consumed nutrition throughout the day
 */
export class NutritionTrackerService {
  /**
   * Get current daily nutrition totals
   */
  static async getDailyTotals() {
    try {
      const trackerKey = await getTrackerKey();
      const data = await AsyncStorage.getItem(trackerKey);
      if (!data) {
        return this.getEmptyTotals();
      }
      
      const parsed = JSON.parse(data);
      const today = new Date().toDateString();
      
      // Check if data is for today, if not reset
      if (parsed.date !== today) {
        await this.resetDailyTotals();
        return this.getEmptyTotals();
      }
      
      return parsed.totals || this.getEmptyTotals();
    } catch (error) {
      console.error('Error getting daily totals:', error);
      return this.getEmptyTotals();
    }
  }

  /**
   * Get empty totals structure
   */
  static getEmptyTotals() {
    return {
      calories: 0,
      carbs: 0,
      fat: 0,
      protein: 0,
      sugar: 0
    };
  }

  /**
   * Add nutrition data to daily totals
   * Handles different spellings and formats
   * Clamps negative values to 0 to prevent invalid totals
   */
  static async addNutrition(nutritionData) {
    try {
      const totals = await this.getDailyTotals();
      const extracted = this.extractNutritionValues(nutritionData);
      
      // Clamp negative values to 0 before adding
      totals.calories += Math.max(0, extracted.calories || 0);
      totals.carbs += Math.max(0, extracted.carbs || 0);
      totals.fat += Math.max(0, extracted.fat || 0);
      totals.protein += Math.max(0, extracted.protein || 0);
      totals.sugar += Math.max(0, extracted.sugar || 0);
      
      // Ensure totals never go negative (defensive check)
      totals.calories = Math.max(0, totals.calories);
      totals.carbs = Math.max(0, totals.carbs);
      totals.fat = Math.max(0, totals.fat);
      totals.protein = Math.max(0, totals.protein);
      totals.sugar = Math.max(0, totals.sugar);
      
      const today = new Date().toDateString();
      const trackerKey = await getTrackerKey();
      await AsyncStorage.setItem(trackerKey, JSON.stringify({
        date: today,
        totals
      }));
      
      return totals;
    } catch (error) {
      console.error('Error adding nutrition:', error);
      throw error;
    }
  }

  /**
   * Extract nutrition values from NutritionFacts object
   * Handles different spellings and data structures
   */
  static extractNutritionValues(nutritionData) {
    const extracted = {
      calories: 0,
      carbs: 0,
      fat: 0,
      protein: 0,
      sugar: 0
    };

    if (!nutritionData) return extracted;

    // Extract calories (handles: calories, energy, kcal)
    if (nutritionData.calories) {
      if (typeof nutritionData.calories === 'object') {
        extracted.calories = this.getNumericValue(nutritionData.calories.total) || 
                            this.getNumericValue(nutritionData.calories.kilojoules) / 4.184 || // Convert kJ to kcal
                            0;
      } else {
        extracted.calories = this.getNumericValue(nutritionData.calories) || 0;
      }
    }
    
    // Also check for energy field
    if (!extracted.calories && nutritionData.energy) {
      extracted.calories = this.getNumericValue(nutritionData.energy) || 0;
    }

    // Extract macronutrients
    if (nutritionData.macronutrients) {
      const macros = nutritionData.macronutrients;
      
      // Carbs (handles: totalCarbohydrates, carbs, carbohydrate, totalCarbs)
      extracted.carbs = this.getNumericValue(
        macros.totalCarbohydrates || 
        macros.carbs || 
        macros.carbohydrate || 
        macros.totalCarbs
      ) || 0;
      
      // Fat (handles: totalFat, fat)
      extracted.fat = this.getNumericValue(
        macros.totalFat || 
        macros.fat
      ) || 0;
      
      // Protein
      extracted.protein = this.getNumericValue(macros.protein) || 0;
      
      // Sugar (handles: sugars, sugar, totalSugars)
      extracted.sugar = this.getNumericValue(
        macros.sugars || 
        macros.sugar || 
        macros.totalSugars
      ) || 0;
    }

    // Fallback: Check root level for alternative field names
    if (!extracted.carbs) {
      extracted.carbs = this.getNumericValue(
        nutritionData.carbohydrates ||
        nutritionData.carbs ||
        nutritionData.totalCarbohydrates
      ) || 0;
    }

    if (!extracted.fat) {
      extracted.fat = this.getNumericValue(
        nutritionData.fat ||
        nutritionData.totalFat
      ) || 0;
    }

    if (!extracted.protein) {
      extracted.protein = this.getNumericValue(nutritionData.protein) || 0;
    }

    if (!extracted.sugar) {
      extracted.sugar = this.getNumericValue(
        nutritionData.sugar ||
        nutritionData.sugars
      ) || 0;
    }

    return extracted;
  }

  /**
   * Get numeric value from various formats
   * Handles: number, object with value property, string
   * Clamps negative values to 0
   */
  static getNumericValue(value) {
    if (value === null || value === undefined) return 0;
    
    let num = 0;
    
    // If it's already a number
    if (typeof value === 'number') {
      num = isNaN(value) ? 0 : value;
    }
    // If it's an object with value property
    else if (typeof value === 'object' && value.value !== undefined) {
      num = parseFloat(value.value);
      num = isNaN(num) ? 0 : num;
    }
    // If it's a string, try to extract number
    else if (typeof value === 'string') {
      const match = value.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        num = parseFloat(match[1]);
        num = isNaN(num) ? 0 : num;
      }
    }
    
    // Clamp negative values to 0
    return Math.max(0, num);
  }

  /**
   * Reset daily totals
   */
  static async resetDailyTotals() {
    try {
      const today = new Date().toDateString();
      const trackerKey = await getTrackerKey();
      await AsyncStorage.setItem(trackerKey, JSON.stringify({
        date: today,
        totals: this.getEmptyTotals()
      }));
      return this.getEmptyTotals();
    } catch (error) {
      console.error('Error resetting daily totals:', error);
      throw error;
    }
  }

  /**
   * Get daily limits (can be customized per user)
   */
  static async getDailyLimits() {
    try {
      const limitsKey = await getDailyLimitsKey();
      const limits = await AsyncStorage.getItem(limitsKey);
      if (limits) {
        return JSON.parse(limits);
      }
      
      // Default limits
      return {
        calories: 2000,
        carbs: 300,
        fat: 65,
        protein: 50,
        sugar: 50
      };
    } catch (error) {
      console.error('Error getting daily limits:', error);
      return {
        calories: 2000,
        carbs: 300,
        fat: 65,
        protein: 50,
        sugar: 50
      };
    }
  }

  /**
   * Set custom daily limits
   */
  static async setDailyLimits(limits) {
    try {
      const limitsKey = await getDailyLimitsKey();
      await AsyncStorage.setItem(limitsKey, JSON.stringify(limits));
    } catch (error) {
      console.error('Error setting daily limits:', error);
      throw error;
    }
  }
}

