import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants';
import { NutritionDashboard } from './NutritionDashboard';
import { useAuth } from '../contexts/AuthContext';

/**
 * Home Page Component - Landing page with app information and nutrition dashboard
 */
export const HomePage = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user } = useAuth();

  const onRefresh = useCallback(async () => {
    // Trigger dashboard refresh
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Refresh dashboard when component mounts
  useEffect(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const userName = user?.name || 'User';

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        {/* Welcome Message */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Welcome {userName}</Text>
        </View>

        {/* Nutrition Dashboard */}
        <NutritionDashboard refreshTrigger={refreshTrigger} />

        {/* Info Section */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Track Your Daily Nutrition</Text>
          <Text style={styles.infoText}>
            Scan food items to add their nutrition values to your daily intake. Monitor your progress throughout the day and maintain a balanced diet.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 22,
    textAlign: 'center',
  },
});
