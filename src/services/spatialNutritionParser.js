/**
 * Advanced Spatial Nutrition Parser
 * Uses computer vision spatial analysis to understand nutrition tables regardless of layout
 */

export class SpatialNutritionParser {
  /**
   * Parse nutrition facts using spatial analysis
   * @param {Object} azureResults - Results from Azure Computer Vision with spatial data
   * @returns {Object} Structured nutrition data
   */
  static parseNutritionFacts(azureResults) {
    if (!azureResults || !azureResults.spatialData) {
      return null;
    }

    const { spatialData } = azureResults;
    
    // Step 1: Identify nutrition facts panel
    const nutritionPanel = this.identifyNutritionPanel(spatialData);
    if (!nutritionPanel) {
      console.log('No nutrition facts panel detected');
      return null;
    }

    // Step 2: Extract structured data using spatial relationships
    const nutritionData = this.extractSpatialNutritionData(nutritionPanel);
    
    if (this.hasValidNutritionData(nutritionData)) {
      return nutritionData;
    }

    return null;
  }

  /**
   * Identify the nutrition facts panel using visual patterns
   */
  static identifyNutritionPanel(spatialData) {
    const { regions, lines } = spatialData;
    
    // Look for nutrition facts indicators
    const nutritionIndicators = [
      'nutrition facts', 'nutrition information', 'nutritional information',
      'serving size', 'calories', 'amount per serving', 'daily value',
      'total fat', 'saturated fat', 'cholesterol', 'sodium', 'carbohydrate'
    ];

    // Find regions that contain nutrition keywords
    const nutritionRegions = [];
    
    for (const region of regions) {
      let nutritionScore = 0;
      const regionText = region.lines.map(line => line.text.toLowerCase()).join(' ');
      
      for (const indicator of nutritionIndicators) {
        if (regionText.includes(indicator)) {
          nutritionScore += indicator === 'nutrition facts' ? 10 : 1;
        }
      }
      
      if (nutritionScore >= 3) {
        nutritionRegions.push({
          ...region,
          nutritionScore
        });
      }
    }

    // Return the region with highest nutrition score
    if (nutritionRegions.length > 0) {
      nutritionRegions.sort((a, b) => b.nutritionScore - a.nutritionScore);
      return nutritionRegions[0];
    }

    // Fallback: analyze all lines for nutrition content
    return { lines: lines, type: 'fallback' };
  }

  /**
   * Extract nutrition data using spatial relationships
   */
  static extractSpatialNutritionData(nutritionPanel) {
    const nutritionData = {
      servingInfo: {},
      calories: {},
      macronutrients: {},
      vitaminsAndMinerals: {},
      additionalInfo: {}
    };

    const lines = nutritionPanel.lines;
    
    // Create spatial maps
    const spatialMap = this.createSpatialMap(lines);
    
    // Extract different types of nutrition information
    this.extractServingInformation(spatialMap, nutritionData.servingInfo);
    this.extractCalorieInformation(spatialMap, nutritionData.calories);
    this.extractMacronutrientInformation(spatialMap, nutritionData.macronutrients);
    this.extractVitaminInformation(spatialMap, nutritionData.vitaminsAndMinerals);
    this.extractAdditionalInformation(spatialMap, nutritionData.additionalInfo);
    
    return nutritionData;
  }

  /**
   * Create spatial map for intelligent parsing
   */
  static createSpatialMap(lines) {
    const map = {
      lines: lines,
      byKeyword: new Map(),
      byPosition: new Map(),
      relationships: []
    };

    // Index lines by keywords
    const nutritionKeywords = [
      // Serving info
      'serving size', 'servings per container', 'portion',
      
      // Calories
      'calories', 'energy', 'kcal',
      
      // Fats
      'total fat', 'fat', 'saturated fat', 'trans fat', 'polyunsaturated', 'monounsaturated',
      
      // Carbs
      'total carbohydrate', 'carbohydrates', 'carbs', 'dietary fiber', 'fibre', 'fiber',
      'sugars', 'added sugars', 'sugar',
      
      // Protein & Others
      'protein', 'sodium', 'cholesterol', 'potassium',
      
      // Vitamins & Minerals
      'vitamin a', 'vitamin c', 'vitamin d', 'vitamin e', 'calcium', 'iron',
      'thiamine', 'riboflavin', 'niacin', 'folate', 'vitamin b12', 'phosphorus',
      'magnesium', 'zinc', 'copper', 'manganese'
    ];

    lines.forEach((line, index) => {
      const lineText = line.text.toLowerCase();
      
      // Index by keywords
      for (const keyword of nutritionKeywords) {
        if (lineText.includes(keyword)) {
          if (!map.byKeyword.has(keyword)) {
            map.byKeyword.set(keyword, []);
          }
          map.byKeyword.get(keyword).push({ line, index });
        }
      }
      
      // Index by spatial position
      const center = this.getLineCenter(line.boundingBox);
      const regionKey = `${Math.floor(center.y / 50)}_${Math.floor(center.x / 100)}`;
      
      if (!map.byPosition.has(regionKey)) {
        map.byPosition.set(regionKey, []);
      }
      map.byPosition.get(regionKey).push({ line, index });
    });

    // Find spatial relationships (values near labels)
    this.findSpatialRelationships(map);
    
    return map;
  }

  /**
   * Find spatial relationships between labels and values
   */
  static findSpatialRelationships(spatialMap) {
    const { lines } = spatialMap;
    const relationships = [];

    lines.forEach((line, index) => {
      const lineCenter = this.getLineCenter(line.boundingBox);
      const lineText = line.text.toLowerCase();
      
      // Skip if this line contains only numbers (likely a value)
      if (/^\d+[\.\d]*\s*(g|mg|%|iu|mcg)*$/i.test(line.text.trim())) {
        return;
      }

      // Look for nearby values (numbers, percentages, units)
      const nearbyValues = [];
      
      lines.forEach((otherLine, otherIndex) => {
        if (index === otherIndex) return;
        
        const otherCenter = this.getLineCenter(otherLine.boundingBox);
        const distance = Math.sqrt(
          Math.pow(lineCenter.x - otherCenter.x, 2) + 
          Math.pow(lineCenter.y - otherCenter.y, 2)
        );
        
        // Check if other line contains numerical values
        const valueMatch = otherLine.text.match(/(\d+(?:\.\d+)?)\s*(g|mg|%|iu|mcg|calories?|kcal)?/gi);
        
        if (valueMatch && distance < 200) { // Within 200 pixels
          nearbyValues.push({
            line: otherLine,
            distance: distance,
            values: valueMatch,
            isRightOf: otherCenter.x > lineCenter.x,
            isBelow: otherCenter.y > lineCenter.y
          });
        }
      });
      
      if (nearbyValues.length > 0) {
        // Sort by distance
        nearbyValues.sort((a, b) => a.distance - b.distance);
        
        relationships.push({
          label: line,
          labelText: lineText,
          values: nearbyValues
        });
      }
    });

    spatialMap.relationships = relationships;
  }

  /**
   * Extract serving information using spatial analysis
   */
  static extractServingInformation(spatialMap, servingInfo) {
    // Look for serving size relationships
    const servingKeywords = ['serving size', 'portion', 'servings per container'];
    
    for (const keyword of servingKeywords) {
      if (spatialMap.byKeyword.has(keyword)) {
        const entries = spatialMap.byKeyword.get(keyword);
        
        for (const entry of entries) {
          // Find nearby values
          const relationship = spatialMap.relationships.find(rel => 
            rel.label === entry.line
          );
          
          if (relationship && relationship.values.length > 0) {
            const value = relationship.values[0].line.text;
            
            if (keyword.includes('container')) {
              servingInfo.servingsPerContainer = value;
            } else {
              servingInfo.servingSize = value;
            }
          }
        }
      }
    }
  }

  /**
   * Extract calorie information using spatial analysis
   */
  static extractCalorieInformation(spatialMap, calorieInfo) {
    const calorieKeywords = ['calories', 'energy', 'kcal'];
    
    for (const keyword of calorieKeywords) {
      if (spatialMap.byKeyword.has(keyword)) {
        const entries = spatialMap.byKeyword.get(keyword);
        
        for (const entry of entries) {
          const lineText = entry.line.text.toLowerCase();
          
          // Check if it's "calories from fat"
          if (lineText.includes('from fat')) {
            const match = entry.line.text.match(/(\d+)/);
            if (match) {
              calorieInfo.fromFat = parseInt(match[1]);
            }
          } else {
            // Regular calories
            const relationship = spatialMap.relationships.find(rel => 
              rel.label === entry.line
            );
            
            if (relationship && relationship.values.length > 0) {
              const match = relationship.values[0].line.text.match(/(\d+)/);
              if (match) {
                calorieInfo.total = parseInt(match[1]);
              }
            } else {
              // Check if calories are in the same line
              const match = entry.line.text.match(/(\d+)/);
              if (match) {
                calorieInfo.total = parseInt(match[1]);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Extract macronutrient information using spatial analysis
   */
  static extractMacronutrientInformation(spatialMap, macroInfo) {
    const macroKeywords = [
      { keywords: ['total fat', 'fat'], key: 'totalFat', unit: 'g' },
      { keywords: ['saturated fat'], key: 'saturatedFat', unit: 'g' },
      { keywords: ['trans fat'], key: 'transFat', unit: 'g' },
      { keywords: ['cholesterol'], key: 'cholesterol', unit: 'mg' },
      { keywords: ['sodium'], key: 'sodium', unit: 'mg' },
      { keywords: ['total carbohydrate', 'carbohydrates'], key: 'totalCarbohydrates', unit: 'g' },
      { keywords: ['dietary fiber', 'fibre', 'fiber'], key: 'dietaryFiber', unit: 'g' },
      { keywords: ['sugars', 'sugar'], key: 'sugars', unit: 'g' },
      { keywords: ['added sugars'], key: 'addedSugars', unit: 'g' },
      { keywords: ['protein'], key: 'protein', unit: 'g' },
      { keywords: ['potassium'], key: 'potassium', unit: 'mg' }
    ];

    for (const macro of macroKeywords) {
      for (const keyword of macro.keywords) {
        if (spatialMap.byKeyword.has(keyword)) {
          const entries = spatialMap.byKeyword.get(keyword);
          
          for (const entry of entries) {
            const values = this.extractNutrientValues(spatialMap, entry);
            if (values.amount !== null) {
              macroInfo[macro.key] = {
                value: values.amount,
                unit: macro.unit,
                dailyValue: values.dailyValue
              };
              break; // Take first match
            }
          }
        }
      }
    }
  }

  /**
   * Extract vitamin and mineral information
   */
  static extractVitaminInformation(spatialMap, vitaminInfo) {
    const vitaminKeywords = [
      { keywords: ['vitamin a'], key: 'vitaminA' },
      { keywords: ['vitamin c'], key: 'vitaminC' },
      { keywords: ['vitamin d'], key: 'vitaminD' },
      { keywords: ['calcium'], key: 'calcium' },
      { keywords: ['iron'], key: 'iron' }
    ];

    for (const vitamin of vitaminKeywords) {
      for (const keyword of vitamin.keywords) {
        if (spatialMap.byKeyword.has(keyword)) {
          const entries = spatialMap.byKeyword.get(keyword);
          
          for (const entry of entries) {
            const values = this.extractNutrientValues(spatialMap, entry);
            if (values.amount !== null || values.dailyValue !== null) {
              vitaminInfo[vitamin.key] = {
                value: values.amount,
                dailyValue: values.dailyValue
              };
              break;
            }
          }
        }
      }
    }
  }

  /**
   * Extract additional information
   */
  static extractAdditionalInformation(spatialMap, additionalInfo) {
    // Look for "not a significant source" statements
    const lines = spatialMap.lines;
    
    for (const line of lines) {
      const text = line.text.toLowerCase();
      if (text.includes('not') && text.includes('significant') && text.includes('source')) {
        // Extract the list of nutrients
        const match = text.match(/source\s+of[:\s]+(.+)/i);
        if (match) {
          const nutrients = match[1].split(/[,&]/).map(n => n.trim());
          additionalInfo.notSignificantSourceOf = nutrients;
        }
      }
    }
  }

  /**
   * Extract nutrient values (amount and daily value percentage)
   */
  static extractNutrientValues(spatialMap, entry) {
    const result = { amount: null, dailyValue: null };
    
    // First check the same line for values
    const lineText = entry.line.text;
    const amountMatch = lineText.match(/(\d+(?:\.\d+)?)\s*(?:g|mg)/i);
    const percentMatch = lineText.match(/(\d+)%/);
    
    if (amountMatch) {
      result.amount = parseFloat(amountMatch[1]);
    }
    if (percentMatch) {
      result.dailyValue = parseInt(percentMatch[1]);
    }
    
    // If not found, look for spatial relationships
    if (result.amount === null || result.dailyValue === null) {
      const relationship = spatialMap.relationships.find(rel => 
        rel.label === entry.line
      );
      
      if (relationship && relationship.values.length > 0) {
        for (const valueEntry of relationship.values) {
          const valueText = valueEntry.line.text;
          
          if (result.amount === null) {
            const amountMatch = valueText.match(/(\d+(?:\.\d+)?)\s*(?:g|mg)?/i);
            if (amountMatch) {
              result.amount = parseFloat(amountMatch[1]);
            }
          }
          
          if (result.dailyValue === null) {
            const percentMatch = valueText.match(/(\d+)%/);
            if (percentMatch) {
              result.dailyValue = parseInt(percentMatch[1]);
            }
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Check if extracted data is valid
   */
  static hasValidNutritionData(data) {
    if (!data) return false;

    const hasCalories = data.calories && (data.calories.total || data.calories.fromFat);
    const hasMacros = data.macronutrients && Object.keys(data.macronutrients).length > 0;
    const hasServing = data.servingInfo && (data.servingInfo.servingSize || data.servingInfo.servingsPerContainer);
    const hasVitamins = data.vitaminsAndMinerals && Object.keys(data.vitaminsAndMinerals).length > 0;

    return hasCalories || hasMacros || hasServing || hasVitamins;
  }

  /**
   * Get center point of a bounding box
   */
  static getLineCenter(boundingBox) {
    if (!boundingBox || boundingBox.length < 8) {
      return { x: 0, y: 0 };
    }
    
    const x = (boundingBox[0] + boundingBox[2] + boundingBox[4] + boundingBox[6]) / 4;
    const y = (boundingBox[1] + boundingBox[3] + boundingBox[5] + boundingBox[7]) / 4;
    
    return { x, y };
  }
}