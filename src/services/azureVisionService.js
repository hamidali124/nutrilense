import { AZURE_COMPUTER_VISION_KEY, AZURE_COMPUTER_VISION_ENDPOINT } from '@env';

export class AzureVisionService {
  /**
   * Extract text using Azure Computer Vision OCR (Read API)
   */
  static async extractText(imageUri) {
    try {
      console.log('Starting Azure Computer Vision text extraction...');
      
      // Convert image to binary data for Azure API (React Native compatible)
      const imageResponse = await fetch(imageUri);
      const imageBuffer = await imageResponse.arrayBuffer();
      
      // Use Azure Read API for advanced OCR
      const readUrl = `${AZURE_COMPUTER_VISION_ENDPOINT}/vision/v3.2/read/analyze`;
      
      // Step 1: Submit image for analysis
      const submitResponse = await fetch(readUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_COMPUTER_VISION_KEY,
          'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer,
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        console.error('Azure Vision API Error Details:', errorText);
        throw new Error(`Azure Computer Vision API error: ${submitResponse.status} - ${errorText}`);
      }

      // Get operation location from response headers
      const operationLocation = submitResponse.headers.get('Operation-Location');
      if (!operationLocation) {
        throw new Error('No operation location received from Azure API');
      }

      console.log('Azure analysis submitted, waiting for results...');

      // Step 2: Poll for results
      let result;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const resultResponse = await fetch(operationLocation, {
          method: 'GET',
          headers: {
            'Ocp-Apim-Subscription-Key': AZURE_COMPUTER_VISION_KEY,
          },
        });

        if (!resultResponse.ok) {
          throw new Error(`Failed to get results: ${resultResponse.status}`);
        }

        result = await resultResponse.json();
        
        if (result.status === 'succeeded') {
          console.log('Azure Computer Vision analysis completed');
          break;
        } else if (result.status === 'failed') {
          throw new Error('Azure analysis failed');
        }
        
        attempts++;
      }

      if (result.status !== 'succeeded') {
        throw new Error('Azure analysis timed out');
      }

      // Process results with spatial information
      return this.processAzureResults(result);
    } catch (error) {
      console.error('Azure Computer Vision text extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract nutrition facts with advanced Azure OCR + parsing
   */
  static async extractNutritionFacts(imageUri) {
    try {
      console.log('Extracting nutrition facts with Azure Computer Vision...');
      
      const base64Image = await this.imageToBase64(imageUri);
      const imageBuffer = Buffer.from(base64Image, 'base64');
      
      // Use Read API for best OCR results
      const readUrl = `${AZURE_COMPUTER_VISION_ENDPOINT}/vision/v3.2/read/analyze`;
      
      // Submit for analysis
      const submitResponse = await fetch(readUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_COMPUTER_VISION_KEY,
          'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer,
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        throw new Error(`Azure API error: ${submitResponse.status} - ${errorText}`);
      }

      const operationLocation = submitResponse.headers.get('Operation-Location');
      
      // Poll for results
      let result;
      let attempts = 0;
      
      while (attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const resultResponse = await fetch(operationLocation, {
          headers: {
            'Ocp-Apim-Subscription-Key': AZURE_COMPUTER_VISION_KEY,
          },
        });

        result = await resultResponse.json();
        
        if (result.status === 'succeeded') break;
        if (result.status === 'failed') throw new Error('Analysis failed');
        
        attempts++;
      }

      if (result.status !== 'succeeded') {
        throw new Error('Analysis timed out');
      }

      // Extract and parse nutrition data
      const rawText = this.extractTextFromResult(result);
      const nutritionData = await this.parseNutritionData(result);
      
      return {
        rawText,
        nutritionFacts: nutritionData,
        confidence: this.calculateConfidence(result),
        processingTime: Date.now(),
      };
    } catch (error) {
      console.error('Azure nutrition extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract raw text from Azure Read API result
   */
  static extractTextFromResult(result) {
    let text = '';
    if (result.analyzeResult && result.analyzeResult.readResults) {
      for (const page of result.analyzeResult.readResults) {
        for (const line of page.lines) {
          text += line.text + '\n';
        }
      }
    }
    return text.trim();
  }

  /**
   * Parse nutrition data from Azure result with spatial awareness
   */
  static async parseNutritionData(result) {
    try {
      const fullText = this.extractTextFromResult(result);
      
      // Initialize nutrition object
      const nutrition = {
        serving_size: null,
        calories: null,
        total_fat: null,
        saturated_fat: null,
        trans_fat: null,
        cholesterol: null,
        sodium: null,
        total_carbs: null,
        dietary_fiber: null,
        total_sugars: null,
        protein: null,
      };

      // Enhanced patterns for nutrition facts
      const patterns = {
        serving_size: /serving\s*size[:\s]*([0-9.]+\s*(?:g|oz|ml|cup|piece|tablet|biscuit)s?)/i,
        calories: /calories[:\s]*([0-9]+)/i,
        total_fat: /total\s*fat[:\s]*([0-9.]+\s*g)/i,
        saturated_fat: /saturated\s*fat[:\s]*([0-9.]+\s*g)/i,
        trans_fat: /trans\s*fat[:\s]*([0-9.]+\s*g)/i,
        cholesterol: /cholesterol[:\s]*([0-9.]+\s*mg)/i,
        sodium: /sodium[:\s]*([0-9.]+\s*mg)/i,
        total_carbs: /total\s*carbohydrate[s]?[:\s]*([0-9.]+\s*g)/i,
        dietary_fiber: /dietary\s*fiber[:\s]*([0-9.]+\s*g)/i,
        total_sugars: /(?:total\s*)?sugars[:\s]*([0-9.]+\s*g)/i,
        protein: /protein[:\s]*([0-9.]+\s*g)/i,
      };

      // Extract nutrition values using patterns
      for (const [key, pattern] of Object.entries(patterns)) {
        const match = fullText.match(pattern);
        if (match) {
          nutrition[key] = match[1].trim();
        }
      }

      // Alternative calorie patterns
      if (!nutrition.calories) {
        const calorieMatch = fullText.match(/([0-9]+)\s*kcal/i);
        if (calorieMatch) nutrition.calories = calorieMatch[1];
      }

      return nutrition;
    } catch (error) {
      console.error('Error parsing nutrition data:', error);
      return {};
    }
  }

  /**
   * Calculate confidence score based on Azure OCR confidence
   */
  static calculateConfidence(result) {
    if (!result.analyzeResult || !result.analyzeResult.readResults) return 0.1;
    
    let totalConfidence = 0;
    let wordCount = 0;
    
    for (const page of result.analyzeResult.readResults) {
      for (const line of page.lines) {
        if (line.words) {
          for (const word of line.words) {
            if (word.confidence !== undefined) {
              totalConfidence += word.confidence;
              wordCount++;
            }
          }
        }
      }
    }
    
    return wordCount > 0 ? totalConfidence / wordCount : 0.5;
  }

  /**
   * Format nutrition data for display
   */
  static formatNutritionData(nutritionFacts) {
    const formatted = {};
    
    for (const [key, value] of Object.entries(nutritionFacts)) {
      if (value) {
        const displayKey = key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        formatted[displayKey] = value;
      }
    }
    
    return formatted;
  }

  /**
   * Process Azure Computer Vision results with spatial information
   */
  static processAzureResults(result) {
    const spatialData = {
      text: '',
      lines: [],
      words: [],
      regions: []
    };

    if (result.analyzeResult && result.analyzeResult.readResults) {
      for (const page of result.analyzeResult.readResults) {
        // Process lines with spatial coordinates
        for (const line of page.lines) {
          const lineData = {
            text: line.text,
            boundingBox: line.boundingBox,
            words: line.words || [],
            confidence: line.confidence || 1.0
          };
          
          spatialData.lines.push(lineData);
          spatialData.text += line.text + '\n';
          
          // Process individual words
          if (line.words) {
            for (const word of line.words) {
              spatialData.words.push({
                text: word.text,
                boundingBox: word.boundingBox,
                confidence: word.confidence || 1.0
              });
            }
          }
        }
      }
    }

    // Analyze spatial regions and table structure
    spatialData.regions = this.analyzeSpatialRegions(spatialData.lines);
    
    return {
      text: spatialData.text.trim(),
      spatialData: spatialData
    };
  }

  /**
   * Analyze spatial regions to identify table structures
   */
  static analyzeSpatialRegions(lines) {
    const regions = [];
    const tolerance = 10; // pixels tolerance for alignment

    // Group lines by vertical position (rows)
    const rows = [];
    lines.forEach(line => {
      const lineY = this.getLineCenter(line.boundingBox).y;
      let addedToRow = false;
      
      for (const row of rows) {
        const rowY = row.y;
        if (Math.abs(lineY - rowY) <= tolerance) {
          row.lines.push(line);
          addedToRow = true;
          break;
        }
      }
      
      if (!addedToRow) {
        rows.push({
          y: lineY,
          lines: [line]
        });
      }
    });

    // Sort rows by vertical position
    rows.sort((a, b) => a.y - b.y);

    // Analyze each row for column structure
    rows.forEach((row, index) => {
      const columns = this.analyzeRowColumns(row.lines);
      regions.push({
        type: 'row',
        index: index,
        y: row.y,
        columns: columns,
        lines: row.lines
      });
    });

    return regions;
  }

  /**
   * Analyze columns within a row
   */
  static analyzeRowColumns(lines) {
    const columns = [];
    const tolerance = 20;

    lines.forEach(line => {
      const lineX = this.getLineCenter(line.boundingBox).x;
      let addedToColumn = false;

      for (const column of columns) {
        if (Math.abs(lineX - column.x) <= tolerance) {
          column.lines.push(line);
          addedToColumn = true;
          break;
        }
      }

      if (!addedToColumn) {
        columns.push({
          x: lineX,
          lines: [line]
        });
      }
    });

    // Sort columns by horizontal position
    columns.sort((a, b) => a.x - b.x);
    return columns;
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