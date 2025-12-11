/**
 * Ingredient NLP Service
 * Uses Azure Text Analytics + Custom NLP for intelligent ingredient extraction
 * This is the CORE NLP component that uses machine learning for entity recognition
 */

import axios from 'axios';
import { AZURE_TEXT_ANALYTICS_KEY, AZURE_TEXT_ANALYTICS_ENDPOINT } from '@env';

export class IngredientNLPService {
  
  /**
   * Main NLP processing pipeline
   * @param {string} rawText - Raw text from OCR
   * @returns {Array} Structured ingredients with NLP confidence scores
   */
  static async analyzeIngredients(rawText) {
    console.log('Starting NLP analysis...');
    
    try {
      // Step 1: Clean and preprocess text using linguistic rules
      const cleanedText = this.preprocessText(rawText);
      
      // Step 2: Use Azure Text Analytics for entity recognition (REAL NLP)
      const entities = await this.extractEntitiesWithAzure(cleanedText);
      
      // Step 3: Custom NLP processing for ingredient-specific patterns
      const ingredients = this.extractIngredientNames(cleanedText, entities);
      
      // Step 4: Linguistic analysis for context and structure
      const structuredIngredients = this.structureIngredients(ingredients, cleanedText);
      
      return structuredIngredients;
      
    } catch (error) {
      console.error('NLP Service Error:', error.message);
      // Fallback to pattern-based extraction if Azure fails
      return this.fallbackExtraction(rawText);
    }
  }

  /**
   * Text preprocessing with linguistic rules
   * Applies NLP techniques: tokenization, normalization, noise removal
   */
  static preprocessText(text) {
    console.log('Original text:', text.substring(0, 200));
    
    let cleaned = text
      .toLowerCase()
      // Remove common label patterns
      .replace(/ingredients?:/gi, '')
      .replace(/contains?:/gi, '')
      .replace(/allergens?:/gi, '')
      // Remove Arabic/Urdu text patterns
      .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, ' ')
      // Remove standalone Arabic numerals and symbols
      .replace(/[\u0660-\u0669\u06F0-\u06F9]+/g, ' ')
      // Space out parentheses for better parsing
      .replace(/\(/g, ' (')
      .replace(/\)/g, ') ')
      // Normalize separators (important for tokenization)
      .replace(/[;]/g, ',')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('Cleaned text:', cleaned.substring(0, 200));
    return cleaned;
  }

  /**
   * Azure Text Analytics - Named Entity Recognition (NER)
   */
  static async extractEntitiesWithAzure(text) {
    // Check if credentials are available
    if (!AZURE_TEXT_ANALYTICS_KEY || !AZURE_TEXT_ANALYTICS_ENDPOINT) {
      console.warn('Azure Text Analytics not configured, using fallback');
      return [];
    }

    try {
      const response = await axios.post(
        `${AZURE_TEXT_ANALYTICS_ENDPOINT}/text/analytics/v3.1/entities/recognition/general`,
        {
          documents: [
            {
              id: '1',
              language: 'en',
              text: text
            }
          ]
        },
        {
          headers: {
            'Ocp-Apim-Subscription-Key': AZURE_TEXT_ANALYTICS_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const entities = response.data.documents[0]?.entities || [];
      
      // Filter for food-related entities using semantic understanding
      const foodEntities = entities.filter(entity => 
        this.isFoodRelated(entity.text, entity.category)
      );
      
      return foodEntities.map(entity => ({
        name: entity.text,
        confidence: entity.confidenceScore,
        category: entity.category,
        source: 'azure_nlp'
      }));
      
    } catch (error) {
      if (error.response) {
        console.error(' Azure API Error:', error.response.status, error.response.data);
      } else {
        console.error('Azure Connection Error:', error.message);
      }
      return [];
    }
  }

  /**
   * Custom NLP: Extract ingredient names using multiple techniques
   * Combines rule-based and pattern-based approaches
   */
  static extractIngredientNames(text, azureEntities) {
    console.log('Extracting ingredient names...');
    const ingredients = [];
    
    // Method 1: Use Azure entities as base (highest confidence)
    console.log(`Azure entities found: ${azureEntities.length}`);
    azureEntities.forEach(entity => {
      if (this.isValidIngredientName(entity.name)) {
        ingredients.push({
          name: entity.name,
          confidence: entity.confidence,
          source: 'azure_nlp'
        });
        console.log(`Azure ingredient: "${entity.name}" (confidence: ${entity.confidence})`);
      } else {
        console.log(`Filtered out Azure entity: "${entity.name}" (invalid)`);
      }
    });
    
    // Method 2: Comma-separated pattern (most common format)
    // Improved parsing to handle parentheses correctly
    const commaSeparated = this.smartCommaSplit(text);
    console.log(`Found ${commaSeparated.length} comma-separated items`);
    
    commaSeparated.forEach((item, index) => {
      // Clean and validate each item
      const mainIngredient = item.replace(/\([^)]*\)/g, '').trim();
      
      if (this.isValidIngredientName(mainIngredient) && !this.isCommonWord(mainIngredient)) {
        ingredients.push({
          name: mainIngredient,
          confidence: 0.75,
          source: 'comma_separation'
        });
        console.log(`Comma ingredient [${index + 1}]: "${mainIngredient}"`);
      } else {
        console.log(`Filtered out comma item [${index + 1}]: "${mainIngredient}" (invalid/common word)`);
      }
    });
    
    // Method 3: E-number detection (regex pattern matching)
    const eNumberPattern = /e\d{3,4}[a-z]?/gi;
    const eNumbers = text.match(eNumberPattern);
    
    if (eNumbers) {
      console.log(`Found ${eNumbers.length} E-numbers`);
      eNumbers.forEach(eNum => {
        ingredients.push({
          name: eNum.toUpperCase(),
          confidence: 1.0,
          source: 'e_number_detection',
          isENumber: true
        });
        console.log(`E-number: "${eNum.toUpperCase()}"`);
      });
    }
    
    // Method 4: Bracketed percentages (e.g., "wheat flour (45%)")
    const percentagePattern = /([a-z\s]+)\s*\((\d+\.?\d*%)\)/gi;
    let match;
    while ((match = percentagePattern.exec(text)) !== null) {
      const ingredientName = match[1].trim();
      if (this.isValidIngredientName(ingredientName)) {
        ingredients.push({
          name: ingredientName,
          confidence: 0.9,
          source: 'percentage_pattern',
          percentage: match[2]
        });
        console.log(`Percentage ingredient: "${ingredientName}" (${match[2]})`);
      }
    }
    
    console.log(`Total ingredients extracted: ${ingredients.length}`);
    return this.deduplicateIngredients(ingredients);
  }

  /**
   * Smart comma splitting that respects parentheses
   * Prevents splitting within parenthetical information
   */
  static smartCommaSplit(text) {
    const items = [];
    let current = '';
    let parenDepth = 0;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (char === '(') {
        parenDepth++;
        current += char;
      } else if (char === ')') {
        parenDepth--;
        current += char;
      } else if (char === ',' && parenDepth === 0) {
        if (current.trim()) {
          items.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last item
    if (current.trim()) {
      items.push(current.trim());
    }
    
    return items;
  }

  /**
   * Validate if a string is a valid ingredient name
   * Filters out non-English text and invalid patterns
   */
  static isValidIngredientName(name) {
    if (!name || name.length < 2) return false;
    
    // Check for Arabic/Urdu characters
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
    if (arabicPattern.test(name)) {
      return false;
    }
    
    // Check for too many numbers (likely not an ingredient)
    const numberCount = (name.match(/\d/g) || []).length;
    if (numberCount > name.length / 2) {
      return false;
    }
    
    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(name)) {
      return false;
    }
    
    // Filter out common non-ingredient patterns
    const invalidPatterns = [
      /^\d+$/,           // Only numbers
      /^[^\w\s]+$/,      // Only special characters
      /may contain/i,    // Warning text
      /traces of/i,      // Warning text
      /allergen/i,       // Allergen info
      /manufactured/i,   // Manufacturing info
      /factory/i,        // Factory info
      /storage/i,        // Storage instructions
      /best before/i,    // Expiry info
      /total\s*[a-z]/i,  // Nutrition facts
      /calories/i,       // Nutrition facts
      /energy/i,         // Nutrition facts
      /sodium/i,         // Nutrition facts (when standalone)
      /protein/i,        // Nutrition facts
      /carbohydrate/i,   // Nutrition facts
      /sugar/i,          // Nutrition facts (when in nutrition context)
      /fat/i,            // Nutrition facts (when standalone)
      /fiber/i,          // Nutrition facts
      /vitamin/i,        // Nutrition facts
      /mineral/i,        // Nutrition facts
      /dietary/i,        // Nutrition facts
      /saturated/i,      // Nutrition facts
      /trans/i,          // Nutrition facts
      /properties/i,     // Nutrition facts
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Remove duplicate ingredients and merge similar ones
   */
  static deduplicateIngredients(ingredients) {
    const unique = [];
    const seen = new Set();
    
    // Sort by confidence (highest first) to keep best matches
    const sorted = ingredients.sort((a, b) => b.confidence - a.confidence);
    
    for (const ingredient of sorted) {
      const normalizedName = ingredient.name.toLowerCase().trim();
      
      if (!seen.has(normalizedName)) {
        seen.add(normalizedName);
        unique.push({
          ...ingredient,
          name: this.capitalizeIngredientName(ingredient.name)
        });
      }
    }
    
    return unique;
  }

  /**
   * Properly capitalize ingredient names
   */
  static capitalizeIngredientName(name) {
    // Handle E-numbers specially
    if (/^e\d+/i.test(name)) {
      return name.toUpperCase();
    }
    
    // Capitalize each word
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Structure ingredients with linguistic context
   * Analyzes relationships and adds metadata
   */
  static structureIngredients(ingredients, originalText) {
    return ingredients.map((ing, index) => {
      const context = this.getContext(ing.name, originalText);
      const hasParenInfo = this.hasParentheticalInfo(ing.name, originalText);
      
      return {
        name: this.capitalizeIngredient(ing.name),
        order: index + 1,
        confidence: ing.confidence || 0.5,
        isENumber: ing.isENumber || false,
        percentage: ing.percentage || null,
        context: context,
        hasAdditionalInfo: hasParenInfo,
        source: ing.source
      };
    });
  }

  /**
   * NLP Helper: Semantic analysis to check if text is food-related
   * Uses domain-specific keywords and patterns
   */
  static isFoodRelated(text, category) {
    // Azure categories that likely contain ingredients
    const relevantCategories = ['Product', 'Other'];
    if (!relevantCategories.includes(category)) {
      return false;
    }
    
    const foodKeywords = [
      'flour', 'sugar', 'salt', 'oil', 'water', 'milk', 'egg',
      'wheat', 'corn', 'soy', 'palm', 'butter', 'powder',
      'extract', 'acid', 'starch', 'protein', 'vitamin',
      'preservative', 'flavoring', 'syrup', 'lecithin',
      'yeast', 'glucose', 'fructose', 'maltose', 'dextrose'
    ];
    
    const lowerText = text.toLowerCase();
    const isFood = foodKeywords.some(keyword => lowerText.includes(keyword));
    
    // Also check if it looks like a food ingredient (ends in common suffixes)
    const foodSuffixes = ['flour', 'oil', 'powder', 'extract', 'acid'];
    const hasLikelyFoodPattern = foodSuffixes.some(suffix => lowerText.endsWith(suffix));
    
    return isFood || hasLikelyFoodPattern;
  }

  /**
   * NLP Technique: Get surrounding context for an ingredient
   * Context windows help understand relationships
   */
  static getContext(ingredient, text) {
    const lowerText = text.toLowerCase();
    const lowerIng = ingredient.toLowerCase();
    const index = lowerText.indexOf(lowerIng);
    
    if (index === -1) return '';
    
    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + ingredient.length + 30);
    return text.substring(start, end).trim();
  }

  /**
   * Check if ingredient has additional information in parentheses
   */
  static hasParentheticalInfo(ingredient, text) {
    const pattern = new RegExp(`${this.escapeRegex(ingredient)}\\s*\\([^)]+\\)`, 'i');
    return pattern.test(text);
  }

  /**
   * NLP Technique: Deduplication using similarity matching
   * Handles OCR errors and variations
   */
  static deduplicateIngredients(ingredients) {
    const unique = [];
    const seen = new Set();
    
    ingredients.forEach(ing => {
      // Normalize for comparison (remove spaces, special chars)
      const normalized = ing.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Check for duplicates or very similar entries
      let isDuplicate = false;
      for (const seenNorm of seen) {
        if (this.areSimilar(normalized, seenNorm)) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate && normalized.length > 1) {
        seen.add(normalized);
        unique.push(ing);
      }
    });
    
    return unique;
  }

  /**
   * Similarity matching using Levenshtein-like approach
   * Simple version for ingredient comparison
   */
  static areSimilar(str1, str2) {
    // If strings are exactly the same
    if (str1 === str2) return true;
    
    // If one contains the other (substring match)
    if (str1.includes(str2) || str2.includes(str1)) return true;
    
    // If they're very close in length and content (fuzzy match)
    if (Math.abs(str1.length - str2.length) <= 2) {
      let differences = 0;
      const maxLen = Math.max(str1.length, str2.length);
      for (let i = 0; i < maxLen; i++) {
        if (str1[i] !== str2[i]) differences++;
        if (differences > 2) return false;
      }
      return differences <= 2;
    }
    
    return false;
  }

  /**
   * Capitalize ingredient names properly
   */
  static capitalizeIngredient(name) {
    // Keep E-numbers uppercase
    if (/^e\d+/i.test(name)) {
      return name.toUpperCase();
    }
    
    // Capitalize first letter of each word
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Check if word is a common non-ingredient word
   */
  static isCommonWord(word) {
    const commonWords = [
      'and', 'or', 'with', 'from', 'for', 'the', 'contains', 
      'may', 'contain', 'traces', 'of', 'in', 'a', 'an',
      'ingredients', 'allergens', 'contains'
    ];
    return commonWords.includes(word.toLowerCase().trim());
  }

  /**
   * Escape special regex characters
   */
  static escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Fallback extraction when Azure is unavailable
   * Uses pattern-based approaches only
   */
  static fallbackExtraction(text) {
    console.log('⚠️ Using fallback extraction (Azure unavailable)');
    
    const cleaned = this.preprocessText(text);
    const ingredients = [];
    
    // Simple comma-separated extraction
    const items = cleaned.split(',');
    items.forEach((item, index) => {
      const trimmed = item.trim();
      if (trimmed.length > 2 && !this.isCommonWord(trimmed)) {
        ingredients.push({
          name: this.capitalizeIngredient(trimmed),
          order: index + 1,
          confidence: 0.5,
          source: 'fallback_pattern'
        });
      }
    });
    
    return ingredients;
  }
}
