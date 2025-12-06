import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants';
import { NutritionTrackerService } from '../services/nutritionTrackerService';

/**
 * Nutrition Dashboard Component
 * Displays daily consumed nutrition with circular progress indicators
 */
export const NutritionDashboard = ({ refreshTrigger }) => {
  const [totals, setTotals] = useState({
    calories: 0,
    carbs: 0,
    fat: 0,
    protein: 0,
    sugar: 0
  });
  const [limits, setLimits] = useState({
    calories: 2000,
    carbs: 300,
    fat: 65,
    protein: 50,
    sugar: 50
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    try {
      setLoading(true);
      const dailyTotals = await NutritionTrackerService.getDailyTotals();
      const dailyLimits = await NutritionTrackerService.getDailyLimits();
      setTotals(dailyTotals);
      setLimits(dailyLimits);
    } catch (error) {
      // Error loading dashboard data
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Daily Totals',
      'Are you sure you want to reset today\'s nutrition totals?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await NutritionTrackerService.resetDailyTotals();
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to reset totals');
            }
          }
        }
      ]
    );
  };

  const calculatePercentage = (current, limit) => {
    if (!limit || limit === 0) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return '#e74c3c'; // Red - exceeded
    if (percentage >= 80) return '#f39c12'; // Orange - warning
    return COLORS.primary; // Green - good
  };

  const renderNutrientCard = (label, value, limit, unit, fullWidth = false) => {
    const percentage = calculatePercentage(value, limit);
    const progressColor = getProgressColor(percentage);

    return (
      <View style={fullWidth ? styles.nutrientCardFull : styles.nutrientCardHalf}>
        <View style={styles.cardHeader}>
          <Text style={[styles.nutrientLabel, fullWidth && styles.nutrientLabelFull]}>
            {label}: {Math.round(value)} {unit === 'kcal' ? 'Kcal' : unit.toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.cardContent}>
          {/* Circular Progress Indicator */}
          <View style={styles.circleContainer}>
            <View style={[styles.circleBackground, { 
              borderColor: progressColor,
              borderWidth: percentage > 0 ? 3 : 2,
              width: fullWidth ? 50 : 45,
              height: fullWidth ? 50 : 45,
              borderRadius: fullWidth ? 25 : 22.5
            }]}>
              <View style={styles.circleInner}>
                <Text style={[styles.percentageText, { 
                  color: progressColor,
                  fontSize: fullWidth ? 12 : 10
                }]}>
                  {Math.round(percentage)}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Nutrition</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <Ionicons name="refresh-outline" size={20} color={COLORS.text.secondary} />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gridContainer}>
        {/* Calories - Full Width */}
        {renderNutrientCard(
          'Calories',
          totals.calories,
          limits.calories,
          'kcal',
          true
        )}
        
        {/* Carbs and Fat - Side by Side */}
        <View style={styles.row}>
          {renderNutrientCard(
            'Carbs',
            totals.carbs,
            limits.carbs,
            'g',
            false
          )}
          
          {renderNutrientCard(
            'Fat',
            totals.fat,
            limits.fat,
            'g',
            false
          )}
        </View>
        
        {/* Protein and Sugar - Side by Side */}
        <View style={styles.row}>
          {renderNutrientCard(
            'Protein',
            totals.protein,
            limits.protein,
            'g',
            false
          )}
          
          {renderNutrientCard(
            'Sugar',
            totals.sugar,
            limits.sugar,
            'g',
            false
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e8f5e9',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    gap: 4,
  },
  resetText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  gridContainer: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  nutrientCardFull: {
    width: '100%',
    backgroundColor: '#2d8659',
    borderRadius: 12,
    padding: 12,
  },
  nutrientCardHalf: {
    flex: 1,
    backgroundColor: '#2d8659',
    borderRadius: 12,
    padding: 10,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  nutrientLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  nutrientLabelFull: {
    fontSize: 16,
  },
  cardContent: {
    alignItems: 'center',
  },
  circleContainer: {
    alignItems: 'center',
  },
  circleBackground: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

