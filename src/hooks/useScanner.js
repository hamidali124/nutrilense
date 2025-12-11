import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { ImageService, HistoryService, AzureVisionService, NutritionParser, SpatialNutritionParser, AINutritionExtractor, IngredientExtractor } from '../services';
import { NutritionFacts } from '../models/nutritionModels';
import NutriScoreService from '../services/nutriscoreService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for handling scanner functionality
 * Supports both nutrition data and ingredient extraction
 */
export const useScanner = (scanMode = 'nutrition') => {
  const { user } = useAuth(); // Get user to access allergens
  const [hasPermission, setHasPermission] = useState(null);
  const [scannedText, setScannedText] = useState('');
  const [nutritionData, setNutritionData] = useState(null);
  const [ingredientData, setIngredientData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ocrService] = useState('azure'); // Only Azure Computer Vision
  const [currentScanMode, setCurrentScanMode] = useState(scanMode);

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    setCurrentScanMode(scanMode);
  }, [scanMode]);

  const requestPermissions = async () => {
    const permission = await ImageService.requestPermissions();
    setHasPermission(permission);
  };

  const takePhoto = async (mode = null) => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant camera permission to use this feature');
      return null; // Return null to indicate cancellation/failure
    }

    // Set mode if provided
    if (mode && mode !== currentScanMode) {
      setCurrentScanMode(mode);
    }

    try {
      // Don't set loading until we actually have an image to process
      const imageUri = await ImageService.takePhoto();
      if (imageUri) {
        // Only set loading when we actually start processing
        setIsLoading(true);
        try {
          // Use the provided mode or current scan mode
          await processImage(imageUri, mode || currentScanMode);
          return imageUri; // Return imageUri on success
        } finally {
          setIsLoading(false);
        }
      }
      // If imageUri is null (user cancelled), return null
      return null;
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
      setIsLoading(false); // Ensure loading is off on error
      return null; // Return null on error
    }
  };

  const pickImage = async (mode = null) => {
    // Set mode if provided
    if (mode && mode !== currentScanMode) {
      setCurrentScanMode(mode);
    }

    try {
      // Don't set loading until we actually have an image to process
      const imageUri = await ImageService.pickImage();
      if (imageUri) {
        // Only set loading when we actually start processing
        setIsLoading(true);
        try {
          // Use the provided mode or current scan mode
          await processImage(imageUri, mode || currentScanMode);
        } finally {
          setIsLoading(false);
        }
      }
      // If imageUri is null (user cancelled), don't set loading at all
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
      setIsLoading(false); // Ensure loading is off on error
    }
  };

  const processImage = async (imageUri, mode = null) => {
    try {
      // Use provided mode or current scan mode
      const processingMode = mode || currentScanMode;
      console.log(`Processing image with Azure Computer Vision (Mode: ${processingMode}):`, imageUri);

      // Use Azure Computer Vision API with spatial analysis
      const azureResults = await AzureVisionService.extractText(imageUri);
      const extractedText = azureResults.text;

      // Store raw text for reference
      setScannedText(extractedText);
      
      // Route to appropriate processor based on scan mode
      if (processingMode === 'ingredients') {
        // Extract ingredients using NLP
        await processIngredientsMode(imageUri, extractedText);
      } else {
        // Default: Extract nutrition data
        await processNutritionMode(imageUri, extractedText, azureResults);
      }
      
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', `Failed to extract text: ${error.message}`);
    }
  };

  const processNutritionMode = async (imageUri, extractedText, azureResults) => {
    // Parse nutrition data using intelligent AI extraction with fallback
    let parsedNutrition = null;
    
    try {
      parsedNutrition = await AINutritionExtractor.extractNutritionFacts(azureResults);
      
      if (!parsedNutrition) {
        // Fallback to spatial parser
        parsedNutrition = SpatialNutritionParser.parseNutritionFacts(azureResults);
      }
      } catch (error) {
        console.log('AI Extractor error, falling back to spatial parser:', error.message);
        parsedNutrition = SpatialNutritionParser.parseNutritionFacts(azureResults);
      }
      
      // Final fallback to text-based parsing
      if (!parsedNutrition) {
        parsedNutrition = NutritionParser.parseNutritionFacts(extractedText);
      }
      
      if (parsedNutrition) {
        // Create nutrition facts object with metadata
        const nutritionFacts = new NutritionFacts();
        Object.assign(nutritionFacts, parsedNutrition);
        nutritionFacts.ocrSource = ocrService;
        nutritionFacts.originalText = extractedText;
        
        // Calculate Nutri-Score (EU first, then combined)
        try {
          // Step 1: Calculate EU NutriScore
          const euNutriscoreResult = await NutriScoreService.calculateEUNutriScoreForItem(nutritionFacts);
          
          // Step 2: Calculate combined NutriScore (EU + models)
          const combinedNutriscoreResult = await NutriScoreService.calculateCombinedNutriScoreForScan(nutritionFacts);
          
          if (combinedNutriscoreResult.success) {
            nutritionFacts.nutriScore = {
              euScore: euNutriscoreResult.success ? euNutriscoreResult.eu_nutriscore : null,
              combinedScore: combinedNutriscoreResult.nutriscore,
              combinedScore_rounded: combinedNutriscoreResult.nutriscore_rounded,
              grade: combinedNutriscoreResult.grade,
              breakdown: combinedNutriscoreResult.breakdown || {}
            };
          } else if (euNutriscoreResult.success) {
            // Fallback: if combined fails, at least store EU score
            nutritionFacts.nutriScore = {
              euScore: euNutriscoreResult.eu_nutriscore,
              combinedScore: null,
              grade: euNutriscoreResult.grade,
              error: combinedNutriscoreResult.error || 'Combined NutriScore calculation failed'
            };
          } else {
            // Both failed
            nutritionFacts.nutriScore = {
              error: combinedNutriscoreResult.error || euNutriscoreResult.error || 'Failed to calculate Nutri-Score'
            };
          }
        } catch (error) {
          // If nutriscore calculation fails, continue without it
          console.error('NutriScore calculation error:', error);
          nutritionFacts.nutriScore = {
            error: 'Failed to calculate Nutri-Score'
          };
        }
        
        setNutritionData(nutritionFacts);
        
        // Save structured nutrition data to history
        await HistoryService.saveScan(imageUri, extractedText, nutritionFacts.toJSON());
        
        // Note: Success alert removed - confirmation modal will be shown instead
      } else {
        // No nutrition data found, just save raw text
        setNutritionData(null);
        await HistoryService.saveScan(imageUri, extractedText);
        // UI will show NoNutritionFound component instead of alert
      }
  };

  const processIngredientsMode = async (imageUri, extractedText) => {
    console.log('Extracting ingredients from image...');
    
    try {
      // Get user's selected allergens (default to empty array if not logged in)
      const userAllergens = user?.allergens || [];
      
      // Use NLP-based ingredient extractor (only check user-selected allergens)
      const ingredientResults = await IngredientExtractor.extractIngredients(extractedText, userAllergens);
      
      if (ingredientResults) {
        console.log(`✅ Successfully extracted ${ingredientResults.totalCount} ingredients`);
        
        setIngredientData(ingredientResults);
        
        // Save to history with ingredient data
        await HistoryService.saveScan(
          imageUri, 
          extractedText, 
          null, // no nutrition data
          ingredientResults // add ingredient data
        );
        
        Alert.alert(
          'Success', 
          `Extracted ${ingredientResults.totalCount} ingredient${ingredientResults.totalCount !== 1 ? 's' : ''}!`
        );
      } else {
        // No ingredients found
        console.log('⚠️ No ingredients found in the scanned text');
        
        setIngredientData(null);
        await HistoryService.saveScan(imageUri, extractedText);
        Alert.alert(
          'Notice', 
          'Could not find ingredients list. Please try scanning a clearer image of the ingredient section.'
        );
      }
    } catch (error) {
      console.error('Ingredient extraction error:', error.message);
      Alert.alert('Error', `Failed to extract ingredients: ${error.message}`);
    }
  };

  const clearResults = () => {
    setScannedText('');
    setNutritionData(null);
    setIngredientData(null);
  };

  const setScanMode = (mode) => {
    setCurrentScanMode(mode);
    clearResults(); // Clear previous results when changing mode
  };

  return {
    hasPermission,
    scannedText,
    nutritionData,
    ingredientData,
    isLoading,
    ocrService,
    currentScanMode,
    takePhoto,
    pickImage,
    clearResults,
    setScanMode,
    requestPermissions
  };
};