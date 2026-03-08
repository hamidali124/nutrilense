import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './authService';

// Get user-specific storage key
const getHistoryKey = async () => {
  const user = await AuthService.getUser();
  const userId = user?.id || 'anonymous';
  return `@nutrilens_scan_history_${userId}`;
};

export class HistoryService {
  /**
   * Save a scan result to history
   */
  static async saveScan(imageUri, extractedText, nutritionData = null, ingredientData = null) {
    try {
      // Extract NutriScore from nutritionData for easy access (check both camelCase and lowercase)
      const nutriScore = nutritionData?.nutriScore || nutritionData?.nutriscore || null;
      const nutriScoreSummary = nutriScore && !nutriScore.error ? {
        euScore: nutriScore.euScore || null,
        combinedScore: nutriScore.combinedScore || null,
        combinedScore_rounded: nutriScore.combinedScore_rounded || null,
        grade: nutriScore.grade || null,
        breakdown: nutriScore.breakdown || null
      } : null;

      const scanItem = {
        id: Date.now().toString(),
        imageUri,
        extractedText,
        nutritionData, // Store structured nutrition data if available
        ingredientData, // Store ingredient data if available
        nutriScore: nutriScoreSummary, // Store NutriScore separately for easy access
        hasNutritionData: !!nutritionData, // Boolean flag for quick filtering
        hasIngredientData: !!ingredientData, // Boolean flag for ingredient filtering
        type: nutritionData ? 'nutrition' : (ingredientData ? 'ingredients' : 'text'), // Scan type
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
      };

      const existingHistory = await this.getHistory();
      const updatedHistory = [scanItem, ...existingHistory];

      const historyKey = await getHistoryKey();
      await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      return scanItem;
    } catch (error) {
      console.error('Error saving scan to history:', error);
      throw error;
    }
  }

  /**
   * Get all scan history
   */
  static async getHistory() {
    try {
      const historyKey = await getHistoryKey();
      const historyJson = await AsyncStorage.getItem(historyKey);
      return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
      console.error('Error getting scan history:', error);
      return [];
    }
  }

  /**
   * Get only scans that contain nutrition data
   */
  static async getNutritionScans() {
    try {
      const allHistory = await this.getHistory();
      return allHistory.filter(item => item.hasNutritionData && item.nutritionData);
    } catch (error) {
      console.error('Error getting nutrition scans:', error);
      return [];
    }
  }

  /**
   * Get only scans that contain ingredient data
   */
  static async getIngredientScans() {
    try {
      const allHistory = await this.getHistory();
      return allHistory.filter(item => item.hasIngredientData && item.ingredientData);
    } catch (error) {
      console.error('Error getting ingredient scans:', error);
      return [];
    }
  }

  /**
   * Get scans by type
   */
  static async getScansByType(type) {
    try {
      const allHistory = await this.getHistory();
      return allHistory.filter(item => item.type === type);
    } catch (error) {
      console.error('Error getting scans by type:', error);
      return [];
    }
  }

  /**
   * Delete a specific scan from history
   */
  static async deleteScan(scanId) {
    try {
      const history = await this.getHistory();
      const updatedHistory = history.filter(item => item.id !== scanId);
      const historyKey = await getHistoryKey();
      await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      return updatedHistory;
    } catch (error) {
      console.error('Error deleting scan from history:', error);
      throw error;
    }
  }

  /**
   * Clear all history
   */
  static async clearHistory() {
    try {
      const historyKey = await getHistoryKey();
      await AsyncStorage.removeItem(historyKey);
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }

  /**
   * Get history count
   */
  static async getHistoryCount() {
    try {
      const history = await this.getHistory();
      return history.length;
    } catch (error) {
      console.error('Error getting history count:', error);
      return 0;
    }
  }

  /**
   * Get recent scans (convenience method)
   */
  static async getRecentScans(limit = 5) {
    try {
      const history = await this.getHistory();
      return history.slice(0, limit);
    } catch (error) {
      console.error('Error getting recent scans:', error);
      return [];
    }
  }

  /**
   * Get weekly calorie trend - returns array of { day, calories } for last 7 days
   */
  static async getWeeklyCalorieTrend() {
    try {
      const history = await this.getHistory();
      const today = new Date();
      const trend = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString();
        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });

        const dayScans = history.filter(scan => scan.date === dateStr && scan.hasNutritionData);
        let totalCalories = 0;
        dayScans.forEach(scan => {
          const cal = scan.nutritionData?.calories;
          if (typeof cal === 'object') {
            totalCalories += parseFloat(cal.total) || 0;
          } else {
            totalCalories += parseFloat(cal) || 0;
          }
        });

        trend.push({ day: dayLabel, date: dateStr, calories: Math.round(totalCalories) });
      }

      return trend;
    } catch (error) {
      console.error('Error getting weekly calorie trend:', error);
      return [];
    }
  }

  /**
   * Get history grouped by date for SectionList
   */
  static async getGroupedHistory() {
    try {
      const history = await this.getHistory();
      const groups = {};

      history.forEach(item => {
        const date = item.date || 'Unknown Date';
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(item);
      });

      return Object.keys(groups).map(date => ({
        title: date,
        data: groups[date]
      }));
    } catch (error) {
      console.error('Error getting grouped history:', error);
      return [];
    }
  }

  /**
   * Get average NutriScore over a period
   */
  static async getAverageNutriScore(days = 7) {
    try {
      const history = await this.getHistory();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const scoresInRange = history
        .filter(scan => {
          const scanDate = new Date(scan.timestamp);
          return scanDate >= cutoff && scan.nutriScore?.grade;
        })
        .map(scan => {
          const gradeMap = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5 };
          return gradeMap[scan.nutriScore.grade] || 3;
        });

      if (scoresInRange.length === 0) return null;

      const avg = scoresInRange.reduce((a, b) => a + b, 0) / scoresInRange.length;
      const gradeArr = ['A', 'B', 'C', 'D', 'E'];
      const avgGrade = gradeArr[Math.min(Math.round(avg) - 1, 4)];

      return { averageScore: parseFloat(avg.toFixed(1)), averageGrade: avgGrade, count: scoresInRange.length };
    } catch (error) {
      console.error('Error getting average NutriScore:', error);
      return null;
    }
  }

  /**
   * Get risk trend data from scans
   */
  static async getRiskTrend(days = 7) {
    try {
      const history = await this.getHistory();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      return history
        .filter(scan => {
          const scanDate = new Date(scan.timestamp);
          return scanDate >= cutoff && scan.nutriScore?.breakdown;
        })
        .map(scan => ({
          date: scan.date,
          timestamp: scan.timestamp,
          diabetesRisk: scan.nutriScore?.breakdown?.diabetes_risk ?? null,
          hypertensionRisk: scan.nutriScore?.breakdown?.hypertension_risk ?? null
        }))
        .filter(item => item.diabetesRisk !== null || item.hypertensionRisk !== null)
        .reverse();
    } catch (error) {
      console.error('Error getting risk trend:', error);
      return [];
    }
  }

  /**
   * Get most frequently scanned foods
   */
  static async getMostFrequentFoods(limit = 5) {
    try {
      const history = await this.getHistory();
      const foodCounts = {};

      history.forEach(scan => {
        if (scan.hasNutritionData) {
          const name = scan.type || 'Nutrition Scan';
          foodCounts[name] = (foodCounts[name] || 0) + 1;
        }
      });

      return Object.entries(foodCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting most frequent foods:', error);
      return [];
    }
  }

  /**
   * Export history as CSV string
   */
  static async exportAsCSV() {
    try {
      const history = await this.getHistory();
      const header = 'Date,Time,Type,Calories,NutriScore Grade,NutriScore\n';
      const rows = history.map(scan => {
        const cal = scan.nutritionData?.calories;
        const calories = typeof cal === 'object' ? (cal.total || '') : (cal || '');
        const grade = scan.nutriScore?.grade || '';
        const score = scan.nutriScore?.combinedScore_rounded || scan.nutriScore?.euScore || '';
        return `${scan.date},${scan.time},${scan.type},${calories},${grade},${score}`;
      }).join('\n');
      return header + rows;
    } catch (error) {
      console.error('Error exporting CSV:', error);
      return '';
    }
  }
}