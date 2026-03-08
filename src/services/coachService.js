import axios from 'axios';
import AuthService from './authService';
import { NutritionTrackerService } from './nutritionTrackerService';
import { HistoryService } from './historyService';

const API_BASE_URL = __DEV__ 
  ? (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api') 
  : (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-production-api.com/api');

export class CoachService {
  static async getContext() {
    try {
      const dailyTotals = await NutritionTrackerService.getDailyTotals();
      const history = await HistoryService.getHistory();
      const recentScans = (history || []).slice(0, 5).map(scan => {
        const cal = scan.nutritionData?.calories;
        const calories = typeof cal === 'object' ? (cal.total || 0) : (cal || 0);
        return {
          productName: scan.type || 'Scanned product',
          calories,
          grade: scan.nutriScore?.grade || 'N/A'
        };
      });
      return { dailyTotals, recentScans };
    } catch (error) {
      console.error('Error getting context:', error);
      return { dailyTotals: null, recentScans: [] };
    }
  }

  static async sendMessage(message, context, sessionId = null) {
    try {
      const token = await AuthService.getToken();
      const body = { message, context };
      if (sessionId) body.sessionId = sessionId;

      const response = await axios.post(
        `${API_BASE_URL}/coach/message`,
        body,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return { 
        success: true, 
        response: response.data.response,
        sessionId: response.data.sessionId || null,
        timestamp: response.data.timestamp || new Date().toISOString() 
      };
    } catch (error) {
      console.error('Error sending message:', error);
      return { 
        success: false, 
        response: 'I am currently unable to reach the server. Please check your connection and try again later.',
        timestamp: new Date().toISOString()
      };
    }
  }
}
