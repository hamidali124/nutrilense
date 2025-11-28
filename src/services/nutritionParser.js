/**
 * Intelligent Nutrition Data Parser
 * Extracts structured nutrition facts from raw OCR text
 */

export class NutritionParser {
  /**
   * Parse raw OCR text and extract structured nutrition data
   * @param {string} rawText - Raw text from OCR services
   * @returns {Object} Structured nutrition data
   */
  static parseNutritionFacts(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return null;
    }

    // Clean and normalize the text
    const cleanText = this.cleanText(rawText);
    
    // Extract nutrition data
    const nutritionData = {
      servingInfo: this.extractServingInfo(cleanText),
      calories: this.extractCalories(cleanText),
      macronutrients: this.extractMacronutrients(cleanText),
      vitaminsAndMinerals: this.extractVitaminsAndMinerals(cleanText),
      additionalInfo: this.extractAdditionalInfo(cleanText)
    };

    // Only return if we found meaningful nutrition data
    if (this.hasValidNutritionData(nutritionData)) {
      return nutritionData;
    }

    return null;
  }

  /**
   * Clean and normalize OCR text
   */
  static cleanText(text) {
    return text
      .replace(/[^\w\s\.\,\(\)\%\-\+\/\:]/g, ' ') // Remove special chars except useful ones
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .toLowerCase()
      .trim();
  }

  /**
   * Extract serving size and container information
   */
  static extractServingInfo(text) {
    const servingInfo = {};

    // Serving size patterns
    const servingSizePatterns = [
      /serving\s+size[:\s]+(.+?)(?:\n|$|calories|amount)/i,
      /servings?\s+per\s+container[:\s]+(.+?)(?:\n|$|amount)/i,
      /portion[:\s]+(.+?)(?:\n|$|calories)/i
    ];

    for (const pattern of servingSizePatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1].trim();
        if (value.includes('container') || value.includes('about') || /^\d+$/.test(value)) {
          servingInfo.servingsPerContainer = value;
        } else {
          servingInfo.servingSize = value;
        }
      }
    }

    return servingInfo;
  }

  /**
   * Extract calorie information
   */
  static extractCalories(text) {
    const calories = {};

    // Calories patterns
    const caloriesPattern = /calories[:\s]+(\d+)/i;
    const caloriesFromFatPattern = /calories\s+from\s+fat[:\s]+(\d+)/i;

    const caloriesMatch = text.match(caloriesPattern);
    if (caloriesMatch) {
      calories.total = parseInt(caloriesMatch[1]);
    }

    const fatCaloriesMatch = text.match(caloriesFromFatPattern);
    if (fatCaloriesMatch) {
      calories.fromFat = parseInt(fatCaloriesMatch[1]);
    }

    return calories;
  }

  /**
   * Extract macronutrients (fats, carbs, proteins)
   */
  static extractMacronutrients(text) {
    const macros = {};

    // Fat patterns
    const fatPatterns = [
      { key: 'totalFat', pattern: /total\s+fat[:\s]+(\d+(?:\.\d+)?)\s*g?/i },
      { key: 'saturatedFat', pattern: /saturated\s+fat[:\s]+(\d+(?:\.\d+)?)\s*g?/i },
      { key: 'transFat', pattern: /trans\s+fat[:\s]+(\d+(?:\.\d+)?)\s*g?/i },
      { key: 'polyunsaturatedFat', pattern: /polyunsaturated\s+fat[:\s]+(\d+(?:\.\d+)?)\s*g?/i },
      { key: 'monounsaturatedFat', pattern: /monounsaturated\s+fat[:\s]+(\d+(?:\.\d+)?)\s*g?/i }
    ];

    // Carbohydrate patterns
    const carbPatterns = [
      { key: 'totalCarbohydrates', pattern: /total\s+carbohydrate[s]?[:\s]+(\d+(?:\.\d+)?)\s*g?/i },
      { key: 'dietaryFiber', pattern: /dietary\s+fib(?:er|re)[:\s]+(\d+(?:\.\d+)?)\s*g?/i },
      { key: 'sugars', pattern: /sugars[:\s]+(\d+(?:\.\d+)?)\s*g?/i },
      { key: 'addedSugars', pattern: /added\s+sugars[:\s]+(\d+(?:\.\d+)?)\s*g?/i }
    ];

    // Protein patterns
    const proteinPattern = /protein[:\s]+(\d+(?:\.\d+)?)\s*g?/i;

    // Extract fats
    fatPatterns.forEach(({ key, pattern }) => {
      const match = text.match(pattern);
      if (match) {
        macros[key] = {
          value: parseFloat(match[1]),
          unit: 'g',
          dailyValue: this.extractDailyValue(text, key)
        };
      }
    });

    // Extract carbohydrates
    carbPatterns.forEach(({ key, pattern }) => {
      const match = text.match(pattern);
      if (match) {
        macros[key] = {
          value: parseFloat(match[1]),
          unit: 'g',
          dailyValue: this.extractDailyValue(text, key)
        };
      }
    });

    // Extract protein
    const proteinMatch = text.match(proteinPattern);
    if (proteinMatch) {
      macros.protein = {
        value: parseFloat(proteinMatch[1]),
        unit: 'g',
        dailyValue: this.extractDailyValue(text, 'protein')
      };
    }

    // Extract sodium and cholesterol
    const sodiumMatch = text.match(/sodium[:\s]+(\d+(?:\.\d+)?)\s*mg?/i);
    if (sodiumMatch) {
      macros.sodium = {
        value: parseFloat(sodiumMatch[1]),
        unit: 'mg',
        dailyValue: this.extractDailyValue(text, 'sodium')
      };
    }

    const cholesterolMatch = text.match(/cholesterol[:\s]+(\d+(?:\.\d+)?)\s*mg?/i);
    if (cholesterolMatch) {
      macros.cholesterol = {
        value: parseFloat(cholesterolMatch[1]),
        unit: 'mg',
        dailyValue: this.extractDailyValue(text, 'cholesterol')
      };
    }

    return macros;
  }

  /**
   * Extract vitamins and minerals
   */
  static extractVitaminsAndMinerals(text) {
    const vitamins = {};

    const vitaminPatterns = [
      { key: 'vitaminA', pattern: /vitamin\s+a[:\s]+(\d+(?:\.\d+)?)\s*(?:iu|mcg|%)?/i },
      { key: 'vitaminC', pattern: /vitamin\s+c[:\s]+(\d+(?:\.\d+)?)\s*(?:mg|%)?/i },
      { key: 'vitaminD', pattern: /vitamin\s+d[:\s]+(\d+(?:\.\d+)?)\s*(?:iu|mcg|%)?/i },
      { key: 'calcium', pattern: /calcium[:\s]+(\d+(?:\.\d+)?)\s*(?:mg|%)?/i },
      { key: 'iron', pattern: /iron[:\s]+(\d+(?:\.\d+)?)\s*(?:mg|%)?/i },
      { key: 'potassium', pattern: /potassium[:\s]+(\d+(?:\.\d+)?)\s*(?:mg|%)?/i }
    ];

    vitaminPatterns.forEach(({ key, pattern }) => {
      const match = text.match(pattern);
      if (match) {
        vitamins[key] = {
          value: parseFloat(match[1]),
          dailyValue: this.extractDailyValue(text, key)
        };
      }
    });

    return vitamins;
  }

  /**
   * Extract additional nutrition information
   */
  static extractAdditionalInfo(text) {
    const additional = {};

    // Look for "not a significant source of" statements
    const notSignificantMatch = text.match(/not\s+a\s+significant\s+source\s+of[:\s]+(.+?)(?:\.|$)/i);
    if (notSignificantMatch) {
      additional.notSignificantSourceOf = notSignificantMatch[1]
        .split(/[,&]/)
        .map(item => item.trim())
        .filter(item => item.length > 0);
    }

    // Extract allergen information
    const allergenPatterns = [
      /contains[:\s]+(.+?)(?:\.|$)/i,
      /may\s+contain[:\s]+(.+?)(?:\.|$)/i,
      /allergens?[:\s]+(.+?)(?:\.|$)/i
    ];

    allergenPatterns.forEach(pattern => {
      const match = text.match(pattern);
      if (match) {
        additional.allergens = match[1]
          .split(/[,&]/)
          .map(item => item.trim())
          .filter(item => item.length > 0);
      }
    });

    return additional;
  }

  /**
   * Extract daily value percentage for a nutrient
   */
  static extractDailyValue(text, nutrientKey) {
    // Look for percentage near the nutrient name
    const patterns = [
      new RegExp(`${nutrientKey}[^\\n]*?(\\d+)\\s*%`, 'i'),
      new RegExp(`(\\d+)\\s*%[^\\n]*${nutrientKey}`, 'i')
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }

    return null;
  }

  /**
   * Check if the extracted data contains meaningful nutrition information
   */
  static hasValidNutritionData(data) {
    if (!data) return false;

    // Check if we have at least calories OR any macronutrients
    const hasCalories = data.calories && (data.calories.total || data.calories.fromFat);
    const hasMacros = data.macronutrients && Object.keys(data.macronutrients).length > 0;
    const hasServing = data.servingInfo && (data.servingInfo.servingSize || data.servingInfo.servingsPerContainer);

    return hasCalories || hasMacros || hasServing;
  }

  /**
   * Format the parsed nutrition data for display
   */
  static formatForDisplay(nutritionData) {
    if (!nutritionData) return null;

    const formatted = {
      title: 'Nutrition Facts',
      sections: []
    };

    // Serving information section
    if (nutritionData.servingInfo && Object.keys(nutritionData.servingInfo).length > 0) {
      formatted.sections.push({
        title: 'Serving Information',
        items: Object.entries(nutritionData.servingInfo).map(([key, value]) => ({
          label: this.formatLabel(key),
          value: value
        }))
      });
    }

    // Calories section
    if (nutritionData.calories && Object.keys(nutritionData.calories).length > 0) {
      formatted.sections.push({
        title: 'Calories',
        items: Object.entries(nutritionData.calories).map(([key, value]) => ({
          label: this.formatLabel(key),
          value: value
        }))
      });
    }

    // Macronutrients section
    if (nutritionData.macronutrients && Object.keys(nutritionData.macronutrients).length > 0) {
      formatted.sections.push({
        title: 'Macronutrients',
        items: Object.entries(nutritionData.macronutrients).map(([key, data]) => ({
          label: this.formatLabel(key),
          value: data.value,
          unit: data.unit,
          dailyValue: data.dailyValue
        }))
      });
    }

    // Vitamins and minerals section
    if (nutritionData.vitaminsAndMinerals && Object.keys(nutritionData.vitaminsAndMinerals).length > 0) {
      formatted.sections.push({
        title: 'Vitamins & Minerals',
        items: Object.entries(nutritionData.vitaminsAndMinerals).map(([key, data]) => ({
          label: this.formatLabel(key),
          value: data.value,
          dailyValue: data.dailyValue
        }))
      });
    }

    return formatted;
  }

  /**
   * Format camelCase keys to readable labels
   */
  static formatLabel(key) {
    const labelMap = {
      servingSize: 'Serving Size',
      servingsPerContainer: 'Servings Per Container',
      total: 'Total Calories',
      fromFat: 'Calories from Fat',
      totalFat: 'Total Fat',
      saturatedFat: 'Saturated Fat',
      transFat: 'Trans Fat',
      polyunsaturatedFat: 'Polyunsaturated Fat',
      monounsaturatedFat: 'Monounsaturated Fat',
      totalCarbohydrates: 'Total Carbohydrates',
      dietaryFiber: 'Dietary Fiber',
      sugars: 'Sugars',
      addedSugars: 'Added Sugars',
      protein: 'Protein',
      sodium: 'Sodium',
      cholesterol: 'Cholesterol',
      vitaminA: 'Vitamin A',
      vitaminC: 'Vitamin C',
      vitaminD: 'Vitamin D',
      calcium: 'Calcium',
      iron: 'Iron',
      potassium: 'Potassium'
    };

    return labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
  }
}