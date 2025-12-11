
export const API_CONFIG = {
  azure: {
    maxImageWidth: 1024,
    imageCompression: 0.8,
    timeout: 60000
  }
};

export const NUTRITION_DATA = {
  // Known allergens list for detection
  allergens: [
    'milk', 'eggs', 'fish', 'shellfish', 'tree nuts', 'peanuts', 
    'wheat', 'soybeans', 'sesame', 'sulfites', 'mustard', 'celery',
    'lupin', 'molluscs'
  ],
  
  // Common haram ingredients 
  haramIngredients: [
    'pork', 'ham', 'bacon', 'lard', 'gelatin', 'alcohol', 'wine',
    'beer', 'rum', 'whiskey', 'vodka', 'ethanol', 'ethyl alcohol'
  ],
  
  // Nutrition thresholds for health warnings
  nutritionThresholds: {
    sodium: { high: 600, unit: 'mg' }, // per serving
    sugar: { high: 15, unit: 'g' },
    saturatedFat: { high: 5, unit: 'g' },
    calories: { high: 300, unit: 'kcal' }
  }
};