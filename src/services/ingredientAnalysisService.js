// Cache for loaded data
let allergenDataCache = null;
let haramDataCache = null;

/**
 * Service for analyzing ingredients for allergens and haram status
 * Matches ingredient names against comprehensive databases
 */
export class IngredientAnalysisService {
  
  static getAllergenData() {
    if (!allergenDataCache) {
      try {
        allergenDataCache = require('../data/allergens.json');
        console.log('✅ Allergen data loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load allergen data:', error);
        throw error;
      }
    }
    return allergenDataCache;
  }
  
  static getHaramData() {
    if (!haramDataCache) {
      try {
        haramDataCache = require('../data/haramIngredients.json');
        console.log('✅ Haram data loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load haram data:', error);
        throw error;
      }
    }
    return haramDataCache;
  }
  
  /**
   * Analyze a single ingredient for allergens and haram status
   * @param {string} ingredientName - The ingredient name to analyze
   * @returns {Object} Analysis results with allergen and haram information
   */
  static analyzeIngredient(ingredientName) {
    const normalizedName = ingredientName.toLowerCase().trim();
    
    const allergenInfo = this.checkAllergens(normalizedName);
    const haramInfo = this.checkHaramStatus(normalizedName);
    
    return {
      allergenInfo,
      haramInfo,
      hasAllergens: allergenInfo.isAllergen,
      isHaram: haramInfo.status === 'haram',
      isDoubtful: haramInfo.status === 'doubtful',
    };
  }

  /**
   * Check if ingredient matches any allergen
   * @param {string} ingredientName - Normalized ingredient name
   * @returns {Object} Allergen information
   */
  static checkAllergens(ingredientName) {
    const allergenData = this.getAllergenData();
    const matches = [];
    
    // Check major allergens
    for (const [allergenKey, allergenInfo] of Object.entries(allergenData.majorAllergens)) {
      const match = this.findMatch(ingredientName, allergenInfo.names, allergenInfo.eNumbers);
      if (match) {
        matches.push({
          type: allergenKey,
          severity: allergenInfo.severity,
          category: allergenInfo.category,
          matchedTerm: match.term,
          matchType: match.type,
          displayName: this.formatAllergenName(allergenKey),
        });
      }
    }

    // Check common allergens
    for (const [allergenKey, allergenInfo] of Object.entries(allergenData.commonAllergens)) {
      const match = this.findMatch(ingredientName, allergenInfo.names);
      if (match) {
        matches.push({
          type: allergenKey,
          severity: allergenInfo.severity,
          category: allergenInfo.category,
          matchedTerm: match.term,
          matchType: match.type,
          displayName: this.formatAllergenName(allergenKey),
        });
      }
    }

    // Check rare allergens
    for (const [allergenKey, allergenInfo] of Object.entries(allergenData.rareAllergens || {})) {
      const match = this.findMatch(ingredientName, allergenInfo.names);
      if (match) {
        matches.push({
          type: allergenKey,
          severity: allergenInfo.severity,
          category: allergenInfo.category,
          matchedTerm: match.term,
          matchType: match.type,
          displayName: this.formatAllergenName(allergenKey),
        });
      }
    }

    return {
      isAllergen: matches.length > 0,
      matches: matches,
      count: matches.length,
    };
  }

  /**
   * Check haram status of ingredient
   * @param {string} ingredientName - Normalized ingredient name
   * @returns {Object} Haram status information
   */
  static checkHaramStatus(ingredientName) {
    const haramData = this.getHaramData();
    
    // Check direct ingredient matches
    for (const [key, ingredientData] of Object.entries(haramData.haramIngredients)) {
      const match = this.findMatch(ingredientName, ingredientData.names, ingredientData.eNumbers);
      if (match) {
        return {
          status: ingredientData.severity,
          category: ingredientData.category,
          source: ingredientData.source,
          matchedTerm: match.term,
          matchType: match.type,
          notes: ingredientData.notes,
          displayName: this.formatIngredientName(key),
        };
      }
    }

    // Check E-number status
    const eNumberMatch = ingredientName.match(/e\d{3,4}[a-z]?/i);
    if (eNumberMatch) {
      const haramData = this.getHaramData();
      const eNumber = eNumberMatch[0].toUpperCase();
      const eNumberData = haramData.eNumbersHaramStatus[eNumber];
      
      if (eNumberData) {
        return {
          status: eNumberData.status,
          category: 'e-number',
          source: eNumberData.source,
          matchedTerm: eNumber,
          matchType: 'e-number',
          reason: eNumberData.reason,
          displayName: eNumberData.name,
        };
      }
    }

    // Not found in haram database - assume halal
    return {
      status: 'halal',
      category: 'unknown',
      source: 'not_in_database',
      matchedTerm: null,
      matchType: null,
      displayName: null,
    };
  }

  /**
   * Find if ingredient name matches any term in the lists
   * @param {string} ingredientName - The ingredient to check
   * @param {Array} namesList - List of possible names
   * @param {Array} eNumbers - List of E-numbers (optional)
   * @returns {Object|null} Match information or null
   */
  static findMatch(ingredientName, namesList = [], eNumbers = []) {
    // Exact match in names
    for (const name of namesList) {
      if (ingredientName === name.toLowerCase()) {
        return { term: name, type: 'exact' };
      }
    }

    // Contains match in names (ingredient contains the allergen term)
    for (const name of namesList) {
      const normalizedName = name.toLowerCase();
      if (ingredientName.includes(normalizedName)) {
        return { term: name, type: 'contains' };
      }
    }

    // E-number match
    const eNumberMatch = ingredientName.match(/e\d{3,4}[a-z]?/i);
    if (eNumberMatch && eNumbers.length > 0) {
      const eNumber = eNumberMatch[0].toUpperCase();
      if (eNumbers.includes(eNumber)) {
        return { term: eNumber, type: 'e-number' };
      }
    }

    return null;
  }

  /**
   * Format allergen name for display
   */
  static formatAllergenName(key) {
    const nameMap = {
      milk: 'Milk/Dairy',
      eggs: 'Eggs',
      fish: 'Fish',
      shellfish: 'Shellfish',
      treeNuts: 'Tree Nuts',
      peanuts: 'Peanuts',
      wheat: 'Wheat/Gluten',
      soybeans: 'Soy',
      sesame: 'Sesame',
      celery: 'Celery',
      mustard: 'Mustard',
      lupin: 'Lupin',
      sulphites: 'Sulphites',
      molluscs: 'Molluscs',
      coconut: 'Coconut',
      corn: 'Corn',
    };
    return nameMap[key] || key.replace(/([A-Z])/g, ' $1').trim();
  }

  /**
   * Format ingredient name for display
   */
  static formatIngredientName(key) {
    const nameMap = {
      pork: 'Pork',
      alcohol: 'Alcohol',
      gelatinPork: 'Gelatin (Pork)',
      enzymes: 'Animal Enzymes',
      emulsifiers: 'Emulsifiers',
      fattyAcids: 'Fatty Acids',
      lecithin: 'Lecithin',
      coloring: 'Cochineal Coloring',
      animalMeat: 'Animal Meat',
      seafoodRestricted: 'Seafood',
      animalFats: 'Animal Fats',
      dairy: 'Dairy',
      processingAids: 'Processing Aids',
    };
    return nameMap[key] || key.replace(/([A-Z])/g, ' $1').trim();
  }

  /**
   * Batch analyze multiple ingredients
   * @param {Array} ingredients - Array of ingredient objects with 'name' property
   * @returns {Array} Ingredients with analysis results
   */
  static batchAnalyze(ingredients) {
    return ingredients.map(ingredient => {
      const analysis = this.analyzeIngredient(ingredient.name);
      return {
        ...ingredient,
        ...analysis,
      };
    });
  }

  /**
   * Get summary statistics for analyzed ingredients
   * @param {Array} analyzedIngredients - Array of analyzed ingredients
   * @returns {Object} Summary statistics
   */
  static getSummary(analyzedIngredients) {
    const summary = {
      total: analyzedIngredients.length,
      allergenCount: 0,
      haramCount: 0,
      doubtfulCount: 0,
      allergenTypes: new Set(),
      haramCategories: new Set(),
    };

    analyzedIngredients.forEach(ingredient => {
      if (ingredient.hasAllergens) {
        summary.allergenCount++;
        ingredient.allergenInfo.matches.forEach(match => {
          summary.allergenTypes.add(match.displayName);
        });
      }
      
      if (ingredient.isHaram) {
        summary.haramCount++;
        if (ingredient.haramInfo.category) {
          summary.haramCategories.add(ingredient.haramInfo.category);
        }
      }
      
      if (ingredient.isDoubtful) {
        summary.doubtfulCount++;
      }
    });

    return {
      ...summary,
      allergenTypes: Array.from(summary.allergenTypes),
      haramCategories: Array.from(summary.haramCategories),
    };
  }

  /**
   * Get halal alternatives for a specific ingredient
   * @param {string} ingredientName - The ingredient to find alternatives for
   * @returns {Array} List of halal alternatives
   */
  static getHalalAlternatives(ingredientName) {
    const haramData = this.getHaramData();
    const normalizedName = ingredientName.toLowerCase().trim();
    
    // Check if it's gelatin
    if (normalizedName.includes('gelatin') || normalizedName.includes('gelatine')) {
      return haramData.halalAlternatives.gelatin || [];
    }
    
    // Check if it's an emulsifier
    const emulsifierENumbers = ['e471', 'e472', 'e473', 'e474', 'e475', 'e476', 'e477'];
    if (emulsifierENumbers.some(e => normalizedName.includes(e))) {
      return haramData.halalAlternatives.emulsifiers || [];
    }
    
    // Check if it's an enzyme
    if (normalizedName.includes('enzyme') || normalizedName.includes('pepsin') || 
        normalizedName.includes('rennet')) {
      return haramData.halalAlternatives.enzymes || [];
    }
    
    return [];
  }
}
