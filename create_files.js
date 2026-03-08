const fs = require('fs');
const coachService = \import axios from 'axios';
import AuthService from './authService';
import NutritionTrackerService from './nutritionTrackerService';
import HistoryService from './historyService';

const API_BASE_URL = __DEV__ 
  ? (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api') 
  : (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-production-api.com/api');

export default class CoachService {
  static async getContext() {
    try {
      const dailyTotals = await NutritionTrackerService.getDailyTotals();
      const history = await HistoryService.getHistory();
      const recentScans = (history || []).slice(0, 5).map(scan => ({
        productName: scan.productName,
        calories: scan.nutritionData?.calories || 0,
        grade: scan.nutriScore?.grade || 'N/A'
      }));
      return { dailyTotals, recentScans };
    } catch (error) {
      console.error('Error getting context:', error);
      return { dailyTotals: null, recentScans: [] };
    }
  }

  static async sendMessage(message, context) {
    try {
      const token = await AuthService.getToken();
      const response = await axios.post(
        '\\\/coach/message',
        { message, context },
        { headers: { Authorization: '\\\Bearer \\\\\\' } }
      );
      return { 
        success: true, 
        response: response.data.response, 
        timestamp: new Date().toISOString() 
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
}\;

const chatScreen = \import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CoachService from '../services/coachService';
import { COLORS, SIZES } from '../constants/theme';

const QUICK_ACTIONS = [
  'How am I doing?',
  'Meal ideas',
  'What should I eat?',
  'Explain my risk'
];

export const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    setMessages([{
      id: 'welcome',
      text: 'Hi! I\\'m your NutriLens AI Coach. Ask me about nutrition, your daily intake, meal ideas, or anything food-related!',
      isBot: true,
      timestamp: new Date().toISOString()
    }]);
  }, []);

  const handleSend = async (text = inputText) => {
    if (!text.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      text: text.trim(),
      isBot: false,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [userMsg, ...prev]);
    setInputText('');
    setIsLoading(true);

    try {
      const contextData = await CoachService.getContext();
      const chatHistory = [...messages]
        .slice(0, 10)
        .reverse()
        .map(msg => ({
          role: msg.isBot ? 'assistant' : 'user',
          content: msg.text
        }));

      const fullContext = {
        ...contextData,
        conversationHistory: chatHistory
      };

      const result = await CoachService.sendMessage(userMsg.text, fullContext);
      
      const botMsg = {
        id: (Date.now() + 1).toString(),
        text: result.response,
        isBot: true,
        timestamp: result.timestamp
      };

      setMessages(prev => [botMsg, ...prev]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [{
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        isBot: true,
        timestamp: new Date().toISOString()
      }, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isBot = item.isBot;
    return (
      <View style={[styles.messageWrapper, isBot ? styles.messageWrapperBot : styles.messageWrapperUser]}>
        <View style={[styles.messageBubble, isBot ? styles.messageBubbleBot : styles.messageBubbleUser]}>
          <Text style={[styles.messageText, isBot ? styles.messageTextBot : styles.messageTextUser]}>
            {item.text}
          </Text>
        </View>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Coach</Text>
      </View>

      <View style={styles.quickActionsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
          {QUICK_ACTIONS.map((action, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.quickActionButton}
              onPress={() => handleSend(action)}
              disabled={isLoading}
            >
              <Text style={styles.quickActionText}>{action}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        inverted
        contentContainerStyle={styles.messageList}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='small' color={COLORS?.primary || '#4CAF50'} />
          <Text style={styles.loadingText}>Coach is typing...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder='Type your message...'
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name='send' size={20} color='#fff' />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS?.background || '#f9f9f9',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quickActionsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  quickActionsScroll: {
    paddingHorizontal: 8,
  },
  quickActionButton: {
    backgroundColor: COLORS?.primaryLight || '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  quickActionText: {
    color: COLORS?.primaryDark || '#2E7D32',
    fontSize: 12,
    fontWeight: '500',
  },
  messageList: {
    padding: 16,
  },
  messageWrapper: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  messageWrapperBot: {
    alignSelf: 'flex-start',
  },
  messageWrapperUser: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleBot: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageBubbleUser: {
    backgroundColor: COLORS?.primary || '#4CAF50',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  messageTextBot: {
    color: COLORS?.text?.primary || '#333',
  },
  messageTextUser: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 10,
    color: COLORS?.text?.light || '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 0,
  },
  loadingText: {
    marginLeft: 8,
    color: COLORS?.text?.secondary || '#666',
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 40,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS?.primary || '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  }
});
\;

fs.writeFileSync('e:/FYP/NutriLens/src/services/coachService.js', coachService);
fs.writeFileSync('e:/FYP/NutriLens/src/components/ChatScreen.js', chatScreen);
console.log('Done!');

