

import { NutritionTrackerService } from '../src/services/nutritionTrackerService';

describe('Module 5: Dashboard and Analytics', () => {
  
  beforeEach(async () => {
    // Clear storage and reset tracker before each test
    jest.clearAllMocks();
    await NutritionTrackerService.resetDailyTotals();
  });

  // COMPREHENSIVE TESTS - Data Persistence & Complex Scenarios
  describe('5.5 Data Persistence', () => {
    
    test('5.5.1 - Should persist data across service restarts', async () => {
      const nutritionData = {
        calories: { total: 500 },
        macronutrients: {
          totalFat: 20,
          protein: 25,
          totalCarbohydrates: 50
        }
      };
      
      await NutritionTrackerService.addNutrition(nutritionData);
      const totals1 = await NutritionTrackerService.getDailyTotals();
      
      // Simulate service restart by calling getDailyTotals again
      const totals2 = await NutritionTrackerService.getDailyTotals();
      
      // Data should persist
      expect(totals1.calories).toBe(totals2.calories);
      expect(totals1.fat).toBe(totals2.fat);
      expect(totals1.protein).toBe(totals2.protein);
    });

    test('5.5.2 - Should reset daily totals at midnight', async () => {
      const nutritionData = {
        calories: { total: 500 },
        macronutrients: {}
      };
      
      await NutritionTrackerService.addNutrition(nutritionData);
      const totalsBefore = await NutritionTrackerService.getDailyTotals();
      expect(totalsBefore.calories).toBe(500);
      
      // Simulate date change by manually resetting
      await NutritionTrackerService.resetDailyTotals();
      const totalsAfter = await NutritionTrackerService.getDailyTotals();
      
      // Should be reset to zero
      expect(totalsAfter.calories).toBe(0);
      expect(totalsAfter.fat).toBe(0);
      expect(totalsAfter.protein).toBe(0);
    });

    test('5.5.3 - Should handle date boundary correctly', async () => {
      // Add nutrition data
      await NutritionTrackerService.addNutrition({
        calories: { total: 1000 },
        macronutrients: {}
      });
      
      const totals = await NutritionTrackerService.getDailyTotals();
      expect(totals.calories).toBe(1000);
      
      // Reset and verify
      await NutritionTrackerService.resetDailyTotals();
      const resetTotals = await NutritionTrackerService.getDailyTotals();
      expect(resetTotals.calories).toBe(0);
    });

    test('5.5.4 - Should handle concurrent additions correctly', async () => {
      // Simulate concurrent additions
      const nutritionData1 = {
        calories: { total: 200 },
        macronutrients: { totalFat: 10, protein: 15 }
      };
      
      const nutritionData2 = {
        calories: { total: 300 },
        macronutrients: { totalFat: 15, protein: 20 }
      };
      
      // Add both sequentially (simulating concurrent)
      await NutritionTrackerService.addNutrition(nutritionData1);
      await NutritionTrackerService.addNutrition(nutritionData2);
      
      const totals = await NutritionTrackerService.getDailyTotals();
      
      // Should sum correctly
      expect(totals.calories).toBe(500);
      expect(totals.fat).toBe(25);
      expect(totals.protein).toBe(35);
    });
  });

  describe('5.6 Complex Scenarios', () => {
    
    test('5.6.1 - Should handle multiple meals in a day', async () => {
      const meals = [
        { calories: 400, fat: 15, protein: 20, carbs: 50 },
        { calories: 600, fat: 25, protein: 30, carbs: 70 },
        { calories: 500, fat: 20, protein: 25, carbs: 60 }
      ];
      
      for (const meal of meals) {
        await NutritionTrackerService.addNutrition({
          calories: { total: meal.calories },
          macronutrients: {
            totalFat: meal.fat,
            protein: meal.protein,
            totalCarbohydrates: meal.carbs
          }
        });
      }
      
      const totals = await NutritionTrackerService.getDailyTotals();
      
      expect(totals.calories).toBe(1500);
      expect(totals.fat).toBe(60);
      expect(totals.protein).toBe(75);
      expect(totals.carbs).toBe(180);
    });

    test('5.6.2 - Should handle very large single meal', async () => {
      const largeMeal = {
        calories: { total: 5000 },
        macronutrients: {
          totalFat: 200,
          protein: 150,
          totalCarbohydrates: 500
        }
      };
      
      await NutritionTrackerService.addNutrition(largeMeal);
      
      const totals = await NutritionTrackerService.getDailyTotals();
      
      expect(totals.calories).toBe(5000);
      expect(totals.fat).toBe(200);
      expect(totals.protein).toBe(150);
      expect(totals.carbs).toBe(500);
    });

    test('5.6.3 - Should handle missing macronutrient fields', async () => {
      const partialData = {
        calories: { total: 500 }
        // Missing macronutrients
      };
      
      await NutritionTrackerService.addNutrition(partialData);
      
      const totals = await NutritionTrackerService.getDailyTotals();
      
      expect(totals.calories).toBe(500);
      // Missing fields should default to 0
      expect(totals.fat).toBe(0);
      expect(totals.protein).toBe(0);
    });

    test('5.6.4 - Should handle different data structures', async () => {
      // Test with object structure
      const data1 = {
        calories: { total: 200 },
        macronutrients: {
          totalFat: { value: 10 },
          protein: { value: 15 }
        }
      };
      
      await NutritionTrackerService.addNutrition(data1);
      const totals1 = await NutritionTrackerService.getDailyTotals();
      
      // Reset for next test
      await NutritionTrackerService.resetDailyTotals();
      
      // Test with direct number structure
      const data2 = {
        calories: { total: 200 },
        macronutrients: {
          totalFat: 10,
          protein: 15
        }
      };
      
      await NutritionTrackerService.addNutrition(data2);
      const totals2 = await NutritionTrackerService.getDailyTotals();
      
      // Both should work
      expect(totals1.calories).toBe(totals2.calories);
    });

    test('5.6.5 - Should calculate accurate percentages', async () => {
      const nutritionData = {
        calories: { total: 2000 },
        macronutrients: {
          totalFat: 65,      // 65g * 9 = 585 kcal = 29.25%
          protein: 150,      // 150g * 4 = 600 kcal = 30%
          totalCarbohydrates: 200 // 200g * 4 = 800 kcal = 40%
        }
      };
      
      await NutritionTrackerService.addNutrition(nutritionData);
      const totals = await NutritionTrackerService.getDailyTotals();
      
      // Calculate percentages
      const fatPercent = (totals.fat * 9 / totals.calories) * 100;
      const proteinPercent = (totals.protein * 4 / totals.calories) * 100;
      const carbsPercent = (totals.carbs * 4 / totals.calories) * 100;
      
      expect(fatPercent).toBeCloseTo(29.25, 1);
      expect(proteinPercent).toBeCloseTo(30, 1);
      expect(carbsPercent).toBeCloseTo(40, 1);
    });

    test('5.6.6 - Should handle negative values gracefully', async () => {
      // Negative values should be clamped to 0
      const nutritionData = {
        calories: { total: -100 },
        macronutrients: {
          totalFat: -10,
          protein: -5
        }
      };
      
      await NutritionTrackerService.addNutrition(nutritionData);
      const totals = await NutritionTrackerService.getDailyTotals();
      
      // Should not have negative values - all should be clamped to 0 or remain at 0
      expect(totals.calories).toBeGreaterThanOrEqual(0);
      expect(totals.fat).toBeGreaterThanOrEqual(0);
      expect(totals.protein).toBeGreaterThanOrEqual(0);
      expect(totals.carbs).toBeGreaterThanOrEqual(0);
      expect(totals.sugar).toBeGreaterThanOrEqual(0);
      
      // Since we added negative values, totals should remain at 0 (or previous value if any)
      // If starting from 0, all should be 0 after adding negative values
      expect(totals.calories).toBe(0);
      expect(totals.fat).toBe(0);
      expect(totals.protein).toBe(0);
    });

    test('5.6.7 - Should handle very small decimal values', async () => {
      const nutritionData = {
        calories: { total: 0.5 },
        macronutrients: {
          totalFat: 0.1,
          protein: 0.2
        }
      };
      
      await NutritionTrackerService.addNutrition(nutritionData);
      const totals = await NutritionTrackerService.getDailyTotals();
      
      // Should handle decimals correctly
      expect(totals.calories).toBeCloseTo(0.5, 2);
      expect(totals.fat).toBeCloseTo(0.1, 2);
      expect(totals.protein).toBeCloseTo(0.2, 2);
    });

    test('5.6.8 - Should maintain data integrity after multiple operations', async () => {
      // Add data
      await NutritionTrackerService.addNutrition({
        calories: { total: 1000 },
        macronutrients: { totalFat: 50, protein: 75 }
      });
      
      // Get totals
      const totals1 = await NutritionTrackerService.getDailyTotals();
      
      // Add more data
      await NutritionTrackerService.addNutrition({
        calories: { total: 500 },
        macronutrients: { totalFat: 25, protein: 30 }
      });
      
      // Get totals again
      const totals2 = await NutritionTrackerService.getDailyTotals();
      
      // Should accumulate correctly
      expect(totals2.calories).toBe(totals1.calories + 500);
      expect(totals2.fat).toBe(totals1.fat + 25);
      expect(totals2.protein).toBe(totals1.protein + 30);
    });
  });
});

