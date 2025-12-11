import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NutritionFormatter } from '../models/nutritionModels';
import { NutritionParser } from '../services/nutritionParser';
import { COLORS, SIZES } from '../constants';

/**
 * Enhanced Nutrition Display Component
 * Shows structured nutrition data in clean, organized cards
 */
export const NutritionDisplay = ({ nutritionData }) => {
  if (!nutritionData || !nutritionData.hasData()) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No nutrition data detected</Text>
        <Text style={styles.emptySubtext}>Try scanning a nutrition label</Text>
      </View>
    );
  }

  const renderCaloriesSection = () => {
    const calories = nutritionData.calories;
    if (!calories || (!calories.total && !calories.fromFat)) return null;

    return (
      <View style={styles.caloriesSection}>
        <Text style={styles.caloriesTitle}>Calories</Text>
        <View style={styles.caloriesContainer}>
          {calories.total && (
            <View style={styles.caloriesItem}>
              <Text style={styles.caloriesValue}>{calories.total}</Text>
              <Text style={styles.caloriesLabel}>Total</Text>
            </View>
          )}
          {calories.fromFat && (
            <View style={styles.caloriesItem}>
              <Text style={styles.caloriesFatValue}>{calories.fromFat}</Text>
              <Text style={styles.caloriesLabel}>From Fat</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderServingInfo = () => {
    const serving = nutritionData.servingInfo;
    if (!serving || (!serving.servingSize && !serving.servingsPerContainer)) return null;

    return (
      <View style={styles.servingSection}>
        <Text style={styles.sectionTitle}>Serving Information</Text>
        <View style={styles.servingContent}>
          {serving.servingSize && (
            <Text style={styles.servingText}>
              <Text style={styles.servingLabel}>Serving Size: </Text>
              <Text style={styles.servingValue}>{serving.servingSize}</Text>
            </Text>
          )}
          {serving.servingsPerContainer && (
            <Text style={styles.servingText}>
              <Text style={styles.servingLabel}>Servings Per Container: </Text>
              <Text style={styles.servingValue}>{serving.servingsPerContainer}</Text>
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderMacronutrients = () => {
    const macros = nutritionData.macronutrients;
    if (!macros) return null;

    const items = [];
    
    // Add macronutrients in logical order
    const macroOrder = [
      'totalFat', 'saturatedFat', 'transFat', 'polyunsaturatedFat', 'monounsaturatedFat',
      'cholesterol', 'sodium', 'totalCarbohydrates', 'dietaryFiber', 'sugars', 'addedSugars', 'protein'
    ];

    macroOrder.forEach(key => {
      if (macros[key]) {
        items.push({
          label: NutritionParser.formatLabel(key),
          value: macros[key].value,
          unit: macros[key].unit,
          dailyValue: macros[key].dailyValue
        });
      }
    });

    return renderNutritionSection('Macronutrients', items);
  };

  const renderVitaminsAndMinerals = () => {
    const vitamins = nutritionData.vitaminsAndMinerals;
    if (!vitamins) return null;

    const items = Object.entries(vitamins)
      .filter(([key, value]) => value !== null && value !== undefined)
      .map(([key, value]) => ({
        label: NutritionParser.formatLabel(key),
        value: value.value,
        unit: value.unit,
        dailyValue: value.dailyValue
      }));

    if (items.length === 0) return null;

    return renderNutritionSection('Vitamins & Minerals', items);
  };

  const renderNutritionTable = () => {
    const allNutrients = [];
    
    // Collect all nutrition data into a single array
    
    // Calories
    if (nutritionData.calories?.total) {
      allNutrients.push({
        name: 'Calories',
        value: nutritionData.calories.total,
        unit: 'kcal'
      });
    }
    
    if (nutritionData.calories?.kilojoules) {
      allNutrients.push({
        name: 'Energy',
        value: nutritionData.calories.kilojoules,
        unit: 'kJ'
      });
    }
    
    if (nutritionData.calories?.fromFat) {
      allNutrients.push({
        name: 'Calories from Fat',
        value: nutritionData.calories.fromFat,
        unit: 'kcal'
      });
    }

    // Macronutrients
    if (nutritionData.macronutrients) {
      const macroOrder = [
        { key: 'totalFat', name: 'Total Fat' },
        { key: 'saturatedFat', name: 'Saturated Fat' },
        { key: 'transFat', name: 'Trans Fat' },
        { key: 'polyunsaturatedFat', name: 'Polyunsaturated Fat' },
        { key: 'monounsaturatedFat', name: 'Monounsaturated Fat' },
        { key: 'cholesterol', name: 'Cholesterol' },
        { key: 'sodium', name: 'Sodium' },
        { key: 'potassium', name: 'Potassium' },
        { key: 'totalCarbohydrates', name: 'Total Carbohydrates' },
        { key: 'dietaryFiber', name: 'Dietary Fiber' },
        { key: 'sugars', name: 'Sugars' },
        { key: 'addedSugars', name: 'Added Sugars' },
        { key: 'protein', name: 'Protein' }
      ];

      macroOrder.forEach(({ key, name }) => {
        const nutrient = nutritionData.macronutrients[key];
        if (nutrient && nutrient.value !== null && nutrient.value !== undefined) {
          allNutrients.push({
            name: name,
            value: nutrient.value,
            unit: nutrient.unit || '',
            dailyValue: nutrient.dailyValue
          });
        }
      });
    }

    // Vitamins and Minerals
    if (nutritionData.vitaminsAndMinerals) {
      Object.entries(nutritionData.vitaminsAndMinerals).forEach(([key, nutrient]) => {
        if (nutrient && (nutrient.value !== null && nutrient.value !== undefined)) {
          allNutrients.push({
            name: NutritionParser.formatLabel(key),
            value: nutrient.value,
            unit: nutrient.unit || '',
            dailyValue: nutrient.dailyValue
          });
        }
      });
    }

    return (
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>Nutrition Information</Text>
        
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, { flex: 1.5 }]}>Nutrient</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Amount</Text>
          <Text style={[styles.headerText, { flex: 0.8 }]}>Daily Value</Text>
        </View>

        {/* Table Rows */}
        {allNutrients.map((nutrient, index) => (
          <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.evenRow]}>
            <Text style={styles.nutrientName}>{nutrient.name}</Text>
            <Text style={styles.nutrientValue}>
              {nutrient.value}{nutrient.unit}
            </Text>
            <Text style={[
              styles.dailyValueColumn,
              nutrient.dailyValue && { color: NutritionFormatter.getDailyValueColor(nutrient.dailyValue) }
            ]}>
              {nutrient.dailyValue ? `${nutrient.dailyValue}%` : '-'}
            </Text>
          </View>
        ))}

        {allNutrients.length === 0 && (
          <View style={styles.emptyTable}>
            <Text style={styles.emptyTableText}>No nutrition data available</Text>
          </View>
        )}
      </View>
    );
  };

  const renderNutriScore = () => {
    if (!nutritionData.nutriscore) return null;

    const nutriscore = nutritionData.nutriscore;
    
    // If there's an error, don't show anything
    if (nutriscore.error) return null;

    // Use combined score (preferred) or fallback to euScore or old score format
    const score = nutriscore.combinedScore_rounded || 
                  Math.round(nutriscore.combinedScore || nutriscore.euScore || nutriscore.score || 0);
    const grade = nutriscore.grade || 'N/A';

    // Color based on grade
    const getGradeColor = (grade) => {
      switch (grade) {
        case 'A': return '#00A651'; // Green
        case 'B': return '#85BB2F'; // Light Green
        case 'C': return '#FECB00'; // Yellow
        case 'D': return '#EE8100'; // Orange
        case 'E': return '#E63E11'; // Red
        default: return COLORS.text.secondary;
      }
    };

    const gradeColor = getGradeColor(grade);

    return (
      <View style={styles.nutriscoreContainer}>
        <View style={[styles.nutriscoreBadge, { borderColor: gradeColor }]}>
          <View style={styles.nutriscoreHeader}>
            <Ionicons name="shield-checkmark" size={24} color={gradeColor} />
            <Text style={styles.nutriscoreLabel}>Nutri-Score</Text>
          </View>
          <View style={styles.nutriscoreContent}>
            <Text style={[styles.nutriscoreGrade, { color: gradeColor }]}>
              {grade}
            </Text>
            <Text style={styles.nutriscoreScore}>
              {score}/10
            </Text>
          </View>
          {nutriscore.euScore && nutriscore.combinedScore && (
            <Text style={styles.nutriscoreDetails}>
              EU: {Math.round(nutriscore.euScore)} | Combined: {Math.round(nutriscore.combinedScore)}
            </Text>
          )}
          <Text style={styles.nutriscoreSubtext}>
            {score >= 9 ? 'Excellent' : 
             score >= 7 ? 'Good' : 
             score >= 5 ? 'Fair' : 
             score >= 3 ? 'Poor' : 'Very Poor'}
          </Text>
        {nutriscore.breakdown?.adjustment_note && (
          <Text style={styles.nutriscoreAdjustmentNote}>
            {nutriscore.breakdown.adjustment_note}
          </Text>
        )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition Facts</Text>
      </View>

      {renderNutriScore()}
      {renderServingInfo()}
      {renderNutritionTable()}

      {/* Additional info section */}
      {nutritionData.additionalInfo && nutritionData.additionalInfo.notSignificantSourceOf && 
       nutritionData.additionalInfo.notSignificantSourceOf.length > 0 && (
        <View style={styles.additionalSection}>
          <Text style={styles.additionalTitle}>Additional Information</Text>
          <Text style={styles.additionalText}>
            Not a significant source of: {nutritionData.additionalInfo.notSignificantSourceOf.join(', ')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  header: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  // NutriScore Badge
  nutriscoreContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  nutriscoreBadge: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  nutriscoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nutriscoreLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  nutriscoreContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  nutriscoreGrade: {
    fontSize: 48,
    fontWeight: 'bold',
    marginRight: 12,
  },
  nutriscoreScore: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  nutriscoreSubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  nutriscoreAdjustmentNote: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 16,
    textAlign: 'center',
  },
  // Serving Information Card
  servingCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: SIZES.padding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  servingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  servingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  servingLabel: {
    fontSize: 16,
    color: COLORS.textLight,
    flex: 1,
  },
  servingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  // Nutrition Table
  tableContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: SIZES.padding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  evenRow: {
    backgroundColor: '#f8f9fa',
  },
  nutrientName: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1.5,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    gap: 8,
  },
  nutrientValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  dailyValueColumn: {
    fontSize: 14,
    fontWeight: '500',
    flex: 0.8,
    textAlign: 'center',
    color: COLORS.textLight,
  },
  emptyTable: {
    padding: 20,
    alignItems: 'center',
  },
  emptyTableText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  servingSection: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: SIZES.padding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  servingContent: {
    marginTop: 8,
  },
  servingText: {
    fontSize: 16,
    marginBottom: 4,
  },
  servingLabel: {
    color: COLORS.textLight,
    fontWeight: '500',
  },
  servingValue: {
    color: COLORS.text,
    fontWeight: '600',
  },
  caloriesSection: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: SIZES.padding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  caloriesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  caloriesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  caloriesItem: {
    alignItems: 'center',
  },
  caloriesValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  caloriesFatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
  caloriesLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: SIZES.padding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionContent: {
    gap: 8,
  },
  nutritionItem: {
    paddingVertical: 4,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  nutritionValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  unitText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  dailyValue: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#f8f9fa',
  },
  additionalSection: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: SIZES.padding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  additionalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  additionalText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  nutriscoreContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  nutriscoreBadge: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nutriscoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  nutriscoreLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  nutriscoreContent: {
    alignItems: 'center',
    marginBottom: 8,
  },
  nutriscoreGrade: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  nutriscoreScore: {
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  nutriscoreDetails: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  nutriscoreSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
});