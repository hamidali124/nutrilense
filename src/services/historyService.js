import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@nutrilens_scan_history';

export class HistoryService {
  /**
   * Save a scan result to history
   */
  static async saveScan(imageUri, extractedText, nutritionData = null, ingredientData = null) {
    try {
      const scanItem = {
        id: Date.now().toString(),
        imageUri,
        extractedText,
        nutritionData, // Store structured nutrition data if available
        ingredientData, // Store ingredient data if available
        hasNutritionData: !!nutritionData, // Boolean flag for quick filtering
        hasIngredientData: !!ingredientData, // Boolean flag for ingredient filtering
        type: nutritionData ? 'nutrition' : (ingredientData ? 'ingredients' : 'text'), // Scan type
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
      };

      const existingHistory = await this.getHistory();
      const updatedHistory = [scanItem, ...existingHistory];

      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
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
      const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
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
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
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
      await AsyncStorage.removeItem(HISTORY_KEY);
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
}