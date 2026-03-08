/**
 * Module 4 & 5 Tests - AI Coach and Dashboard
 * Tests for coachService, alertHelper, and historyService extensions
 */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock axios
jest.mock('axios');

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { generateAlerts } from '../src/helpers/alertHelper';

describe('Module 4: AI Nutrition Coach', () => {
  describe('4.1 Alert Generation', () => {
    test('should generate sugar exceeded alert when over limit', () => {
      const totals = { calories: 1000, carbs: 100, fat: 30, protein: 40, sugar: 60 };
      const goals = { calories: 2000, carbs: 300, fat: 65, protein: 50, sugar: 50 };
      const alerts = generateAlerts(totals, goals, [], null);
      
      const sugarAlert = alerts.find(a => a.id === 'sugar_exceeded');
      expect(sugarAlert).toBeDefined();
      expect(sugarAlert.severity).toBe('high');
      expect(sugarAlert.title).toContain('Sugar');
    });

    test('should generate sugar warning when approaching limit', () => {
      const totals = { calories: 1000, carbs: 100, fat: 30, protein: 40, sugar: 42 };
      const goals = { calories: 2000, carbs: 300, fat: 65, protein: 50, sugar: 50 };
      const alerts = generateAlerts(totals, goals, [], null);
      
      const sugarWarning = alerts.find(a => a.id === 'sugar_warning');
      expect(sugarWarning).toBeDefined();
      expect(sugarWarning.severity).toBe('medium');
    });

    test('should generate calorie exceeded alert', () => {
      const totals = { calories: 2200, carbs: 250, fat: 70, protein: 80, sugar: 30 };
      const goals = { calories: 2000, carbs: 300, fat: 65, protein: 50, sugar: 50 };
      const alerts = generateAlerts(totals, goals, [], null);
      
      const calAlert = alerts.find(a => a.id === 'calories_exceeded');
      expect(calAlert).toBeDefined();
      expect(calAlert.severity).toBe('high');
    });

    test('should generate diabetes risk alert when risk is high', () => {
      const totals = { calories: 1500, carbs: 200, fat: 50, protein: 60, sugar: 30 };
      const goals = { calories: 2000, carbs: 300, fat: 65, protein: 50, sugar: 50 };
      const riskData = [{ diabetesRisk: 0.75, hypertensionRisk: 0.2 }];
      const alerts = generateAlerts(totals, goals, riskData, null);
      
      const diabetesAlert = alerts.find(a => a.id === 'diabetes_risk');
      expect(diabetesAlert).toBeDefined();
    });

    test('should generate hypertension risk alert when risk is high', () => {
      const totals = { calories: 1500, carbs: 200, fat: 50, protein: 60, sugar: 30 };
      const goals = { calories: 2000, carbs: 300, fat: 65, protein: 50, sugar: 50 };
      const riskData = [{ diabetesRisk: 0.2, hypertensionRisk: 0.85 }];
      const alerts = generateAlerts(totals, goals, riskData, null);
      
      const htnAlert = alerts.find(a => a.id === 'hypertension_risk');
      expect(htnAlert).toBeDefined();
      expect(htnAlert.severity).toBe('high');
    });

    test('should generate poor NutriScore trend alert', () => {
      const totals = { calories: 1500, carbs: 200, fat: 50, protein: 60, sugar: 30 };
      const goals = { calories: 2000, carbs: 300, fat: 65, protein: 50, sugar: 50 };
      const weeklyAvg = { averageScore: 4.2, averageGrade: 'D', count: 5 };
      const alerts = generateAlerts(totals, goals, [], weeklyAvg);
      
      const trendAlert = alerts.find(a => a.id === 'nutriscore_trend');
      expect(trendAlert).toBeDefined();
    });

    test('should return empty alerts when everything is within limits', () => {
      const totals = { calories: 800, carbs: 100, fat: 30, protein: 40, sugar: 20 };
      const goals = { calories: 2000, carbs: 300, fat: 65, protein: 50, sugar: 50 };
      const alerts = generateAlerts(totals, goals, [], null);
      
      expect(alerts.length).toBe(0);
    });

    test('should sort alerts by severity (high first)', () => {
      const totals = { calories: 2200, carbs: 250, fat: 70, protein: 80, sugar: 60 };
      const goals = { calories: 2000, carbs: 300, fat: 65, protein: 50, sugar: 50 };
      const alerts = generateAlerts(totals, goals, [], null);
      
      if (alerts.length >= 2) {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        for (let i = 0; i < alerts.length - 1; i++) {
          expect(severityOrder[alerts[i].severity]).toBeLessThanOrEqual(
            severityOrder[alerts[i + 1].severity]
          );
        }
      }
    });

    test('should generate low protein alert when protein is very low but calories consumed', () => {
      const totals = { calories: 1500, carbs: 250, fat: 50, protein: 10, sugar: 30 };
      const goals = { calories: 2000, carbs: 300, fat: 65, protein: 50, sugar: 50 };
      const alerts = generateAlerts(totals, goals, [], null);
      
      const proteinAlert = alerts.find(a => a.id === 'protein_low');
      expect(proteinAlert).toBeDefined();
      expect(proteinAlert.type).toBe('deficiency');
    });

    test('should handle null/undefined inputs gracefully', () => {
      const alerts = generateAlerts(null, null, null, null);
      expect(Array.isArray(alerts)).toBe(true);
    });

    test('should handle empty objects gracefully', () => {
      const alerts = generateAlerts({}, {}, [], null);
      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});

describe('Module 5: Dashboard & Analytics', () => {
  describe('5.1 History Service Extensions', () => {
    const { HistoryService } = require('../src/services/historyService');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('getWeeklyCalorieTrend should return 7 days of data', async () => {
      // Mock getHistory to return scan data
      const mockHistory = [
        {
          id: '1',
          date: new Date().toLocaleDateString(),
          timestamp: new Date().toISOString(),
          hasNutritionData: true,
          nutritionData: { calories: { total: 200 } }
        }
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockHistory));
      
      const trend = await HistoryService.getWeeklyCalorieTrend();
      expect(trend).toHaveLength(7);
      expect(trend[0]).toHaveProperty('day');
      expect(trend[0]).toHaveProperty('calories');
    });

    test('getAverageNutriScore should return null when no scored scans', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      
      const avg = await HistoryService.getAverageNutriScore(7);
      expect(avg).toBeNull();
    });

    test('getAverageNutriScore should compute average grade', async () => {
      const mockHistory = [
        { id: '1', timestamp: new Date().toISOString(), nutriScore: { grade: 'A' } },
        { id: '2', timestamp: new Date().toISOString(), nutriScore: { grade: 'B' } },
        { id: '3', timestamp: new Date().toISOString(), nutriScore: { grade: 'A' } },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockHistory));
      
      const avg = await HistoryService.getAverageNutriScore(7);
      expect(avg).not.toBeNull();
      expect(avg.count).toBe(3);
      expect(['A', 'B']).toContain(avg.averageGrade);
    });

    test('getMostFrequentFoods should count and sort scans', async () => {
      const mockHistory = [
        { id: '1', type: 'nutrition', hasNutritionData: true },
        { id: '2', type: 'nutrition', hasNutritionData: true },
        { id: '3', type: 'nutrition', hasNutritionData: true },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockHistory));
      
      const foods = await HistoryService.getMostFrequentFoods(5);
      expect(foods.length).toBeGreaterThanOrEqual(1);
      expect(foods[0]).toHaveProperty('name');
      expect(foods[0]).toHaveProperty('count');
    });

    test('getRiskTrend should extract risk data from scans', async () => {
      const mockHistory = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          date: new Date().toLocaleDateString(),
          nutriScore: {
            grade: 'C',
            breakdown: {
              diabetes_risk: 0.45,
              hypertension_risk: 0.32
            }
          }
        }
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockHistory));
      
      const risks = await HistoryService.getRiskTrend(7);
      expect(risks.length).toBe(1);
      expect(risks[0]).toHaveProperty('diabetesRisk');
      expect(risks[0]).toHaveProperty('hypertensionRisk');
    });

    test('getGroupedHistory should group scans by date', async () => {
      const today = new Date().toLocaleDateString();
      const mockHistory = [
        { id: '1', date: today, hasNutritionData: true },
        { id: '2', date: today, hasNutritionData: true },
        { id: '3', date: '1/1/2025', hasNutritionData: true },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockHistory));
      
      const grouped = await HistoryService.getGroupedHistory();
      expect(grouped.length).toBeGreaterThanOrEqual(1);
      expect(grouped[0]).toHaveProperty('title');
      expect(grouped[0]).toHaveProperty('data');
    });

    test('exportAsCSV should return CSV string with header', async () => {
      const mockHistory = [
        {
          id: '1',
          date: '1/1/2025',
          time: '10:00 AM',
          type: 'nutrition',
          nutritionData: { calories: 200 },
          nutriScore: { grade: 'B', combinedScore_rounded: 3 }
        }
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockHistory));
      
      const csv = await HistoryService.exportAsCSV();
      expect(csv).toContain('Date,Time,Type,Calories');
      expect(csv).toContain('1/1/2025');
      expect(csv).toContain('B');
    });
  });
});
