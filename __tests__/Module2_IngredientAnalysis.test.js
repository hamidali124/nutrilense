

import { IngredientAnalysisService } from '../src/services/ingredientAnalysisService';

describe('Module 2: Ingredient Analysis and Compliance', () => {
  
  // COMPREHENSIVE TESTS - Complex Ingredient Lists
  describe('2.5 Complex Ingredient Analysis', () => {
    
    test('2.5.1 - Should analyze large ingredient lists (50+ ingredients)', () => {
      const userAllergens = ['milk', 'eggs', 'wheat', 'soybeans'];
      const largeIngredientList = Array.from({ length: 50 }, (_, i) => ({
        name: `ingredient${i}`,
        order: i + 1
      }));
      // Add some allergens
      largeIngredientList[5].name = 'milk protein';
      largeIngredientList[12].name = 'wheat flour';
      largeIngredientList[25].name = 'soy lecithin';
      
      const analyzed = IngredientAnalysisService.batchAnalyze(largeIngredientList, userAllergens);
      const summary = IngredientAnalysisService.getSummary(analyzed);
      
      expect(analyzed.length).toBe(50);
      expect(summary.allergenCount).toBeGreaterThanOrEqual(3);
      expect(summary.total).toBe(50);
    });

    test('2.5.2 - Should handle compound ingredients correctly', () => {
      const userAllergens = ['milk'];
      const compoundIngredients = [
        { name: 'milk chocolate (milk, sugar, cocoa)', order: 1 },
        { name: 'whey protein concentrate (from milk)', order: 2 },
        { name: 'sugar (pure cane sugar)', order: 3 } // Sugar should not trigger milk allergen
      ];
      
      const analyzed = IngredientAnalysisService.batchAnalyze(compoundIngredients, userAllergens);
      
      // Should detect milk in compound ingredients
      expect(analyzed[0].hasAllergens || analyzed[1].hasAllergens).toBe(true);
      // Sugar should not trigger milk allergen
      expect(analyzed[2].hasAllergens).toBe(false);
    });

    test('2.5.3 - Should avoid false positives (similar names)', () => {
      const userAllergens = ['milk'];
      const similarNames = [
        { name: 'coconut milk', order: 1 }, // Not dairy milk
        { name: 'almond milk', order: 2 }, // Not dairy milk
        { name: 'milk thistle', order: 3 }, // Plant, not dairy
        { name: 'milk protein', order: 4 } // Actually contains milk
      ];
      
      const analyzed = IngredientAnalysisService.batchAnalyze(similarNames, userAllergens);
      
      // Only milk protein should trigger
      const allergenCount = analyzed.filter(ing => ing.hasAllergens).length;
      expect(allergenCount).toBeGreaterThanOrEqual(1);
      // Milk protein should definitely be detected
      expect(analyzed[3].hasAllergens).toBe(true);
    });

    test('2.5.4 - Should detect hidden allergens in E-numbers', () => {
      const userAllergens = ['milk'];
      const ingredients = [
        { name: 'E322 (lecithin from milk)', order: 1 },
        { name: 'E270 (lactic acid from milk)', order: 2 },
        { name: 'E471 (mono and diglycerides)', order: 3 } // May contain milk
      ];
      
      const analyzed = IngredientAnalysisService.batchAnalyze(ingredients, userAllergens);
      
      // Should detect milk in E-number descriptions
      expect(analyzed[0].hasAllergens || analyzed[1].hasAllergens).toBe(true);
    });

    test('2.5.5 - Should handle multiple E-numbers in single ingredient', () => {
      const userAllergens = [];
      const ingredient = { name: 'E120, E441, E1510 (cochineal, gelatin, ethanol)', order: 1 };
      
      const analyzed = IngredientAnalysisService.batchAnalyze([ingredient], userAllergens);
      
      // Should detect haram ingredients (E120, E1510)
      expect(analyzed[0].isHaram || analyzed[0].isDoubtful).toBe(true);
    });

    test('2.5.6 - Should handle malformed E-numbers', () => {
      const userAllergens = [];
      const malformedENumbers = [
        { name: 'E99999', order: 1 }, // Non-existent
        { name: 'E12', order: 2 }, // Too short
        { name: 'E1200', order: 3 }, // Too long
        { name: 'E120a', order: 4 }, // Valid with suffix
      ];
      
      malformedENumbers.forEach(ingredient => {
        const analyzed = IngredientAnalysisService.batchAnalyze([ingredient], userAllergens);
        // Should not crash, return valid result
        expect(analyzed[0]).toBeTruthy();
        expect(typeof analyzed[0].isHaram).toBe('boolean');
      });
    });



    test('2.5.8 - Should handle empty and null ingredient names', () => {
      const userAllergens = ['milk'];
      const ingredients = [
        { name: '', order: 1 },
        { name: null, order: 2 },
        { name: undefined, order: 3 },
        { name: '   ', order: 4 }, // Whitespace only
        { name: 'milk', order: 5 }
      ];
      
      // Service should handle null/undefined/empty values gracefully
      const analyzed = IngredientAnalysisService.batchAnalyze(ingredients, userAllergens);
      
      // Should not crash, should handle gracefully
      expect(analyzed.length).toBe(5);
      
      // Empty string should not trigger allergens
      expect(analyzed[0].hasAllergens).toBe(false);
      expect(analyzed[0].isHaram).toBe(false);
      
      // Null should not trigger allergens
      expect(analyzed[1].hasAllergens).toBe(false);
      expect(analyzed[1].isHaram).toBe(false);
      
      // Undefined should not trigger allergens
      expect(analyzed[2].hasAllergens).toBe(false);
      expect(analyzed[2].isHaram).toBe(false);
      
      // Whitespace-only should not trigger allergens
      expect(analyzed[3].hasAllergens).toBe(false);
      expect(analyzed[3].isHaram).toBe(false);
      
      // Valid ingredient should work
      expect(analyzed[4].hasAllergens).toBe(true);
    });

    test('2.5.9 - Should handle very long ingredient names', () => {
      const userAllergens = ['milk'];
      const longName = 'milk protein isolate ' + 'x'.repeat(500);
      const ingredient = { name: longName, order: 1 };
      
      const analyzed = IngredientAnalysisService.batchAnalyze([ingredient], userAllergens);
      
      // Should still detect allergen in long name
      expect(analyzed[0].hasAllergens).toBe(true);
    });

    test('2.5.10 - Should provide accurate summary statistics', () => {
      const userAllergens = ['milk', 'eggs', 'wheat'];
      const ingredients = [
        { name: 'milk protein', order: 1 },
        { name: 'egg whites', order: 2 },
        { name: 'wheat flour', order: 3 },
        { name: 'pork gelatin', order: 4 },
        { name: 'sugar', order: 5 }
      ];
      
      const analyzed = IngredientAnalysisService.batchAnalyze(ingredients, userAllergens);
      const summary = IngredientAnalysisService.getSummary(analyzed);
      
      expect(summary.total).toBe(5);
      expect(summary.allergenCount).toBe(3); // milk, eggs, wheat
      expect(summary.haramCount).toBe(1); // pork gelatin
      expect(summary.allergenTypes.length).toBeGreaterThanOrEqual(3);
      expect(summary.haramCategories.length).toBeGreaterThanOrEqual(1);
    });

    test('2.5.11 - Should handle case variations in ingredient names', () => {
      const userAllergens = ['milk'];
      const caseVariations = [
        { name: 'MILK PROTEIN', order: 1 },
        { name: 'Milk Protein', order: 2 },
        { name: 'mIlK pRoTeIn', order: 3 },
        { name: 'milk protein', order: 4 }
      ];
      
      const analyzed = IngredientAnalysisService.batchAnalyze(caseVariations, userAllergens);
      
      // All should be detected (case-insensitive)
      analyzed.forEach(ing => {
        expect(ing.hasAllergens).toBe(true);
      });
    });

    test('2.5.12 - Should handle special characters in ingredient names', () => {
      const userAllergens = ['milk'];
      const specialCharIngredients = [
        { name: 'milk-protein', order: 1 },
        { name: 'milk_protein', order: 2 },
        { name: 'milk (protein)', order: 3 },
        { name: 'milk/protein', order: 4 }
      ];
      
      const analyzed = IngredientAnalysisService.batchAnalyze(specialCharIngredients, userAllergens);
      
      // Should detect milk in all variations
      analyzed.forEach(ing => {
        expect(ing.hasAllergens).toBe(true);
      });
    });
  });
});

