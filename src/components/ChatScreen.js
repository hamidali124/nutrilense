import React, { useState, useEffect, useRef } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoachService } from '../services/coachService';
import AuthService from '../services/authService';
import { COLORS, SIZES } from '../constants';

const QUICK_ACTIONS = [
  'How am I doing?',
  'Meal ideas',
  'What should I eat?',
  'Explain my risk'
];

const CHAT_STORAGE_KEY_PREFIX = 'coach_chat_state_';

function getWelcomeMessage() {
  return {
    id: 'welcome',
    text: 'Hi! I\'m your NutriLens AI Coach. Ask me about nutrition, your daily intake, meal ideas, or anything food-related!',
    isBot: true,
    timestamp: new Date().toISOString()
  };
}

export const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const flatListRef = useRef(null);
  const storageKeyRef = useRef(`${CHAT_STORAGE_KEY_PREFIX}default`);
  const hasRestoredStateRef = useRef(false);

  useEffect(() => {
    const restoreChatState = async () => {
      try {
        const user = await AuthService.getUser();
        const userId = user?._id || user?.id || 'default';
        storageKeyRef.current = `${CHAT_STORAGE_KEY_PREFIX}${userId}`;

        const raw = await AsyncStorage.getItem(storageKeyRef.current);
        if (!raw) {
          setMessages([getWelcomeMessage()]);
          return;
        }

        const parsed = JSON.parse(raw);
        const restoredMessages = Array.isArray(parsed?.messages) ? parsed.messages : [];
        const restoredSessionId = typeof parsed?.sessionId === 'string' ? parsed.sessionId : null;

        setMessages(restoredMessages.length > 0 ? restoredMessages : [getWelcomeMessage()]);
        setSessionId(restoredSessionId);
      } catch (error) {
        console.error('Failed to restore chat state:', error);
        setMessages([getWelcomeMessage()]);
      } finally {
        hasRestoredStateRef.current = true;
      }
    };

    restoreChatState();
  }, []);

  useEffect(() => {
    const persistChatState = async () => {
      if (!hasRestoredStateRef.current) {
        return;
      }

      try {
        await AsyncStorage.setItem(
          storageKeyRef.current,
          JSON.stringify({
            messages: messages.slice(0, 100),
            sessionId,
            updatedAt: new Date().toISOString()
          })
        );
      } catch (error) {
        console.error('Failed to persist chat state:', error);
      }
    };

    persistChatState();
  }, [messages, sessionId]);

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

      const result = await CoachService.sendMessage(userMsg.text, fullContext, sessionId);

      // Store sessionId for conversation continuity
      if (result.sessionId) {
        setSessionId(result.sessionId);
      }
      
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
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  };

  const renderFormattedText = (text, isBot) => {
    const content = typeof text === 'string' ? text : '';
    const parts = content.split(/(\*\*[\s\S]+?\*\*)/g).filter(Boolean);

    return (
      <Text style={[styles.messageText, isBot ? styles.messageTextBot : styles.messageTextUser]}>
        {parts.map((part, index) => {
          const boldMatch = part.match(/^\*\*([\s\S]+)\*\*$/);
          if (boldMatch) {
            return (
              <Text key={`bold-${index}`} style={styles.messageTextBold}>
                {boldMatch[1]}
              </Text>
            );
          }

          return <Text key={`plain-${index}`}>{part.replace(/\*\*/g, '')}</Text>;
        })}
      </Text>
    );
  };

  const renderMessage = ({ item }) => {
    const isBot = item.isBot;
    return (
      <View style={[styles.messageRow, isBot ? styles.messageRowBot : styles.messageRowUser]}>
        {isBot && (
          <View style={styles.botAvatar}>
            <Ionicons name="nutrition" size={18} color="#fff" />
          </View>
        )}
        <View style={[styles.messageWrapper, isBot ? styles.messageWrapperBot : styles.messageWrapperUser]}>
          <View style={[styles.messageBubble, isBot ? styles.messageBubbleBot : styles.messageBubbleUser]}>
            {renderFormattedText(item.text, isBot)}
          </View>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
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
            <ActivityIndicator size="small" color={COLORS?.primary || '#4CAF50'} />
            <Text style={styles.loadingText}>Coach is typing...</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // softer modern background
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  quickActionsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 5,
  },
  quickActionsScroll: {
    paddingHorizontal: 12,
  },
  quickActionButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS?.primary || '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    shadowColor: COLORS?.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionText: {
    color: COLORS?.primaryDark || '#2E7D32',
    fontSize: 13,
    fontWeight: '600',
  },
  messageList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    maxWidth: '85%',
    alignItems: 'flex-end',
  },
  messageRowBot: {
    alignSelf: 'flex-start',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS?.primary || '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 20, // Align with bubble bottom
  },
  messageWrapper: {
    flex: 1,
  },
  messageWrapperBot: {
    alignItems: 'flex-start',
  },
  messageWrapperUser: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    padding: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  messageBubbleBot: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageBubbleUser: {
    backgroundColor: COLORS?.primary || '#4CAF50',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextBot: {
    color: '#374151',
  },
  messageTextUser: {
    color: '#fff',
  },
  messageTextBold: {
    fontWeight: '800',
    color: '#111827',
  },
  timestamp: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    marginHorizontal: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 13,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 48,
    maxHeight: 120,
    marginRight: 10,
    fontSize: 15,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS?.primary || '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS?.primary || '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  }
});
