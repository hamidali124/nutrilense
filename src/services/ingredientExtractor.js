/**
 * Main Ingredient Extractor Service
 * Orchestrates the entire ingredient extraction pipeline
 * Integrates OCR → NLP → Analysis → Structured Output
 */

import { IngredientNLPService } from './ingredientNLPService';
import { IngredientAnalysisService } from './ingredientAnalysisService';

export class IngredientExtractor {
  
  /**
   * Main extraction pipeline
   * @param {string} ocrText - Raw text from Azure Computer Vision
   * @param {Array} userAllergens - Array of allergen keys selected by user (e.g., ['milk', 'eggs'])
   * @returns {Object} Structured ingredient data or null
   */
  static async extractIngredients(ocrText, userAllergens = []) {
    try {
      console.log('Starting ingredient extraction pipeline...');
      console.log(`Input text length: ${ocrText?.length || 0} characters`);
      
      if (!ocrText || ocrText.trim().length === 0) {
        console.log('No text provided for extraction');
        return null;
      }
      
      // Step 1: Find ingredient section in OCR text
      const ingredientText = this.findIngredientSection(ocrText);
      if (!ingredientText) {
        console.log('No ingredient section found in text');
        return null;
      }
      
      console.log('Found ingredient section');
      console.log(`Ingredient text: "${ingredientText.substring(0, 100)}..."`);
      
      // Step 2: NLP-based ingredient extraction
      console.log('Starting NLP analysis...');
      const ingredients = await IngredientNLPService.analyzeIngredients(ingredientText);
      
      if (!ingredients || ingredients.length === 0) {
        console.log('No ingredients extracted');
        return null;
      }
      
      console.log(`Successfully extracted ${ingredients.length} ingredients`);
      
      // Log extracted ingredients for debugging
      console.log('EXTRACTED INGREDIENTS:');
      ingredients.forEach((ing, index) => {
        console.log(`  ${index + 1}. "${ing.name}" (${ing.source}, confidence: ${ing.confidence})`);
      });
      
      // Step 3: Analyze ingredients for allergens and haram status (only user-selected allergens)
      console.log('Analyzing ingredients for allergens and haram status...');
      const analyzedIngredients = IngredientAnalysisService.batchAnalyze(ingredients, userAllergens);
      
      // Get analysis summary
      const analysisSummary = IngredientAnalysisService.getSummary(analyzedIngredients);
      console.log('Analysis Summary:', {
        allergens: analysisSummary.allergenCount,
        haram: analysisSummary.haramCount,
        doubtful: analysisSummary.doubtfulCount,
        allergenTypes: analysisSummary.allergenTypes
      });
      
      // Step 4: Calculate statistics
      const stats = this.calculateStatistics(analyzedIngredients);
      
      // Step 5: Compile final result
      const result = {
        ingredients: analyzedIngredients,
        totalCount: analyzedIngredients.length,
        eNumberCount: stats.eNumberCount,
        averageConfidence: stats.averageConfidence,
        analysisSummary: analysisSummary,
        rawText: ingredientText,
        extractedAt: new Date().toISOString(),
        nlpUsed: stats.azureEntitiesCount > 0
      };
      
      console.log('📊 Extraction Statistics:', {
        total: result.totalCount,
        eNumbers: result.eNumberCount,
        avgConfidence: result.averageConfidence.toFixed(2),
        nlpUsed: result.nlpUsed
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Ingredient extraction error:', error);
      return null;
    }
  }

  /**
   * Find the ingredient section in OCR text
   * Uses pattern matching to locate ingredient list
   */
  static findIngredientSection(text) {
    if (!text) return null;
    
    console.log('Searching for ingredient section in text...');
    console.log(`Full text preview: "${text.substring(0, 300)}..."`);
    
    // Pattern 1: Look for "Ingredients:" or similar labels with improved extraction
    const labelPatterns = [
      /ingredients?:\s*([^]*?)(?:\n\s*(?:may contain|total|calories|allergen|nutrition|per|energy|fat|protein|carbohydrate|sugar|sodium|fiber|vitamin|mineral)|$)/i,
      /contains?:\s*([^.]+)/i,
      /made\s+with:\s*([^.]+)/i,
      /composition:\s*([^.]+)/i
    ];
    
    for (const pattern of labelPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let extracted = match[1].trim();
        // Clean up nutrition data that might have been included
        extracted = extracted.replace(/(?:total|calories|energy|fat|protein|carb|sugar|sodium|fiber|vitamin|mineral).*$/i, '');
        if (extracted.length > 20) {
          console.log(`Found ingredient section with label pattern: "${extracted.substring(0, 100)}..."`);
          return extracted;
        }
      }
    }
    
    // Pattern 2: Look for comma-separated lists (likely ingredients)
    // If text has multiple commas, it's probably an ingredient list
    const lines = text.split('\n');
    console.log(`Analyzing ${lines.length} lines for ingredient patterns...`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const commaCount = (line.match(/,/g) || []).length;
      
      // Check if line has enough commas and contains food-related words
      if (commaCount >= 3 && line.length > 50) {
        const foodWords = this.countFoodWords(line);
        if (foodWords >= 2) {
          console.log(`Found ingredient line [${i + 1}] with ${commaCount} commas and ${foodWords} food words: "${line.substring(0, 100)}..."`);
          return line.trim();
        }
      }
    }
    
    // Pattern 3: Look for parentheses patterns (common in ingredient lists)
    const parenthesesPattern = /([^.]+\([^)]+\)[^.]*,.*)/i;
    const match = text.match(parenthesesPattern);
    if (match && match[1]) {
      const foodWords = this.countFoodWords(match[1]);
      if (foodWords >= 2) {
        console.log('Found ingredient section with parentheses pattern');
        return match[1].trim();
      }
    }
    
    // Pattern 4: If nothing else works, look for lines with food-related words
    const foodKeywords = ['flour', 'sugar', 'oil', 'milk', 'egg', 'salt', 'water', 'wheat', 'corn', 'soy'];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      const keywordCount = foodKeywords.filter(keyword => lowerLine.includes(keyword)).length;
      if (keywordCount >= 2 && line.length > 30) {
        console.log(`Found ingredient line [${i + 1}] with ${keywordCount} food keywords: "${line.substring(0, 100)}..."`);
        return line.trim();
      }
    }
    
    // If we still haven't found anything and text is reasonably short,
    // assume entire text is ingredients (common for focused scans)
    if (text.length < 500 && text.includes(',')) {
      const foodWords = this.countFoodWords(text);
      if (foodWords >= 1) {
        console.log(`Using entire text as ingredient section (fallback) - found ${foodWords} food words`);
        return text.trim();
      }
    }
    
    console.log('Could not identify ingredient section');
    return null;
  }

  /**
   * Count food-related words in text to assess if it's likely an ingredient list
   */
  static countFoodWords(text) {
    const foodKeywords = [
      'flour', 'sugar', 'oil', 'milk', 'egg', 'salt', 'water', 'wheat', 'corn', 'soy',
      'butter', 'cream', 'cheese', 'vanilla', 'chocolate', 'cocoa', 'starch', 'yeast',
      'powder', 'extract', 'syrup', 'honey', 'vinegar', 'spice', 'herb', 'acid',
      'emulsifier', 'preservative', 'vitamin', 'mineral', 'protein', 'fiber',
      'sodium', 'calcium', 'iron', 'lecithin', 'glucose', 'fructose', 'sucrose'
    ];
    
    const lowerText = text.toLowerCase();
    return foodKeywords.filter(keyword => lowerText.includes(keyword)).length;
  }

  /**
   * Calculate statistics about extracted ingredients
   */
  static calculateStatistics(ingredients) {
    const eNumberCount = ingredients.filter(ing => ing.isENumber).length;
    
    const totalConfidence = ingredients.reduce((sum, ing) => sum + (ing.confidence || 0), 0);
    const averageConfidence = ingredients.length > 0 ? totalConfidence / ingredients.length : 0;
    
    const azureEntitiesCount = ingredients.filter(ing => ing.source === 'azure_nlp').length;
    
    return {
      eNumberCount,
      averageConfidence,
      azureEntitiesCount
    };
  }

  /**
   * Validate if extraction result is meaningful
   */
  static isValidExtraction(result) {
    if (!result || !result.ingredients) {
      return false;
    }
    
    // Should have at least 2 ingredients
    if (result.totalCount < 2) {
      return false;
    }
    
    // Average confidence should be reasonable
    if (result.averageConfidence < 0.3) {
      return false;
    }
    
    return true;
  }

  /**
   * Format ingredients for display
   */
  static formatForDisplay(ingredientData) {
    if (!ingredientData) return null;
    
    const { ingredients, totalCount, eNumberCount, averageConfidence } = ingredientData;
    
    return {
      title: `${totalCount} Ingredient${totalCount !== 1 ? 's' : ''} Found`,
      summary: `Including ${eNumberCount} E-number${eNumberCount !== 1 ? 's' : ''}`,
      confidence: `${(averageConfidence * 100).toFixed(0)}% confidence`,
      items: ingredients.map(ing => ({
        label: ing.name,
        details: this.getIngredientDetails(ing),
        badge: ing.isENumber ? 'E-Number' : null
      }))
    };
  }

  /**
   * Get display details for an ingredient
   */
  static getIngredientDetails(ingredient) {
    const details = [];
    
    if (ingredient.percentage) {
      details.push(ingredient.percentage);
    }
    
    if (ingredient.hasAdditionalInfo) {
      details.push('Has additional info');
    }
    
    if (ingredient.confidence < 0.6) {
      details.push('Low confidence');
    }
    
    return details.join(' • ');
  }
}
