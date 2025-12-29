import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Sparkles, Send, ArrowLeft, RefreshCw } from 'lucide-react-native';
import { aiService } from '@/lib/ai/aiService';
import { FITNESS_COACH_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { buildUserContext } from '@/lib/ai/contextBuilder';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function CoachScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [userContext, setUserContext] = useState('');
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuthStore();

  // Load user context on mount
  useEffect(() => {
    loadUserContext();
  }, [user]);

  // Add welcome message after context loads
  useEffect(() => {
    if (!isLoadingContext && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hey! 👋 I'm your AI fitness coach. Ask me anything about:

• Exercise form & technique
• Workout programming
• Progressive overload
• Recovery & nutrition
• Your training progress

How can I help you today?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isLoadingContext]);

  const loadUserContext = async () => {
    if (!user) {
      setIsLoadingContext(false);
      return;
    }

    try {
      const [workouts, records, profile] = await Promise.all([
        getRecentWorkouts(user.id, 7),
        getPersonalRecords(user.id),
        getUserProfile(user.id),
      ]);

      const context = buildUserContext({
        recentWorkouts: workouts,
        personalRecords: records,
        currentStreak: profile.current_streak || 0,
        totalWorkouts: profile.total_workouts || 0,
        preferredUnits: profile.weight_unit || 'lbs',
        goals: profile.fitness_goals,
        experienceLevel: profile.experience_level,
      });

      setUserContext(context);
    } catch (error) {
      console.error('Failed to load user context:', error);
    } finally {
      setIsLoadingContext(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input.trim();
    setInput('');
    setIsStreaming(true);
    setStreamingMessage('');

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Build conversation history (last 6 messages for context)
      const conversationHistory = messages.slice(-6).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Add user context to system prompt
      const systemPrompt = `${FITNESS_COACH_SYSTEM_PROMPT}

${userContext ? `USER CONTEXT:\n${userContext}\n\n` : ''}Keep responses concise (2-3 paragraphs max). Be specific and actionable.`;

      let fullResponse = '';

      // Stream the response
      for await (const chunk of aiService.streamComplete(
        [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: userInput },
        ],
        {
          temperature: 0.7,
          maxTokens: 500,
          requestType: 'chat',
        }
      )) {
        fullResponse += chunk;
        setStreamingMessage(fullResponse);
        
        // Auto-scroll as content streams in
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 50);
      }

      // Add complete assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Final scroll
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.message?.includes('limit') 
          ? 'You\'ve reached your daily AI limit. Upgrade to Premium for more requests!'
          : 'Sorry, I had trouble processing that. Please make sure you have an API key configured and try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: `Chat cleared! Ready to help. What's on your mind?`,
        timestamp: new Date(),
      },
    ]);
  };

  const useQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.role === 'user' ? styles.userMessage : styles.assistantMessage,
      ]}
    >
      {item.role === 'assistant' && (
        <View style={styles.avatarContainer}>
          <Sparkles size={16} color="#f59e0b" />
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          item.role === 'user' ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );

  const renderStreamingMessage = () => {
    if (!isStreaming || !streamingMessage) return null;
    
    return (
      <View style={[styles.messageContainer, styles.assistantMessage]}>
        <View style={styles.avatarContainer}>
          <Sparkles size={16} color="#f59e0b" />
        </View>
        <View style={[styles.messageBubble, styles.assistantBubble]}>
          <Text style={styles.messageText}>
            {streamingMessage}
            <Text style={styles.cursor}>▊</Text>
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#f1f5f9" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Sparkles size={20} color="#f59e0b" />
          <Text style={styles.headerTitle}>AI Coach</Text>
        </View>
        <Pressable onPress={clearChat} style={styles.clearButton}>
          <RefreshCw size={20} color="#94a3b8" />
        </Pressable>
      </View>

      {/* Messages */}
      {isLoadingContext ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading your training data...</Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={renderStreamingMessage}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          {/* Typing Indicator - shown before streaming starts */}
          {isLoading && !isStreaming && !streamingMessage && (
            <View style={styles.typingIndicator}>
              <View style={styles.avatarContainer}>
                <Sparkles size={14} color="#f59e0b" />
              </View>
              <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                  <View style={[styles.typingDot, styles.typingDot1]} />
                  <View style={[styles.typingDot, styles.typingDot2]} />
                  <View style={[styles.typingDot, styles.typingDot3]} />
                </View>
              </View>
            </View>
          )}

          {/* Quick Prompts */}
          {messages.length <= 1 && !isLoading && !isStreaming && (
            <View style={styles.quickPrompts}>
              <Text style={styles.quickPromptsTitle}>Quick questions:</Text>
              {[
                'What should I train today?',
                'How do I break through a plateau?',
                'Am I overtraining?',
                'Best exercises for bigger arms?',
              ].map((prompt, i) => (
                <Pressable
                  key={i}
                  style={styles.quickPrompt}
                  onPress={() => useQuickPrompt(prompt)}
                >
                  <Text style={styles.quickPromptText}>{prompt}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask your coach..."
                placeholderTextColor="#6b7280"
                multiline
                maxLength={500}
                editable={!isLoading && !isStreaming}
              />
              <Pressable
                style={[
                  styles.sendButton,
                  (!input.trim() || isLoading || isStreaming) && styles.sendButtonDisabled,
                ]}
                onPress={sendMessage}
                disabled={!input.trim() || isLoading || isStreaming}
              >
                <Send
                  size={20}
                  color={input.trim() && !isLoading && !isStreaming ? '#3b82f6' : '#6b7280'}
                  fill={input.trim() && !isLoading && !isStreaming ? '#3b82f6' : 'transparent'}
                />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </>
      )}
    </SafeAreaView>
  );
}

// Helper functions
async function getRecentWorkouts(userId: string, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from('workouts')
    .select('*, workout_exercises(*, exercises(*))')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  return data || [];
}

async function getPersonalRecords(userId: string) {
  const { data } = await supabase
    .from('personal_records')
    .select('*, exercises(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  return (data || []).map((pr) => ({
    exercise_name: pr.exercises?.name || 'Unknown',
    weight: pr.weight,
    reps: pr.reps,
  }));
}

async function getUserProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return data || {};
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
    marginLeft: 48,
  },
  assistantMessage: {
    justifyContent: 'flex-start',
    marginRight: 48,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  messageBubble: {
    maxWidth: '100%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  messageText: {
    color: '#f1f5f9',
    fontSize: 15,
    lineHeight: 22,
  },
  cursor: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  typingBubble: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },
  quickPrompts: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  quickPromptsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  quickPrompt: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickPromptText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#f1f5f9',
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  sendButtonDisabled: {
    borderColor: '#334155',
  },
});

