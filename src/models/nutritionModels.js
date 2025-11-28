/**
 * Nutrition Data Models and Types
 * Defines the structure for nutrition information
 */

/**
 * Nutrition Value with unit and daily value percentage
 */
export class NutritionValue {
  constructor(value, unit = null, dailyValue = null) {
    this.value = value;
    this.unit = unit;
    this.dailyValue = dailyValue;
  }

  toString() {
    let result = this.value.toString();
    if (this.unit) result += this.unit;
    if (this.dailyValue) result += ` (${this.dailyValue}% DV)`;
    return result;
  }
}

/**
 * Serving Information
 */
export class ServingInfo {
  constructor() {
    this.servingSize = null;
    this.servingsPerContainer = null;
  }
}

/**
 * Calorie Information
 */
export class CalorieInfo {
  constructor() {
    this.total = null;
    this.fromFat = null;
  }
}

/**
 * Macronutrients (Fats, Carbs, Proteins, etc.)
 */
export class Macronutrients {
  constructor() {
    // Fats
    this.totalFat = null;
    this.saturatedFat = null;
    this.transFat = null;
    this.polyunsaturatedFat = null;
    this.monounsaturatedFat = null;
    
    // Carbohydrates
    this.totalCarbohydrates = null;
    this.dietaryFiber = null;
    this.sugars = null;
    this.addedSugars = null;
    
    // Protein
    this.protein = null;
    
    // Other
    this.sodium = null;
    this.cholesterol = null;
    this.potassium = null;
  }
}

/**
 * Vitamins and Minerals
 */
export class VitaminsAndMinerals {
  constructor() {
    this.vitaminA = null;
    this.vitaminC = null;
    this.vitaminD = null;
    this.vitaminE = null;
    this.vitaminK = null;
    this.thiamine = null;
    this.riboflavin = null;
    this.niacin = null;
    this.vitaminB6 = null;
    this.folate = null;
    this.vitaminB12 = null;
    this.biotin = null;
    this.pantothenicAcid = null;
    this.calcium = null;
    this.iron = null;
    this.phosphorus = null;
    this.iodine = null;
    this.magnesium = null;
    this.zinc = null;
    this.selenium = null;
    this.copper = null;
    this.manganese = null;
    this.chromium = null;
    this.molybdenum = null;
  }
}

/**
 * Additional Nutrition Information
 */
export class AdditionalInfo {
  constructor() {
    this.allergens = [];
    this.notSignificantSourceOf = [];
    this.ingredients = [];
    this.organicCertification = false;
    this.nonGMO = false;
  }
}

/**
 * Complete Nutrition Facts Data Structure
 */
export class NutritionFacts {
  constructor() {
    this.servingInfo = new ServingInfo();
    this.calories = new CalorieInfo();
    this.macronutrients = new Macronutrients();
    this.vitaminsAndMinerals = new VitaminsAndMinerals();
    this.additionalInfo = new AdditionalInfo();
    
    // Metadata
    this.scanDate = new Date();
    this.ocrSource = null; // 'azure', 'google', 'ocrspace'
    this.confidence = null; // OCR confidence score
    this.originalText = null; // Raw OCR text for reference
  }

  /**
   * Check if this nutrition facts contains any meaningful data
   */
  hasData() {
    const hasCalories = this.calories.total !== null || this.calories.fromFat !== null;
    const hasMacros = Object.values(this.macronutrients).some(value => value !== null);
    const hasVitamins = Object.values(this.vitaminsAndMinerals).some(value => value !== null);
    const hasServing = this.servingInfo.servingSize !== null || this.servingInfo.servingsPerContainer !== null;
    
    return hasCalories || hasMacros || hasVitamins || hasServing;
  }

  /**
   * Get a summary of the most important nutrition values
   */
  getSummary() {
    const summary = {};
    
    if (this.calories.total) summary.calories = this.calories.total;
    if (this.macronutrients.totalFat) summary.totalFat = this.macronutrients.totalFat;
    if (this.macronutrients.totalCarbohydrates) summary.carbs = this.macronutrients.totalCarbohydrates;
    if (this.macronutrients.protein) summary.protein = this.macronutrients.protein;
    if (this.macronutrients.sodium) summary.sodium = this.macronutrients.sodium;
    
    return summary;
  }

  /**
   * Convert to JSON for storage/transmission
   */
  toJSON() {
    return {
      servingInfo: this.servingInfo,
      calories: this.calories,
      macronutrients: this.macronutrients,
      vitaminsAndMinerals: this.vitaminsAndMinerals,
      additionalInfo: this.additionalInfo,
      scanDate: this.scanDate.toISOString(),
      ocrSource: this.ocrSource,
      confidence: this.confidence,
      originalText: this.originalText
    };
  }

  /**
   * Create NutritionFacts from JSON data
   */
  static fromJSON(json) {
    const facts = new NutritionFacts();
    
    Object.assign(facts.servingInfo, json.servingInfo || {});
    Object.assign(facts.calories, json.calories || {});
    Object.assign(facts.macronutrients, json.macronutrients || {});
    Object.assign(facts.vitaminsAndMinerals, json.vitaminsAndMinerals || {});
    Object.assign(facts.additionalInfo, json.additionalInfo || {});
    
    facts.scanDate = new Date(json.scanDate);
    facts.ocrSource = json.ocrSource;
    facts.confidence = json.confidence;
    facts.originalText = json.originalText;
    
    return facts;
  }
}

/**
 * Nutrition Display Formatting Helpers
 */
export class NutritionFormatter {
  /**
   * Format a nutrition value for display
   */
  static formatValue(nutritionValue) {
    if (!nutritionValue || nutritionValue.value === null || nutritionValue.value === undefined) {
      return 'Not specified';
    }
    
    let result = nutritionValue.value.toString();
    if (nutritionValue.unit) {
      result += nutritionValue.unit;
    }
    
    return result;
  }

  /**
   * Format daily value percentage
   */
  static formatDailyValue(dailyValue) {
    if (!dailyValue && dailyValue !== 0) return null;
    return `${dailyValue}% Daily Value`;
  }

  /**
   * Get display color based on daily value percentage
   */
  static getDailyValueColor(dailyValue) {
    if (!dailyValue && dailyValue !== 0) return '#666666'; // Gray for no data
    
    if (dailyValue <= 5) return '#28a745'; // Green - low
    if (dailyValue <= 20) return '#ffc107'; // Yellow - moderate  
    return '#dc3545'; // Red - high
  }

  /**
   * Format calories for display
   */
  static formatCalories(calories) {
    if (!calories || (!calories.total && !calories.fromFat)) {
      return 'Calories not specified';
    }
    
    let result = '';
    if (calories.total) {
      result += `${calories.total} calories`;
    }
    if (calories.fromFat) {
      result += result ? ` (${calories.fromFat} from fat)` : `${calories.fromFat} calories from fat`;
    }
    
    return result;
  }
}