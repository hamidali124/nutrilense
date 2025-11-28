import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { ImageService, HistoryService, AzureVisionService, NutritionParser, SpatialNutritionParser, AINutritionExtractor, IngredientExtractor } from '../services';
import { NutritionFacts } from '../models/nutritionModels';

/**
 * Custom hook for handling scanner functionality
 * Supports both nutrition data and ingredient extraction
 */
export const useScanner = (scanMode = 'nutrition') => {
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
      return;
    }

    // Set mode if provided
    if (mode && mode !== currentScanMode) {
      setCurrentScanMode(mode);
    }

    setIsLoading(true);
    try {
      const imageUri = await ImageService.takePhoto();
      if (imageUri) {
        // Use the provided mode or current scan mode
        await processImage(imageUri, mode || currentScanMode);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async (mode = null) => {
    // Set mode if provided
    if (mode && mode !== currentScanMode) {
      setCurrentScanMode(mode);
    }

    setIsLoading(true);
    try {
      const imageUri = await ImageService.pickImage();
      if (imageUri) {
        // Use the provided mode or current scan mode
        await processImage(imageUri, mode || currentScanMode);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setIsLoading(false);
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
        
        setNutritionData(nutritionFacts);
        
        // Save structured nutrition data to history
        await HistoryService.saveScan(imageUri, extractedText, nutritionFacts.toJSON());
        
        Alert.alert('Success', 'Nutrition data extracted successfully!');
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
      // Use NLP-based ingredient extractor
      const ingredientResults = await IngredientExtractor.extractIngredients(extractedText);
      
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
      console.error('❌ Ingredient extraction error:', error.message);
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

  // OCR service switching removed - only Azure Computer Vision is used

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