/**
 * Advanced AI Nutrition Extractor
 * Uses machine learning patterns and adaptive algorithms to extract nutrition data
 * from ANY format, layout, or style of nutrition label
 */

export class AINutritionExtractor {
  /**
   * Extract nutrition facts using advanced AI pattern recognition
   * @param {Object} azureResults - Results from Azure Computer Vision with spatial data
   * @returns {Object} Structured nutrition data
   */
  static async extractNutritionFacts(azureResults) {
    if (!azureResults || !azureResults.spatialData) {
      return null;
    }

    console.log('AI Nutrition Extractor: Starting analysis...');
    
    const { spatialData } = azureResults;
    
    // Step 1: Intelligent table detection
    const tables = this.detectTables(spatialData);
    console.log(`Detected ${tables.length} potential nutrition tables`);
    
    // Step 2: Multi-format analysis
    const nutritionData = this.analyzeMultipleFormats(tables, spatialData);
    
    if (this.hasValidNutritionData(nutritionData)) {
      console.log('AI Extractor: Successfully extracted nutrition data');
      return nutritionData;
    }

    return null;
  }

  /**
   * Detect tables using advanced pattern recognition
   */
  static detectTables(spatialData) {
    const { lines, regions } = spatialData;
    const tables = [];

    // Method 1: Grid-based table detection
    const gridTables = this.detectGridTables(lines);
    tables.push(...gridTables);

    // Method 2: Column-aligned table detection
    const columnTables = this.detectColumnAlignedTables(lines);
    tables.push(...columnTables);

    // Method 3: Header-based table detection
    const headerTables = this.detectHeaderBasedTables(lines);
    tables.push(...headerTables);

    // Method 4: Nutrition keyword clustering
    const keywordTables = this.detectNutritionClusters(lines);
    tables.push(...keywordTables);

    // Method 5: Tabular format detection
    const tabularTables = this.detectTabularFormat(lines);
    tables.push(...tabularTables);

    return tables;
  }

  /**
   * Detect grid-based tables (traditional nutrition facts format)
   */
  static detectGridTables(lines) {
    const tables = [];
    const gridTolerance = 15;
    
    // Group lines by Y-coordinate (rows)
    const rows = this.groupLinesByY(lines, gridTolerance);
    
    // Look for rows with multiple aligned columns
    const tableRows = rows.filter(row => {
      const columns = this.groupLinesByX(row.lines, 50);
      return columns.length >= 2; // At least 2 columns
    });

    if (tableRows.length >= 3) { // At least 3 rows for a valid table
      tables.push({
        type: 'grid',
        rows: tableRows,
        confidence: this.calculateGridConfidence(tableRows)
      });
    }

    return tables;
  }

  /**
   * Detect column-aligned tables (European style, multi-column)
   */
  static detectColumnAlignedTables(lines) {
    const tables = [];
    
    // Find potential column headers
    const columnHeaders = this.findColumnHeaders(lines);
    
    if (columnHeaders.length >= 2) {
      // Group remaining lines under these headers
      const tableData = this.groupLinesUnderHeaders(lines, columnHeaders);
      
      if (tableData.rows.length >= 2) {
        tables.push({
          type: 'column-aligned',
          headers: columnHeaders,
          rows: tableData.rows,
          confidence: this.calculateColumnConfidence(tableData)
        });
      }
    }

    return tables;
  }

  /**
   * Detect header-based tables (with "Nutritional Information" etc.)
   */
  static detectHeaderBasedTables(lines) {
    const tables = [];
    
    // Find nutrition headers
    const nutritionHeaders = [
      'nutritional information', 'nutrition facts', 'nutrition information',
      'nutrition', 'ingredienti', 'valori nutrizionali'
    ];

    for (const line of lines) {
      const text = line.text.toLowerCase();
      
      for (const header of nutritionHeaders) {
        if (text.includes(header)) {
          // Find all lines below this header
          const headerY = this.getLineCenter(line.boundingBox).y;
          const linesBelow = lines.filter(l => {
            const ly = this.getLineCenter(l.boundingBox).y;
            return ly > headerY && ly < headerY + 400; // Within 400px below
          });
          
          if (linesBelow.length >= 3) {
            tables.push({
              type: 'header-based',
              header: line,
              lines: linesBelow,
              confidence: this.calculateHeaderConfidence(linesBelow)
            });
          }
        }
      }
    }

    return tables;
  }

  /**
   * Detect nutrition clusters (grouped nutrition keywords)
   */
  static detectNutritionClusters(lines) {
    const tables = [];
    
    const nutritionKeywords = [
      'energy', 'calories', 'protein', 'fat', 'carbohydrates', 'sugar', 'sodium',
      'fibre', 'fiber', 'cholesterol', 'calcium', 'iron', 'vitamin'
    ];

    // Find lines containing nutrition keywords
    const nutritionLines = lines.filter(line => {
      const text = line.text.toLowerCase();
      return nutritionKeywords.some(keyword => text.includes(keyword));
    });

    if (nutritionLines.length >= 3) {
      // Cluster nearby nutrition lines
      const clusters = this.clusterNearbyLines(nutritionLines, 100);
      
      for (const cluster of clusters) {
        if (cluster.length >= 3) {
          tables.push({
            type: 'nutrition-cluster',
            lines: cluster,
            confidence: this.calculateClusterConfidence(cluster)
          });
        }
      }
    }

    return tables;
  }

  /**
   * Detect tabular format nutrition tables (columns with nutrient names and values)
   */
  static detectTabularFormat(lines) {
    const tables = [];
    
    // Look for serving size headers that indicate tabular format
    const servingHeaders = lines.filter(line => 
      line.text.toLowerCase().includes('per 100g') || 
      line.text.toLowerCase().includes('per serving') ||
      line.text.toLowerCase().includes('serving size')
    );

    if (servingHeaders.length === 0) {
      return tables;
    }

    // Find nutrition data rows (lines with parentheses indicating units)
    const nutritionRows = lines.filter(line => {
      const text = line.text.toLowerCase();
      return (text.includes('(') && text.includes(')')) || // Has units like (g), (mg), (kj)
             /^(energy|protein|carbohydrates?|sugars?|fat|fibre|fiber|sodium|calcium|iron)\s/i.test(text);
    });

    // Also include lines that are just numbers (value columns)
    const valueLines = lines.filter(line => 
      /^\d+(\.\d+)?$/.test(line.text.trim())
    );

    if (nutritionRows.length >= 3) {
      tables.push({
        type: 'tabular',
        headers: servingHeaders,
        nutritionRows: nutritionRows,
        valueLines: valueLines,
        allLines: lines,
        confidence: 0.95
      });
    }

    return tables;
  }

  /**
   * Analyze multiple table formats and extract the best nutrition data
   */
  static analyzeMultipleFormats(tables, spatialData) {
    let bestResult = null;
    let highestConfidence = 0;

    for (const table of tables) {
      let result = null;
      
      switch (table.type) {
        case 'grid':
          result = this.extractFromGridTable(table);
          break;
        case 'column-aligned':
          result = this.extractFromColumnTable(table);
          break;
        case 'header-based':
          result = this.extractFromHeaderTable(table);
          break;
        case 'nutrition-cluster':
          result = this.extractFromCluster(table);
          break;
        case 'tabular':
          result = this.extractFromTabularTable(table);
          break;
      }

      if (result && table.confidence > highestConfidence) {
        bestResult = result;
        highestConfidence = table.confidence;
        console.log(`Using ${table.type} extraction method (confidence: ${table.confidence})`);
      }
    }

    return bestResult;
  }

  /**
   * Extract nutrition data from grid-style table
   */
  static extractFromGridTable(table) {
    const nutritionData = {
      servingInfo: {},
      calories: {},
      macronutrients: {},
      vitaminsAndMinerals: {},
      additionalInfo: {}
    };

    // Process each line individually instead of grouping by rows
    const allLines = [];
    for (const row of table.rows) {
      allLines.push(...row.lines);
    }

    // Process lines in pairs (nutrient line + percentage line)
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      const nextLine = allLines[i + 1];
      
      // Try to extract nutrient from current line
      const extracted = this.extractNutrientFromLine(line);
      if (extracted) {
        // Check if next line contains a percentage for daily value
        let dailyValue = null;
        if (nextLine && nextLine.text.match(/^\d+%$/)) {
          dailyValue = parseInt(nextLine.text.replace('%', ''));
          i++; // Skip the percentage line
        }
        
        this.assignNutrientData(extracted.nutrient, extracted.value, extracted.unit, nutritionData, dailyValue);
      }
    }

    return nutritionData;
  }

  /**
   * Extract nutrition data from column-aligned table
   */
  static extractFromColumnTable(table) {
    const nutritionData = {
      servingInfo: {},
      calories: {},
      macronutrients: {},
      vitaminsAndMinerals: {},
      additionalInfo: {}
    };

    // Find serving size from headers
    const servingHeaders = table.headers.filter(h => 
      h.text.toLowerCase().includes('serving') || 
      h.text.toLowerCase().includes('per')
    );

    if (servingHeaders.length > 0) {
      nutritionData.servingInfo.servingSize = servingHeaders[0].text;
    }

    // Process nutrition rows
    for (const row of table.rows) {
      if (row.columns && row.columns.length >= 2) {
        const label = row.columns[0].text.toLowerCase();
        const values = row.columns.slice(1).map(col => col.text);
        
        this.processNutritionRow(label, values, nutritionData);
      }
    }

    return nutritionData;
  }

  /**
   * Extract nutrition data from header-based table
   */
  static extractFromHeaderTable(table) {
    const nutritionData = {
      servingInfo: {},
      calories: {},
      macronutrients: {},
      vitaminsAndMinerals: {},
      additionalInfo: {}
    };

    // Look for serving size information
    const servingLine = table.lines.find(line => 
      line.text.toLowerCase().includes('serving size') ||
      line.text.toLowerCase().includes('per serving')
    );

    if (servingLine) {
      const match = servingLine.text.match(/serving size:?\s*(.+)/i) ||
                    servingLine.text.match(/per serving:?\s*(.+)/i);
      if (match) {
        nutritionData.servingInfo.servingSize = match[1].trim();
      }
    }

    // Process each line for nutrition information
    for (const line of table.lines) {
      const lineText = line.text.toLowerCase();
      
      // Use adaptive value extraction
      const extracted = this.extractNutrientFromLine(line);
      if (extracted) {
        this.assignNutrientData(extracted.nutrient, extracted.value, extracted.unit, nutritionData, extracted.dailyValue);
      }
    }

    return nutritionData;
  }

  /**
   * Extract nutrition data from nutrition cluster
   */
  static extractFromCluster(table) {
    const nutritionData = {
      servingInfo: {},
      calories: {},
      macronutrients: {},
      vitaminsAndMinerals: {},
      additionalInfo: {}
    };

    // Process each line in the cluster
    for (const line of table.lines) {
      const extracted = this.extractNutrientFromLine(line);
      if (extracted) {
        this.assignNutrientData(extracted.nutrient, extracted.value, extracted.unit, nutritionData, extracted.dailyValue);
      }
    }

    return nutritionData;
  }

  /**
   * Extract nutrition data from tabular format (columns: nutrient name | per 100g | per serving)
   */
  static extractFromTabularTable(table) {
    const nutritionData = {
      servingInfo: {},
      calories: {},
      macronutrients: {},
      vitaminsAndMinerals: {},
      additionalInfo: {}
    };

    // Extract serving size information
    const servingLine = table.allLines.find(line => 
      line.text.toLowerCase().includes('serving size:')
    );
    if (servingLine) {
      const match = servingLine.text.match(/serving size:\s*(.+)/i);
      if (match) {
        nutritionData.servingInfo.servingSize = match[1].trim();
      }
    }

    // Also capture "Per 100g." header
    const per100gLine = table.allLines.find(line => 
      line.text.toLowerCase().includes('per 100g')
    );
    if (per100gLine && !nutritionData.servingInfo.servingSize) {
      nutritionData.servingInfo.servingSize = per100gLine.text;
    }

    // Process tabular data - match nutrients with their values
    const allLines = table.allLines;
    
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      
      // Look for nutrition labels with units in parentheses
      const nutrientMatch = line.text.match(/^(energy|protein|carbohydrates?|sugars?|total fat|saturated fat|fibre?|fiber|sodium|calcium|iron|vitamin\s*[a-z]?)\s*\(([^)]+)\)/i);
      
      if (nutrientMatch) {
        const nutrientName = nutrientMatch[1].toLowerCase();
        const unit = nutrientMatch[2];
        
        // Look for the next numeric lines as values
        let j = i + 1;
        const values = [];
        
        // Collect consecutive numeric values
        while (j < allLines.length && /^\d+(\.\d+)?$/.test(allLines[j].text.trim())) {
          values.push(parseFloat(allLines[j].text.trim()));
          j++;
        }
        
        if (values.length > 0) {
          // Use the first value (typically "per 100g" or main value)
          const value = values[0];
          this.assignNutrientData(nutrientName, value, unit, nutritionData);
        }
      }
      
      // Handle special case for "(kcal)" line
      else if (line.text.trim() === '(kcal)') {
        // Look for numeric values after this
        let j = i + 1;
        const values = [];
        
        while (j < allLines.length && /^\d+(\.\d+)?$/.test(allLines[j].text.trim())) {
          values.push(parseFloat(allLines[j].text.trim()));
          j++;
        }
        
        if (values.length > 0) {
          nutritionData.calories.total = values[0];
        }
      }
    }

    return nutritionData;
  }

  /**
   * Advanced nutrient extraction from a single line using multiple patterns
   */
  static extractNutrientFromLine(line) {
    const text = line.text;
    
    // Multiple extraction patterns optimized for the actual OCR format
    const patterns = [
      // Pattern 1: "Total Fat 9g" - Most common format
      /^(total\s+fat|saturated\s+fat|trans\s+fat|total\s+carbohydrate|dietary\s+fiber|total\s+sugars|protein|cholesterol|sodium|potassium)\s+(\d+(?:\.\d+)?)\s*([a-z]+)$/i,
      
      // Pattern 2: "Vitamin D 0mcg" - Vitamins and minerals with units
      /^(vitamin\s+[a-z]|calcium|iron|potassium|zinc|magnesium|phosphorus)\s+(\d+(?:\.\d+)?)\s*([a-z]+)$/i,
      
      // Pattern 3: "Includes 0g Added Sugars" - Special format
      /^includes\s+(\d+(?:\.\d+)?)\s*([a-z]+)\s+(added\s+sugars?)/i,
      
      // Pattern 4: "Calories 18" (value only, no unit)
      /^(calories?|energy)\s+(\d+(?:\.\d+)?)\s*$/i,
      
      // Pattern 5: "Energy (kJ) 2427" - With units in parentheses
      /^(energy|calories?)\s*\([^)]+\)\s*(\d+(?:\.\d+)?)/i,
      
      // Pattern 6: Generic nutrient pattern - fallback
      /(total\s+fat|saturated\s+fat|trans\s+fat|cholesterol|sodium|potassium|total\s+carbohydrate|dietary\s+fiber|total\s+sugars|added\s+sugars|protein|vitamin\s*[a-z]?|calcium|iron|zinc|magnesium)\s+(\d+(?:\.\d+)?)\s*([a-z]+)?/i
    ];

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = text.match(pattern);
      
      if (match) {
        const result = {
          nutrient: match[1].toLowerCase().trim(),
          value: parseFloat(match[2]),
          unit: null,
          dailyValue: null,
          secondaryValue: match[3] ? parseFloat(match[3]) : null
        };
        
        // Handle different pattern structures
        if (i === 2) { // "Includes 0g Added Sugars" pattern
          result.nutrient = match[3].toLowerCase().trim(); // "added sugars"
          result.unit = match[2] || this.guessUnit(match[3]);
        } else if (i === 3) { // Calories pattern (no unit)
          result.unit = 'kcal';
        } else if (i === 4) { // Energy with parentheses
          result.unit = this.guessUnit(match[1]);
        } else { // Standard patterns (0, 1, 5)
          result.unit = match[3] || this.guessUnit(match[1]);
        }
        
        return result;
      }
    }

    return null;
  }

  /**
   * Process a nutrition row with label and multiple values
   */
  static processNutritionRow(label, values, nutritionData) {
    // Find numbers in the values
    const numbers = values.map(v => {
      const match = v.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    }).filter(n => n !== null);

    if (numbers.length > 0) {
      const mainValue = numbers[0];
      const unit = this.guessUnit(label);
      
      this.assignNutrientData(label, mainValue, unit, nutritionData);
    }
  }

  /**
   * Assign nutrient data to the appropriate category
   */
  static assignNutrientData(nutrient, value, unit, nutritionData, dailyValue = null) {
    const cleanNutrient = nutrient.toLowerCase().replace(/[()]/g, '').trim();
    
    // Helper function to create nutrient object with daily value
    const createNutrientObj = (val, u, dv = null) => {
      const obj = { value: val, unit: u };
      if (dv !== null) {
        obj.dailyValue = dv;
      }
      return obj;
    };
    
    // Calories
    if (cleanNutrient.includes('energy') || cleanNutrient.includes('calorie')) {
      if (unit === 'kj') {
        nutritionData.calories.kilojoules = value;
      } else {
        nutritionData.calories.total = value;
      }
    }
    
    // Macronutrients
    else if (cleanNutrient.includes('protein')) {
      nutritionData.macronutrients.protein = createNutrientObj(value, unit || 'g', dailyValue);
    }
    else if (cleanNutrient.includes('fat') && !cleanNutrient.includes('saturated')) {
      nutritionData.macronutrients.totalFat = createNutrientObj(value, unit || 'g', dailyValue);
    }
    else if (cleanNutrient.includes('saturated')) {
      nutritionData.macronutrients.saturatedFat = createNutrientObj(value, unit || 'g', dailyValue);
    }
    else if (cleanNutrient.includes('carbohydrate')) {
      nutritionData.macronutrients.totalCarbohydrates = createNutrientObj(value, unit || 'g', dailyValue);
    }
    else if (cleanNutrient.includes('sugar')) {
      nutritionData.macronutrients.sugars = createNutrientObj(value, unit || 'g', dailyValue);
    }
    else if (cleanNutrient.includes('sodium')) {
      nutritionData.macronutrients.sodium = createNutrientObj(value, unit || 'mg', dailyValue);
    }
    else if (cleanNutrient.includes('fibre') || cleanNutrient.includes('fiber')) {
      nutritionData.macronutrients.dietaryFiber = createNutrientObj(value, unit || 'g', dailyValue);
    }
    
    // Vitamins and Minerals
    else if (cleanNutrient.includes('calcium')) {
      nutritionData.vitaminsAndMinerals.calcium = createNutrientObj(value, unit || 'mg', dailyValue);
    }
    else if (cleanNutrient.includes('iron')) {
      nutritionData.vitaminsAndMinerals.iron = createNutrientObj(value, unit || 'mcg', dailyValue);
    }
    else if (cleanNutrient.includes('vitamin')) {
      const vitaminType = cleanNutrient.match(/vitamin\s*([a-z])/)?.[1];
      if (vitaminType) {
        nutritionData.vitaminsAndMinerals[`vitamin${vitaminType.toUpperCase()}`] = createNutrientObj(value, unit, dailyValue);
      }
    }
  }

  /**
   * Guess appropriate unit for a nutrient
   */
  static guessUnit(nutrient) {
    const n = nutrient.toLowerCase();
    
    if (n.includes('energy')) return 'kj';
    if (n.includes('calorie')) return 'kcal';
    
    // Milligrams for minerals and some vitamins
    if (n.includes('sodium') || n.includes('calcium') || n.includes('cholesterol') || n.includes('potassium')) return 'mg';
    
    // Micrograms for certain vitamins
    if (n.includes('vitamin d') || n.includes('vitamin b12')) return 'mcg';
    
    // Milligrams for most other minerals
    if (n.includes('iron') || n.includes('zinc') || n.includes('magnesium')) return 'mg';
    
    // Grams for macronutrients
    return 'g';
  }

  // Helper methods for spatial analysis
  static groupLinesByY(lines, tolerance = 10) {
    const rows = [];
    
    lines.forEach(line => {
      const y = this.getLineCenter(line.boundingBox).y;
      let added = false;
      
      for (const row of rows) {
        if (Math.abs(row.y - y) <= tolerance) {
          row.lines.push(line);
          added = true;
          break;
        }
      }
      
      if (!added) {
        rows.push({ y, lines: [line] });
      }
    });
    
    return rows.sort((a, b) => a.y - b.y);
  }

  static groupLinesByX(lines, tolerance = 20) {
    const columns = [];
    
    lines.forEach(line => {
      const x = this.getLineCenter(line.boundingBox).x;
      let added = false;
      
      for (const column of columns) {
        if (Math.abs(column.x - x) <= tolerance) {
          column.lines.push(line);
          added = true;
          break;
        }
      }
      
      if (!added) {
        columns.push({ x, lines: [line] });
      }
    });
    
    return columns.sort((a, b) => a.x - b.x);
  }

  static findColumnHeaders(lines) {
    // Look for lines that contain column header keywords
    const headerKeywords = ['per 100g', 'per serving', 'per serve', '% gda', 'daily value', '%'];
    
    return lines.filter(line => {
      const text = line.text.toLowerCase();
      return headerKeywords.some(keyword => text.includes(keyword));
    });
  }

  static groupLinesUnderHeaders(lines, headers) {
    // This is a complex algorithm to group data rows under column headers
    const rows = [];
    // Implementation would group non-header lines into table rows
    return { rows };
  }

  static clusterNearbyLines(lines, maxDistance) {
    const clusters = [];
    const used = new Set();
    
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      
      const cluster = [lines[i]];
      used.add(i);
      const center1 = this.getLineCenter(lines[i].boundingBox);
      
      for (let j = i + 1; j < lines.length; j++) {
        if (used.has(j)) continue;
        
        const center2 = this.getLineCenter(lines[j].boundingBox);
        const distance = Math.sqrt(
          Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2)
        );
        
        if (distance <= maxDistance) {
          cluster.push(lines[j]);
          used.add(j);
        }
      }
      
      clusters.push(cluster);
    }
    
    return clusters;
  }

  // Confidence calculation methods
  static calculateGridConfidence(rows) {
    return Math.min(0.9, 0.3 + (rows.length * 0.1));
  }

  static calculateColumnConfidence(tableData) {
    return Math.min(0.8, 0.4 + (tableData.rows.length * 0.08));
  }

  static calculateHeaderConfidence(lines) {
    const nutritionLines = lines.filter(line => 
      ['protein', 'fat', 'carb', 'calorie', 'energy', 'sodium'].some(keyword => 
        line.text.toLowerCase().includes(keyword)
      )
    );
    return Math.min(0.85, 0.2 + (nutritionLines.length * 0.1));
  }

  static calculateClusterConfidence(cluster) {
    return Math.min(0.7, 0.1 + (cluster.length * 0.15));
  }

  static hasValidNutritionData(data) {
    if (!data) return false;
    
    const hasCalories = data.calories && (data.calories.total || data.calories.kilojoules);
    const hasMacros = data.macronutrients && Object.keys(data.macronutrients).length > 0;
    const hasVitamins = data.vitaminsAndMinerals && Object.keys(data.vitaminsAndMinerals).length > 0;
    
    return hasCalories || hasMacros || hasVitamins;
  }

  static getLineCenter(boundingBox) {
    if (!boundingBox || boundingBox.length < 8) {
      return { x: 0, y: 0 };
    }
    
    const x = (boundingBox[0] + boundingBox[2] + boundingBox[4] + boundingBox[6]) / 4;
    const y = (boundingBox[1] + boundingBox[3] + boundingBox[5] + boundingBox[7]) / 4;
    
    return { x, y };
  }
}