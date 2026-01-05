import React, { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/utils/logger';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Sparkles, Send, ArrowLeft, RefreshCw, Database, Play } from 'lucide-react-native';
import { aiService } from '@/lib/ai/aiService';
import { FITNESS_COACH_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { buildCoachContext } from '@/lib/ai/contextBuilder';
import { getCachedData, setCacheData, invalidateCacheKey } from '@/lib/ai/prefetch';
import { parseCoachResponse } from '@/lib/ai/parseActions';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { supabase } from '@/lib/supabase';
import { SuggestedQuestions } from '@/components/ai/SuggestedQuestions';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AuthPromptModal } from '@/components/modals/AuthPromptModal';
import { getCurrentTab } from '@/lib/navigation/navigationState';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function CoachScreen() {
  useBackNavigation(); // Enable Android back gesture support

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState(''); // FIX: Store context.text (string), not the object
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [contextData, setContextData] = useState<{
    hasWorkouts: boolean;
    hasInjuries: boolean;
    isRestDay: boolean;
    lowEnergy: boolean;
  }>({
    hasWorkouts: false,
    hasInjuries: false,
    isRestDay: false,
    lowEnergy: false,
  });
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuthStore();
  const { startWorkout, addExercise, addExerciseWithSets } = useWorkoutStore();
  
  // Auth guard
  const { isAuthenticated, requireAuth, showAuthModal, authMessage, closeAuthModal } = useAuthGuard();

  // Load user context on mount
  useEffect(() => {
    loadUserContext();
    loadChatHistory();
  }, [user]);
  
  // FORCE CLEAR coachContext cache on component mount (to fix any old cached objects)
  useEffect(() => {
    if (user) {
      // Invalidate any potentially corrupted cache from before the fix
      invalidateCacheKey(user.id, 'coachContext');
 logger.log('[Coach] Cache cleared on mount');
    }
  }, []);  // Only on mount

  const loadChatHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('coach_messages')
        .select('id, role, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedMessages: Message[] = data.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
 logger.error('Failed to load chat history:', error);
    }
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('coach_messages')
        .insert({
          user_id: user.id,
          role,
          content,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id;
    } catch (error) {
 logger.error('Failed to save message:', error);
      return null;
    }
  };

  const loadUserContext = async () => {
    if (!user) {
      setIsLoadingContext(false);
      return;
    }

    try {
      // Try to get cached context first (cache for 5 minutes)
      const cached = getCachedData<string>(user.id, 'coachContext', 5 * 60 * 1000);
      
      if (cached) {
 logger.log('[Coach] Using cached context');
        setUserContext(cached);
        setIsLoadingContext(false);
        
        // Still fetch contextual data for suggested questions
        await fetchContextData();
        return;
      }

      // Build fresh context if not cached
 logger.log('[Coach] Building fresh context');
      const context = await buildCoachContext(user.id);
      
      // Extract .text from CoachContext object
      const contextText = typeof context === 'string' ? context : context.text;
      
      // Cache the text for future use
      setCacheData(user.id, 'coachContext', contextText);
      
      setUserContext(contextText);
      
      // Fetch contextual data for suggested questions
      await fetchContextData();
    } catch (error) {
 logger.error('Failed to load user context:', error);
    } finally {
      setIsLoadingContext(false);
    }
  };

  const fetchContextData = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const [workouts, injuries, checkin] = await Promise.all([
        supabase
          .from('workouts')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', weekAgo)
          .limit(1),
        supabase
          .from('user_injuries')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1),
        supabase
          .from('daily_checkins')
          .select('energy_level')
          .eq('user_id', user.id)
          .eq('date', today)
          .single(),
      ]);
      
      // Check if today is a rest day (no workout in last 24 hours)
      const { data: recentWorkout } = await supabase
        .from('workouts')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .single();
      
      setContextData({
        hasWorkouts: (workouts.data?.length ?? 0) > 0,
        hasInjuries: (injuries.data?.length ?? 0) > 0,
        isRestDay: !recentWorkout,
        lowEnergy: (checkin.data?.energy_level ?? 5) <= 2,
      });
    } catch (error) {
 logger.error('Failed to fetch context data:', error);
    }
  };

  const sendMessage = async (messageText?: string) => {
    // Require auth to send messages
    if (!isAuthenticated) {
      requireAuth(() => {}, 'Sign in to chat with your AI fitness coach and get personalized advice.');
      return;
    }
    
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Save user message to database
    const savedUserId = await saveMessage('user', textToSend);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Build conversation history (last 10 messages for context)
      const conversationHistory = messages.slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Add comprehensive user context to system prompt
      const systemPrompt = `${FITNESS_COACH_SYSTEM_PROMPT}

${userContext ? `\n${userContext}\n` : ''}

REMINDER: You are chatting with a human user. Write naturally and conversationally. If you're suggesting a workout, explain it in friendly language BEFORE including the workout block. Keep responses concise (2-3 paragraphs max).`;

      let fullResponse = '';

      // Use non-streaming for better React Native compatibility
      // Streaming has issues with ReadableStream support in RN
      const response = await aiService.complete(
        [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: textToSend },
        ],
        {
          temperature: 0.7,
          maxTokens: 500,
          requestType: 'chat',
        }
      );

      fullResponse = response.content;

      // Add complete assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Save assistant message to database
      await saveMessage('assistant', fullResponse);

      // Final scroll
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
 logger.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.message?.includes('limit') 
          ? 'You\'ve reached your daily AI limit. Upgrade to Premium for more requests!'
          : 'Sorry, I had trouble processing that. Please make sure you have an API key configured and try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      // Save error message too
      await saveMessage('assistant', errorMessage.content);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmClearChat = () => {
    Alert.alert(
      'Clear Chat History',
      'This will permanently delete all your conversation history with the AI Coach. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: clearChat,
        },
      ]
    );
  };

  const clearChat = async () => {
    if (!user) return;

    try {
      // Clear messages from database
      const { error } = await supabase
        .from('coach_messages')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      // Clear local state
      setMessages([]);
    } catch (error) {
 logger.error('Failed to clear chat history:', error);
      // Still clear local state even if DB delete fails
      setMessages([]);
    }
  };

  const refreshContext = async () => {
    if (!user) return;
    
    setIsLoadingContext(true);
    try {
      // Invalidate cache and reload
      invalidateCacheKey(user.id, 'coachContext');
      
      // Build fresh context
      const context = await buildCoachContext(user.id);
      const contextText = typeof context === 'string' ? context : context.text;
      
      // Update cache and state with fresh data
      setCacheData(user.id, 'coachContext', contextText);
      setUserContext(contextText);
      
      // Refresh contextual data for suggested questions
      await fetchContextData();
    } finally {
      setIsLoadingContext(false);
    }
  };

  const handleStartWorkout = async (workoutName: string, exercises: any[]) => {
    if (!exercises || exercises.length === 0) {
      Alert.alert('No Exercises', 'This workout plan has no exercises.');
      return;
    }
    
    try {
      // Start a new workout with the AI-suggested name
      startWorkout(workoutName);
      
      // Search for exercises using the API
      const { searchExercises } = await import('@/lib/api/exercises');
      
      let successCount = 0;
      
      // Add each exercise from the AI suggestion
      for (const exerciseData of exercises) {
        try {
          // Normalize the exercise name for better matching
          let searchTerm = exerciseData.name
            .replace(/s$/i, '')  // Remove trailing 's' (Squats -> Squat)
            .replace(/Dumbbell/i, 'DB')  // Try DB abbreviation
            .trim();
          
          // Try original name first
          let results = await searchExercises(exerciseData.name, 5);
          
          // If no results, try normalized name
          if (!results || results.length === 0) {
            results = await searchExercises(searchTerm, 5);
          }
          
          // If still no results, try just the main word (last word usually)
          if (!results || results.length === 0) {
            const words = exerciseData.name.split(' ');
            const mainWord = words[words.length - 1].replace(/s$/i, '');
            results = await searchExercises(mainWord, 5);
          }
          
          if (results && results.length > 0) {
            // Use the first match - convert to ExerciseDBExercise format
            const dbExercise = results[0];
            
            // Use Supabase UUID
            const exercise = {
              id: dbExercise.id,
              name: dbExercise.name,
              gifUrl: dbExercise.gif_url || '',
              target: dbExercise.primary_muscles?.[0] || 'unknown',
              bodyPart: dbExercise.category || 'other',
              equipment: dbExercise.equipment || 'bodyweight',
              secondaryMuscles: dbExercise.secondary_muscles || [],
              instructions: dbExercise.instructions || [],
            };
            
            // Parse reps to get a number (handle ranges like "8-10")
            const repsValue = String(exerciseData.reps || '10');
            const repsNum = parseInt(repsValue.split('-')[0]) || 10;
            
            // Add exercise with prefilled sets based on AI suggestion
            const prefillSets = Array(exerciseData.sets || 3).fill({
              weight: undefined,
              reps: repsNum,
            });
            
            addExerciseWithSets(exercise, prefillSets);
            successCount++;
            
 logger.log(`S& Added exercise: ${exercise.name} (${exerciseData.sets} sets ${repsNum} reps)`);
          } else {
 logger.warn(`a Exercise not found: ${exerciseData.name}`);
          }
        } catch (error) {
 logger.error(`Failed to add exercise ${exerciseData.name}:`, error);
        }
      }
      
      if (successCount === 0) {
        Alert.alert('No Exercises Added', 'Could not find any of the suggested exercises in the database. Please add exercises manually.');
      }
      
      // Navigate to active workout
      router.push('/workout/active');
    } catch (error) {
 logger.error('Failed to start workout:', error);
      Alert.alert('Error', 'Failed to start workout. Please try again.');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    // Parse the message for actions (only for assistant messages)
    const parsed = item.role === 'assistant' 
      ? parseCoachResponse(item.content)
      : { message: item.content };

    return (
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
          <Text style={styles.messageText}>{parsed.message}</Text>
          <Text style={styles.timestamp}>
            {item.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          
          {/* Action Button for Workout */}
          {parsed.action?.type === 'workout' && parsed.action.name && parsed.action.exercises && (
            <Pressable
              style={styles.actionButton}
              onPress={() => handleStartWorkout(parsed.action?.name ?? '', parsed.action?.exercises ?? [])}
            >
              <Play size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Start This Workout</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.push(getCurrentTab() || '/(tabs)')} style={styles.backButton}>
          <ArrowLeft size={24} color="#f1f5f9" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Sparkles size={20} color="#f59e0b" />
          <Text style={styles.headerTitle}>AI Coach</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={refreshContext} style={styles.actionButton}>
            <Database size={18} color="#94a3b8" />
          </Pressable>
          <Pressable onPress={confirmClearChat} style={styles.actionButton}>
            <RefreshCw size={18} color="#94a3b8" />
          </Pressable>
        </View>
      </View>

      {/* Messages */}
      {isLoadingContext ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading your training data...</Text>
        </View>
      ) : (
        <>
          {messages.length === 0 && !isLoading ? (
            <SuggestedQuestions
              onSelect={(question) => sendMessage(question)}
              hasWorkouts={contextData.hasWorkouts}
              hasPlateaus={false}
              hasInjuries={contextData.hasInjuries}
              isRestDay={contextData.isRestDay}
              lowEnergy={contextData.lowEnergy}
            />
          ) : (
            <>
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messageList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              />

              {/* Typing Indicator */}
              {isLoading && (
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
            </>
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
                editable={!isLoading}
              />
              <Pressable
                style={[
                  styles.sendButton,
                  (!input.trim() || isLoading) && styles.sendButtonDisabled,
                ]}
                onPress={() => sendMessage()}
                disabled={!input.trim() || isLoading}
              >
                <Send
                  size={20}
                  color={input.trim() && !isLoading ? '#3b82f6' : '#6b7280'}
                  fill={input.trim() && !isLoading ? '#3b82f6' : 'transparent'}
                />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </>
      )}
      
      {/* Auth Modal */}
      <AuthPromptModal
        visible={showAuthModal}
        onClose={closeAuthModal}
        message={authMessage}
      />
    </SafeAreaView>
  );
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
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
  timestamp: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
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

