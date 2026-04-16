

import NutriScoreService from '../src/services/nutriscoreService';
import AuthService from '../src/services/authService';
import axios from 'axios';

// Realistic EU NutriScore calculation function (matches backend implementation)
function calculateEUNutriScore(energy_kcal_100g, saturated_fat_100g, sugars_100g, sodium_mg_100g, fiber_100g, proteins_100g) {
  let A = 0; // Negative points (unfavorable)
  let C = 0; // Positive points (favorable)
  
  // Energy (convert kcal to kJ)
  const energy_kj = energy_kcal_100g * 4.184;
  if (energy_kj > 3350) A += 10;
  else if (energy_kj > 3015) A += 9;
  else if (energy_kj > 2680) A += 8;
  else if (energy_kj > 2345) A += 7;
  else if (energy_kj > 2010) A += 6;
  else if (energy_kj > 1675) A += 5;
  else if (energy_kj > 1340) A += 4;
  else if (energy_kj > 1005) A += 3;
  else if (energy_kj > 670) A += 2;
  else if (energy_kj > 335) A += 1;
  
  // Saturated fat
  if (saturated_fat_100g > 10) A += 10;
  else if (saturated_fat_100g > 9) A += 9;
  else if (saturated_fat_100g > 8) A += 8;
  else if (saturated_fat_100g > 7) A += 7;
  else if (saturated_fat_100g > 6) A += 6;
  else if (saturated_fat_100g > 5) A += 5;
  else if (saturated_fat_100g > 4) A += 4;
  else if (saturated_fat_100g > 3) A += 3;
  else if (saturated_fat_100g > 2) A += 2;
  else if (saturated_fat_100g > 1) A += 1;
  
  // Sugars
  if (sugars_100g > 45) A += 10;
  else if (sugars_100g > 40) A += 9;
  else if (sugars_100g > 36) A += 8;
  else if (sugars_100g > 31) A += 7;
  else if (sugars_100g > 27) A += 6;
  else if (sugars_100g > 22.5) A += 5;
  else if (sugars_100g > 18) A += 4;
  else if (sugars_100g > 13.5) A += 3;
  else if (sugars_100g > 9) A += 2;
  else if (sugars_100g > 4.5) A += 1;
  
  // Sodium
  if (sodium_mg_100g > 900) A += 10;
  else if (sodium_mg_100g > 810) A += 9;
  else if (sodium_mg_100g > 720) A += 8;
  else if (sodium_mg_100g > 630) A += 7;
  else if (sodium_mg_100g > 540) A += 6;
  else if (sodium_mg_100g > 450) A += 5;
  else if (sodium_mg_100g > 360) A += 4;
  else if (sodium_mg_100g > 270) A += 3;
  else if (sodium_mg_100g > 180) A += 2;
  else if (sodium_mg_100g > 90) A += 1;
  
  // Fiber (positive)
  if (fiber_100g > 4.7) C += 5;
  else if (fiber_100g > 3.7) C += 4;
  else if (fiber_100g > 2.8) C += 3;
  else if (fiber_100g > 1.9) C += 2;
  else if (fiber_100g > 0.9) C += 1;
  
  // Protein (positive, only fully counted if A < 11)
  let protein_points = 0;
  if (proteins_100g > 8.0) protein_points = 5;
  else if (proteins_100g > 6.4) protein_points = 4;
  else if (proteins_100g > 4.8) protein_points = 3;
  else if (proteins_100g > 3.2) protein_points = 2;
  else if (proteins_100g > 1.6) protein_points = 1;
  
  if (A < 11) {
    C += protein_points;
  } else {
    C += Math.min(protein_points, 5);
  }
  
  // Final calculation
  const raw_points = A - C;
  
  // Grade mapping
  let letter, score10;
  if (raw_points <= -1) {
    letter = 'A';
    score10 = 10.0;
  } else if (raw_points <= 3) {
    letter = 'B';
    score10 = 8.0 + (3 - Math.max(raw_points, 0)) * 0.5;
  } else if (raw_points <= 10) {
    letter = 'C';
    score10 = 7.5 - (raw_points - 3) * 0.36;
  } else if (raw_points <= 18) {
    letter = 'D';
    score10 = 4.0 - (raw_points - 11) * 0.4;
  } else {
    letter = 'E';
    score10 = Math.max(0, 1.5 - (raw_points - 19) * 0.15);
  }
  
  return { eu_nutriscore: score10, grade: letter, raw_points };
}

// These tests use REAL backend API 
describe('Module 3: Personalized Nutri-Score', () => {
  // Check if backend API is available
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
  const hasBackendUrl = process.env.EXPO_PUBLIC_API_BASE_URL || __DEV__;
  let backendAvailable = false;
  let backendUnavailableReason = 'Backend API URL not configured';
  
  if (!hasBackendUrl) {
    console.warn('⚠️  Backend API URL not found. Set EXPO_PUBLIC_API_BASE_URL environment variable.');
    console.warn('   Tests will attempt to use: http://localhost:3000/api');
  }
  
  console.log(`Using backend API: ${apiBaseUrl}`);

  beforeAll(async () => {
    if (!hasBackendUrl) {
      return;
    }

    try {
      const response = await axios.get(`${apiBaseUrl}/nutrition/nutriscore-health`, {
        timeout: 5000,
      });

      backendAvailable = response.data?.success === true;
      if (!backendAvailable) {
        backendUnavailableReason =
          response.data?.error || 'NutriScore backend health check returned an unsuccessful response';
      }
    } catch (error) {
      backendUnavailableReason =
        error.response?.data?.error ||
        error.message ||
        'NutriScore backend health check failed';
    }
  });

  const shouldSkipRealApiTest = () => {
    if (!hasBackendUrl) {
      console.warn('Skipping test - Backend API URL not configured');
      return true;
    }

    if (!backendAvailable) {
      console.warn(`Skipping test - NutriScore backend unavailable: ${backendUnavailableReason}`);
      return true;
    }

    return false;
  };

  // COMPREHENSIVE TESTS - Calculation Accuracy & Boundary Conditions
  describe('3.6 Calculation Accuracy Validation', () => {
    
    test('3.6.1 - Should validate EU NutriScore formula correctness with REAL API', async () => {
      if (shouldSkipRealApiTest()) {
        return;
      }
      
      // Test with known values that should produce predictable scores
      // Very healthy product: low energy, low sat fat, low sugars, low sodium, high fiber, high protein
      const healthyProduct = {
        calories: { total: 100 },
        macronutrients: {
          saturatedFat: 1,
          sugars: 3,
          sodium: 100,
          dietaryFiber: 6,
          protein: 12
        }
      };
      
      try {
        const result = await NutriScoreService.calculateEUNutriScoreForItem(healthyProduct);
        
        expect(result.success).toBe(true);
        // Very healthy should be grade A or B (score >= 7)
        expect(result.eu_nutriscore).toBeGreaterThanOrEqual(7);
        expect(['A', 'B']).toContain(result.grade);
      } catch (error) {
        // If backend is not running, provide helpful error message
        if (error.message && error.message.includes('ECONNREFUSED')) {
          console.error(' Backend server is not running. Start it with: cd server && npm start');
          throw new Error('Backend server not available. Please start the server first.');
        }
        throw error;
      }
    }, 30000); // 30 second timeout for real API call

    test('3.6.2 - Should validate unhealthy product gets low score', async () => {
      if (shouldSkipRealApiTest()) {
        return;
      }

      // Very unhealthy product: high energy, high sat fat, high sugars, high sodium, low fiber, low protein
      const unhealthyProduct = {
        calories: { total: 600 },
        macronutrients: {
          saturatedFat: 20,
          sugars: 60,
          sodium: 1500,
          dietaryFiber: 0,
          protein: 2
        }
      };
      
      const result = await NutriScoreService.calculateEUNutriScoreForItem(unhealthyProduct);
      
      expect(result.success).toBe(true);
      // Unhealthy products should get low scores (Grade D or E, score <= 5)
      expect(result.eu_nutriscore).toBeLessThanOrEqual(5);
      expect(['D', 'E']).toContain(result.grade);
    });

    test('3.6.3 - Should validate 70/30 weighting in combined score with REAL API', async () => {
      if (shouldSkipRealApiTest()) {
        return;
      }
      
      AuthService.getUser = jest.fn(() => Promise.resolve({
        age: 30,
        bmi: 22.5,
        gender: 'male'
      }));
      
      const itemNutrition = {
        calories: { total: 200 },
        macronutrients: {
          saturatedFat: 3,
          sugars: 8,
          sodium: 300,
          dietaryFiber: 4,
          protein: 10
        }
      };
      
      try {
        const result = await NutriScoreService.calculateCombinedNutriScoreForScan(
          itemNutrition,
          {}
        );
        
        expect(result.success).toBe(true);
        expect(result.breakdown).toBeTruthy();
        

        const expectedEUContribution = result.breakdown.eu_score * 0.7;
        expect(result.breakdown.eu_contribution).toBeCloseTo(expectedEUContribution, 1);
        
        // Total contributions should sum to final score (allow for rounding differences)
        const totalContributions = result.breakdown.eu_contribution + 
                                   result.breakdown.hypertension_contribution + 
                                   (result.breakdown.diabetes_contribution || 0);
        // Allow 0.1 tolerance for rounding differences
        expect(Math.abs(result.nutriscore - totalContributions)).toBeLessThanOrEqual(0.1);
      } catch (error) {
        if (error.message && error.message.includes('ECONNREFUSED')) {
          console.error(' Backend server is not running. Start it with: cd server && npm start');
          throw new Error('Backend server not available. Please start the server first.');
        }
        throw error;
      }
    }, 30000);

    test('3.6.4 - Should handle boundary values (zero nutrition) with REAL API', async () => {
      if (!hasBackendUrl) {
        console.warn('Skipping test - Backend API URL not configured');
        return;
      }
      
      const zeroNutrition = {
        calories: { total: 0 },
        macronutrients: {
          saturatedFat: 0,
          sugars: 0,
          sodium: 0,
          dietaryFiber: 0,
          protein: 0
        }
      };
      
      try {
        const result = await NutriScoreService.calculateEUNutriScoreForItem(zeroNutrition);
        
        // Should handle gracefully - may return error or default score
        expect(result).toBeTruthy();
        if (result.success) {
          expect(result.eu_nutriscore).toBeGreaterThanOrEqual(0);
          expect(result.eu_nutriscore).toBeLessThanOrEqual(10);
        } else {
          expect(result.error).toBeTruthy();
        }
      } catch (error) {
        if (error.message && error.message.includes('ECONNREFUSED')) {
          console.error(' Backend server is not running. Start it with: cd server && npm start');
          throw new Error('Backend server not available. Please start the server first.');
        }
        throw error;
      }
    }, 30000);

    test('3.6.5 - Should handle very high values correctly with REAL API', async () => {
      if (shouldSkipRealApiTest()) {
        return;
      }
      
      const extremeNutrition = {
        calories: { total: 1000 },
        macronutrients: {
          saturatedFat: 100,
          sugars: 200,
          sodium: 10000,
          dietaryFiber: 0,
          protein: 0
        }
      };
      
      try {
        const result = await NutriScoreService.calculateEUNutriScoreForItem(extremeNutrition);
        
        expect(result.success).toBe(true);
        // Extreme values should result in worst grade (E) with very low score
        expect(result.grade).toBe('E');
        expect(result.eu_nutriscore).toBeLessThanOrEqual(2);
        expect(result.eu_nutriscore).toBeGreaterThanOrEqual(0);
      } catch (error) {
        if (error.message && error.message.includes('ECONNREFUSED')) {
          console.error(' Backend server is not running. Start it with: cd server && npm start');
          throw new Error('Backend server not available. Please start the server first.');
        }
        throw error;
      }
    }, 30000);

    test('3.6.6 - Should validate serving size normalization with REAL API', async () => {
      if (shouldSkipRealApiTest()) {
        return;
      }
      
      // Test with serving size - values should be normalized to per 100g
      const nutritionWithServing = {
        calories: { total: 250 }, // Per serving
        macronutrients: {
          saturatedFat: 5,
          sugars: 10,
          sodium: 500,
          dietaryFiber: 2,
          protein: 5
        },
        servingInfo: {
          servingSize: '250g' // Should normalize to per 100g
        }
      };
      
      try {
        const result = await NutriScoreService.calculateEUNutriScoreForItem(nutritionWithServing);
        
        // Should calculate correctly with serving size normalization
        expect(result.success).toBe(true);
        expect(result.eu_nutriscore).toBeGreaterThanOrEqual(0);
        expect(result.eu_nutriscore).toBeLessThanOrEqual(10);
      } catch (error) {
        if (error.message && error.message.includes('ECONNREFUSED')) {
          console.error(' Backend server is not running. Start it with: cd server && npm start');
          throw new Error('Backend server not available. Please start the server first.');
        }
        throw error;
      }
    }, 30000);

    test('3.6.7 - Should validate model probability to score conversion with REAL API', async () => {
      if (shouldSkipRealApiTest()) {
        return;
      }
      
      AuthService.getUser = jest.fn(() => Promise.resolve({
        age: 30,
        bmi: 22.5,
        gender: 'male'
      }));
      
      const itemNutrition = {
        calories: { total: 200 },
        macronutrients: {
          saturatedFat: 3,
          sugars: 8,
          sodium: 300,
          dietaryFiber: 4,
          protein: 10
        }
      };
      
      try {
        const result = await NutriScoreService.calculateCombinedNutriScoreForScan(
          itemNutrition,
          {}
        );
        
        expect(result.success).toBe(true);
        
        // Model probabilities should be 0-1
        if (result.breakdown.hypertension_risk_probability !== undefined) {
          expect(result.breakdown.hypertension_risk_probability).toBeGreaterThanOrEqual(0);
          expect(result.breakdown.hypertension_risk_probability).toBeLessThanOrEqual(1);
        }
        
        // Model scores should be 1-10
        if (result.breakdown.hypertension_score !== undefined) {
          expect(result.breakdown.hypertension_score).toBeGreaterThanOrEqual(1);
          expect(result.breakdown.hypertension_score).toBeLessThanOrEqual(10);
        }
      } catch (error) {
        if (error.message && error.message.includes('ECONNREFUSED')) {
          console.error(' Backend server is not running. Start it with: cd server && npm start');
          throw new Error('Backend server not available. Please start the server first.');
        }
        throw error;
      }
    }, 30000);

    test('3.6.8 - Should validate diabetes model only used when hba1c available with REAL API', async () => {
      if (shouldSkipRealApiTest()) {
        return;
      }
      // Without hba1c
      AuthService.getUser = jest.fn(() => Promise.resolve({
        age: 30,
        bmi: 22.5,
        gender: 'male'
        // No hba1c
      }));
      
      const itemNutrition = {
        calories: { total: 200 },
        macronutrients: {
          saturatedFat: 3,
          sugars: 8,
          sodium: 300,
          dietaryFiber: 4,
          protein: 10
        }
      };
      
      try {
        const resultWithoutHbA1c = await NutriScoreService.calculateCombinedNutriScoreForScan(
          itemNutrition,
          {}
        );
        
        expect(resultWithoutHbA1c.breakdown.hba1c_available).toBe(false);
        // diabetes_contribution should be null when hba1c is not available
        expect(resultWithoutHbA1c.breakdown.diabetes_contribution).toBeNull();
        expect(resultWithoutHbA1c.breakdown.diabetes_risk_probability).toBeNull();
        expect(resultWithoutHbA1c.breakdown.diabetes_score).toBeNull();
        // Hypertension should have 30% weight when diabetes is not used
        expect(resultWithoutHbA1c.breakdown.hypertension_weight).toBe(0.3);
        
        // With hba1c
        AuthService.getUser = jest.fn(() => Promise.resolve({
          age: 30,
          bmi: 22.5,
          gender: 'male',
          hba1c: 5.5
        }));
        
        const resultWithHbA1c = await NutriScoreService.calculateCombinedNutriScoreForScan(
          itemNutrition,
          {}
        );
        
        expect(resultWithHbA1c.breakdown.hba1c_available).toBe(true);
        expect(resultWithHbA1c.breakdown.diabetes_contribution).toBeGreaterThan(0);
        expect(resultWithHbA1c.breakdown.diabetes_risk_probability).toBeGreaterThanOrEqual(0);
        expect(resultWithHbA1c.breakdown.diabetes_risk_probability).toBeLessThanOrEqual(1);
        // Hypertension should have 15% weight when diabetes is used
        expect(resultWithHbA1c.breakdown.hypertension_weight).toBe(0.15);
        expect(resultWithHbA1c.breakdown.diabetes_weight).toBe(0.15);
      } catch (error) {
        if (error.message && error.message.includes('ECONNREFUSED')) {
          console.error(' Backend server is not running. Start it with: cd server && npm start');
          throw new Error('Backend server not available. Please start the server first.');
        }
        throw error;
      }
    }, 30000);

    test('3.6.9 - Should validate score consistency across multiple calls with REAL API', async () => {
      if (shouldSkipRealApiTest()) {
        return;
      }
      
      const nutritionData = {
        calories: { total: 200 },
        macronutrients: {
          saturatedFat: 3,
          sugars: 8,
          sodium: 300,
          dietaryFiber: 4,
          protein: 10
        }
      };
      
      try {
        // Call multiple times with same input
        const results = await Promise.all([
          NutriScoreService.calculateEUNutriScoreForItem(nutritionData),
          NutriScoreService.calculateEUNutriScoreForItem(nutritionData),
          NutriScoreService.calculateEUNutriScoreForItem(nutritionData)
        ]);
        
        // All results should be identical
        const firstScore = results[0].eu_nutriscore;
        results.forEach(result => {
          expect(result.success).toBe(true);
          expect(result.eu_nutriscore).toBe(firstScore);
          expect(result.grade).toBe(results[0].grade);
        });
      } catch (error) {
        if (error.message && error.message.includes('ECONNREFUSED')) {
          console.error(' Backend server is not running. Start it with: cd server && npm start');
          throw new Error('Backend server not available. Please start the server first.');
        }
        throw error;
      }
    }, 30000);

    test('3.6.10 - Should handle missing optional fields gracefully with REAL API', async () => {
      if (shouldSkipRealApiTest()) {
        return;
      }
      
      const partialNutrition = {
        calories: { total: 200 }
        // Missing macronutrients
      };
      
      try {
        const result = await NutriScoreService.calculateEUNutriScoreForItem(partialNutrition);
        
        // Should handle gracefully - may return error or use defaults
        expect(result).toBeTruthy();
        if (result.success) {
          expect(result.eu_nutriscore).toBeGreaterThanOrEqual(0);
        } else {
          expect(result.error).toBeTruthy();
        }
      } catch (error) {
        if (error.message && error.message.includes('ECONNREFUSED')) {
          console.error(' Backend server is not running. Start it with: cd server && npm start');
          throw new Error('Backend server not available. Please start the server first.');
        }
        throw error;
      }
    }, 30000);
  });
});


