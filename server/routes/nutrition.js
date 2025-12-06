const express = require('express');
const router = express.Router();
const axios = require('axios');

// Python service URL (defaults to localhost:5000)
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';

/**
 * POST /api/nutrition/calculate-eu-nutriscore
 * Calculate EU Nutri-Score for a single item (per 100g)
 * 
 * Request body:
 * {
 *   calories: number (kcal),
 *   sugars: number (g),
 *   saturatedFat: number (g),
 *   sodium: number (mg),
 *   fiber: number (g),
 *   protein: number (g),
 *   servingSize: number (g) - optional, for normalization
 * }
 */
router.post('/calculate-eu-nutriscore', async (req, res) => {
  try {
    const {
      calories,
      sugars,
      saturatedFat,
      sodium,
      fiber,
      protein,
      servingSize
    } = req.body;

    // Validate required fields
    if (calories === undefined || sugars === undefined || 
        saturatedFat === undefined || sodium === undefined ||
        fiber === undefined || protein === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required nutrition fields. Need: calories, sugars, saturatedFat, sodium, fiber, protein'
      });
    }

    // Normalize to per 100g if serving size is provided
    let normalizedData = {
      energy_kcal_100g: parseFloat(calories) || 0,
      sugars_100g: parseFloat(sugars) || 0,
      saturated_fat_100g: parseFloat(saturatedFat) || 0,
      sodium_mg_100g: parseFloat(sodium) || 0,
      fiber_100g: parseFloat(fiber) || 0,
      proteins_100g: parseFloat(protein) || 0
    };

    // If serving size is provided, normalize to per 100g
    if (servingSize && servingSize > 0) {
      const factor = 100 / servingSize;
      normalizedData.energy_kcal_100g = normalizedData.energy_kcal_100g * factor;
      normalizedData.sugars_100g = normalizedData.sugars_100g * factor;
      normalizedData.saturated_fat_100g = normalizedData.saturated_fat_100g * factor;
      normalizedData.sodium_mg_100g = normalizedData.sodium_mg_100g * factor;
      normalizedData.fiber_100g = normalizedData.fiber_100g * factor;
      normalizedData.proteins_100g = normalizedData.proteins_100g * factor;
    }

    // Call Python service
    try {
      const response = await axios.post(`${PYTHON_SERVICE_URL}/calculate-eu-nutriscore`, normalizedData, {
        timeout: 5000
      });

      if (response.data.success) {
        return res.json({
          success: true,
          eu_nutriscore: response.data.eu_nutriscore,
          grade: response.data.grade
        });
      } else {
        return res.status(500).json({
          success: false,
          error: response.data.error || 'Python service returned error'
        });
      }
    } catch (pythonError) {
      console.error('Python service error:', pythonError.message);
      
      if (pythonError.code === 'ECONNREFUSED' || pythonError.code === 'ETIMEDOUT') {
        return res.status(503).json({
          success: false,
          error: 'NutriScore prediction service is not available. Please ensure the Python service is running on port 5000.'
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to calculate EU Nutri-Score',
        details: process.env.NODE_ENV === 'development' ? pythonError.message : undefined
      });
    }
  } catch (error) {
    console.error('Error calculating EU Nutri-Score:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/nutrition/calculate-scan-nutriscore
 * Calculate combined Nutri-Score for a scanned item
 * Combines EU NutriScore (70%) with model predictions (30%)
 * 
 * Request body:
 * {
 *   item_nutrition: {
 *     calories: number (kcal),
 *     sugars: number (g),
 *     saturatedFat: number (g),
 *     sodium: number (mg),
 *     fiber: number (g),
 *     protein: number (g),
 *     servingSize: number (g) - optional
 *   },
 *   user_profile: {
 *     age: number,
 *     bmi: number,
 *     gender: string ('male' | 'female' | 'other'),
 *     hba1c: number - optional
 *   },
 *   previous_days_nutrition: {
 *     calories: number,
 *     fat: number,
 *     protein: number,
 *     carbs: number,
 *     sugar: number,
 *     fiber: number,
 *     sodium: number
 *   }
 * }
 */
router.post('/calculate-scan-nutriscore', async (req, res) => {
  try {
    const { item_nutrition, user_profile, previous_days_nutrition } = req.body;

    // Validate required fields
    if (!item_nutrition || !user_profile || !previous_days_nutrition) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields. Need: item_nutrition, user_profile, previous_days_nutrition'
      });
    }

    // Normalize item nutrition to per 100g
    const {
      calories,
      sugars,
      saturatedFat,
      sodium,
      fiber,
      protein,
      servingSize
    } = item_nutrition;

    let itemNutritionPer100g = {
      energy_kcal_100g: parseFloat(calories) || 0,
      sugars_100g: parseFloat(sugars) || 0,
      saturated_fat_100g: parseFloat(saturatedFat) || 0,
      sodium_mg_100g: parseFloat(sodium) || 0,
      fiber_100g: parseFloat(fiber) || 0,
      proteins_100g: parseFloat(protein) || 0
    };

    // Normalize to per 100g if serving size is provided
    if (servingSize && servingSize > 0) {
      const factor = 100 / servingSize;
      itemNutritionPer100g.energy_kcal_100g *= factor;
      itemNutritionPer100g.sugars_100g *= factor;
      itemNutritionPer100g.saturated_fat_100g *= factor;
      itemNutritionPer100g.sodium_mg_100g *= factor;
      itemNutritionPer100g.fiber_100g *= factor;
      itemNutritionPer100g.proteins_100g *= factor;
    }

    // Prepare request for Python service
    const pythonRequest = {
      item_nutrition: itemNutritionPer100g,
      user_profile: {
        age: parseFloat(user_profile.age) || 30,
        bmi: parseFloat(user_profile.bmi) || 22.5,
        gender: user_profile.gender || 'other',
        hba1c: user_profile.hba1c ? parseFloat(user_profile.hba1c) : null
      },
      previous_days_nutrition: {
        calories: parseFloat(previous_days_nutrition.calories) || 2000,
        fat: parseFloat(previous_days_nutrition.fat) || 65,
        protein: parseFloat(previous_days_nutrition.protein) || 50,
        carbs: parseFloat(previous_days_nutrition.carbs) || 250,
        sugar: parseFloat(previous_days_nutrition.sugar) || 50,
        fiber: parseFloat(previous_days_nutrition.fiber) || 25,
        sodium: parseFloat(previous_days_nutrition.sodium) || 2300
      }
    };

    // Call Python service
    try {
      const response = await axios.post(`${PYTHON_SERVICE_URL}/calculate-scan-nutriscore`, pythonRequest, {
        timeout: 10000 // 10 second timeout
      });

      if (response.data.success) {
        return res.json({
          success: true,
          nutriscore: response.data.nutriscore,
          nutriscore_rounded: response.data.nutriscore_rounded,
          grade: response.data.grade,
          breakdown: response.data.breakdown
        });
      } else {
        return res.status(500).json({
          success: false,
          error: response.data.error || 'Python service returned error'
        });
      }
    } catch (pythonError) {
      console.error('Python service error:', pythonError.message);
      
      if (pythonError.code === 'ECONNREFUSED' || pythonError.code === 'ETIMEDOUT') {
        return res.status(503).json({
          success: false,
          error: 'NutriScore prediction service is not available. Please ensure the Python service is running on port 5000.'
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to calculate Nutri-Score',
        details: process.env.NODE_ENV === 'development' ? pythonError.message : undefined
      });
    }
  } catch (error) {
    console.error('Error calculating Nutri-Score:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/nutrition/nutriscore-health
 * Check if Python NutriScore service is available
 */
router.get('/nutriscore-health', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/health`, {
      timeout: 2000
    });
    return res.json({
      success: true,
      python_service: response.data,
      python_service_url: PYTHON_SERVICE_URL
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      error: 'Python NutriScore service is not available',
      python_service_url: PYTHON_SERVICE_URL
    });
  }
});

module.exports = router;
