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
import { Sparkles, Send, ArrowLeft, RefreshCw, Play } from 'lucide-react-native';
import { aiService } from '@/lib/ai/aiService';
import { FITNESS_COACH_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { buildCoachContext } from '@/lib/ai/contextBuilder';
import { getCachedData, setCacheData, invalidateCacheKey } from '@/lib/ai/prefetch';
import { parseCoachResponse } from '@/lib/ai/parseActions';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { supabase } from '@/lib/supabase';
import { SuggestedQuestions } from '@/components/ai/SuggestedQuestions';
import { MessageWithLinks } from '@/components/ai/MessageWithLinks';
import { plateauDetectionService, PlateauAlert } from '@/lib/ai/plateauDetection';
import { tabDataCache } from '@/lib/cache/tabDataCache';
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
  const [isLoadingContext, setIsLoadingContext] = useState(false); // Changed to false, only set to true if cache miss
  const [isLoadingContextData, setIsLoadingContextData] = useState(false); // Changed to false, only set to true if cache miss
  
  const [contextData, setContextData] = useState<{
    hasWorkouts: boolean;
    hasInjuries: boolean;
    isRestDay: boolean;
    lowEnergy: boolean;
    hasPlateaus: boolean;
    plateaus: PlateauAlert[]; // NEW: Store full plateau data
  }>({
    hasWorkouts: false,
    hasInjuries: false,
    isRestDay: false,
    lowEnergy: false,
    hasPlateaus: false,
    plateaus: [], // NEW
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
 logger.error('Failed to save message:', error);
      return null;
    }
  };

  const loadUserContext = async () => {
    if (!user) {
      return;
    }

    const CACHE_KEY = `coach-context-${user.id}`;
    
    // Check global cache first (survives component unmount)
    const cachedContext = tabDataCache.get<string>(CACHE_KEY);
    if (cachedContext) {
 logger.log('[Coach] Using cached context from tabDataCache');
      setUserContext(cachedContext);
      // Still fetch contextual data for suggested questions (it has its own cache)
      await fetchContextData();
      return;
    }

    setIsLoadingContext(true);

    try {
      // Try to get cached context from AI cache (5 minutes)
      const cached = getCachedData<string>(user.id, 'coachContext', 5 * 60 * 1000);
      
      if (cached) {
 logger.log('[Coach] Using cached context from AI cache');
        setUserContext(cached);
        // Store in tabDataCache for next time
        tabDataCache.set(CACHE_KEY, cached);
        
        // Still fetch contextual data for suggested questions
        await fetchContextData();
        return;
      }

      // Build fresh context if not cached
 logger.log('[Coach] Building fresh context');
      const context = await buildCoachContext(user.id);
      
      // Extract .text from CoachContext object
      const contextText = typeof context === 'string' ? context : context.text;
      
      // Cache the text for future use (both caches)
      setCacheData(user.id, 'coachContext', contextText);
      tabDataCache.set(CACHE_KEY, contextText);
      
      setUserContext(contextText);
      
      // Fetch contextual data for suggested questions
      await fetchContextData();
    } catch (error: unknown) {
 logger.error('Failed to load user context:', error);
    } finally {
      setIsLoadingContext(false);
    }
  };

  const fetchContextData = async () => {
    if (!user) return;
    
    const CACHE_KEY = `coach-contextData-${user.id}`;
    
    // Check global cache first (survives component unmount)
    const cachedData = tabDataCache.get<typeof contextData>(CACHE_KEY, 2 * 60 * 1000); // 2 minutes
    if (cachedData) {
 logger.log('[Coach] Using cached context data from tabDataCache');
      setContextData(cachedData);
      return;
    }
    
    setIsLoadingContextData(true);
    
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
      
      // Check for plateaus using PlateauDetectionService
      const plateaus = await plateauDetectionService.detectPlateaus(user.id);
      
      const newContextData = {
        hasWorkouts: (workouts.data?.length ?? 0) > 0,
        hasInjuries: (injuries.data?.length ?? 0) > 0,
        isRestDay: !recentWorkout,
        lowEnergy: (checkin.data?.energy_level ?? 5) <= 2,
        hasPlateaus: plateaus.length > 0,
        plateaus: plateaus, // NEW: Store full array
      };
      
      setContextData(newContextData);
      
      // Store in tabDataCache
      tabDataCache.set(CACHE_KEY, newContextData);
    } catch (error: unknown) {
 logger.error('Failed to fetch context data:', error);
    } finally {
      setIsLoadingContextData(false);
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

🎯 WORKOUT BUTTON FEATURE - IMPORTANT:
When the user asks ANY of these questions, you MUST include a structured workout block:
- "suggest a workout" / "suggest me a workout"
- "what should I train" / "what should I do today"
- "create a workout" / "give me a workout"
- "workout for [muscle]" (e.g., "workout for chest")
- "push/pull/legs day" / "upper/lower body"
- "beginner/intermediate/advanced workout"
- ANY question about getting a workout plan/routine

MANDATORY FORMAT:
1. Write 2-3 friendly sentences explaining the workout
2. Then add this EXACT structure:

\`\`\`workout
{
  "name": "Descriptive Workout Name",
  "exercises": [
    {"name": "Exercise Name", "sets": 3, "reps": "8-10"},
    {"name": "Another Exercise", "sets": 4, "reps": "6-8"}
  ]
}
\`\`\`

✅ EXAMPLE RESPONSE:
"Perfect! Here's a solid push day to build chest and shoulders. Focus on controlled reps and full range of motion!

\`\`\`workout
{
  "name": "Push Day",
  "exercises": [
    {"name": "Bench Press", "sets": 4, "reps": "8-10"},
    {"name": "Overhead Press", "sets": 3, "reps": "8-12"},
    {"name": "Tricep Dips", "sets": 3, "reps": "10-12"}
  ]
}
\`\`\`"

This creates a button that lets them START the workout immediately! Always include this when suggesting workouts.

REMINDER: Write naturally and conversationally. Keep responses concise (2-3 paragraphs max).`;

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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
 logger.error('Failed to send message:', error);
      const errorMsg: Message = {
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
    } catch (error: unknown) {
 logger.error('Failed to clear chat history:', error);
      // Still clear local state even if DB delete fails
      setMessages([]);
    }
  };

  const handleStartWorkout = async (workoutName: string, exercises: Array<{ name: string; sets?: number; reps?: string }>) => {
    logger.log('[Coach] handleStartWorkout called:', { workoutName, exerciseCount: exercises.length });
    
    if (!exercises || exercises.length === 0) {
      Alert.alert('No Exercises', 'This workout plan has no exercises.');
      return;
    }
    
    try {
      // Start a new workout with the AI-suggested name
      logger.log('[Coach] Starting workout:', workoutName);
      startWorkout(workoutName);
      
      // Search for exercises using the API
      const { searchExercises } = await import('@/lib/api/exercises');
      
      let successCount = 0;
      const failedExercises: string[] = [];
      
      // Helper function to find best matching exercise
      const findBestMatch = (exerciseName: string, results: any[]): any | null => {
        if (!results || results.length === 0) return null;
        
        const nameLower = exerciseName.toLowerCase().trim();
        
        // 1. Try exact match (case-insensitive)
        const exactMatch = results.find(r => r.name.toLowerCase() === nameLower);
        if (exactMatch) {
          return exactMatch;
        }
        
        // 2. Try exact match after removing trailing 's'
        const singularName = nameLower.replace(/s$/i, '');
        const singularMatch = results.find(r => 
          r.name.toLowerCase() === singularName || 
          r.name.toLowerCase().replace(/s$/i, '') === singularName
        );
        if (singularMatch) {
          return singularMatch;
        }
        
        // 3. Score each result based on word overlap
        const exerciseWords = nameLower.split(/\s+/).filter(w => w.length > 2);
        const scored = results.map(r => {
          const resultWords = r.name.toLowerCase().split(/\s+/);
          const matchedWords = exerciseWords.filter(ew => 
            resultWords.some(rw => rw.includes(ew) || ew.includes(rw))
          );
          const score = matchedWords.length / exerciseWords.length;
          return { exercise: r, score };
        });
        
        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);
        
        // Return best match if score is at least 50%
        if (scored[0].score >= 0.5) {
          return scored[0].exercise;
        }
        
        return null;
      };
      
      // Add each exercise from the AI suggestion
      for (const exerciseData of exercises) {
        try {
          logger.log('[Coach] Searching for exercise:', exerciseData.name);
          
          // Try original name first
          let results = await searchExercises(exerciseData.name, 10);
          let bestMatch = findBestMatch(exerciseData.name, results);
          
          // If no good match, try without trailing 's'
          if (!bestMatch) {
            const singularName = exerciseData.name.replace(/s$/i, '').trim();
            logger.log('[Coach] Trying singular form:', singularName);
            results = await searchExercises(singularName, 10);
            bestMatch = findBestMatch(singularName, results);
          }
          
          // If still no match, try normalized name (DB -> Dumbbell)
          if (!bestMatch) {
            const normalizedName = exerciseData.name
              .replace(/\bDB\b/gi, 'Dumbbell')
              .replace(/\bBB\b/gi, 'Barbell')
              .trim();
            logger.log('[Coach] Trying normalized name:', normalizedName);
            results = await searchExercises(normalizedName, 10);
            bestMatch = findBestMatch(normalizedName, results);
          }
          
          if (bestMatch) {
            logger.log('[Coach] Found exercise:', bestMatch.name);
            
            // Create exercise object with all required fields
            const exercise = {
              id: bestMatch.id, // Use database UUID as primary ID
              dbId: bestMatch.id, // UUID for database operations
              name: bestMatch.name,
              gifUrl: bestMatch.gif_url || '',
              target: bestMatch.primary_muscles?.[0] || 'unknown',
              bodyPart: bestMatch.category || 'other',
              equipment: bestMatch.equipment || 'bodyweight',
              secondaryMuscles: bestMatch.secondary_muscles || [],
              instructions: bestMatch.instructions || [],
            };
            
            logger.log('[Coach] Exercise object created:', {
              id: exercise.id,
              dbId: exercise.dbId,
              name: exercise.name,
            });
            
            // Add exercise with empty sets (no pre-filled weight/reps)
            // User will fill in their own values like templates
            // Always default to 3 sets
            const targetSets = 3;
            
            logger.log('[Coach] Adding exercise to workout:', {
              name: exercise.name,
              sets: targetSets,
            });
            
            addExerciseWithSets(exercise, [], targetSets);
            successCount++;
          } else {
            logger.warn('[Coach] Exercise not found:', exerciseData.name);
            failedExercises.push(exerciseData.name);
          }
        } catch (error: unknown) {
          logger.error(`[Coach] Failed to add exercise ${exerciseData.name}:`, error);
          failedExercises.push(exerciseData.name);
        }
      }
      
      logger.log('[Coach] Workout setup complete:', {
        successCount,
        failedCount: failedExercises.length,
        failed: failedExercises,
      });
      
      if (successCount === 0) {
        Alert.alert(
          'No Exercises Added',
          'Could not find any of the suggested exercises in the database. Please add exercises manually.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      if (failedExercises.length > 0 && successCount > 0) {
        Alert.alert(
          'Partial Success',
          `Added ${successCount} exercise(s). Could not find: ${failedExercises.join(', ')}`,
          [
            {
              text: 'Continue Anyway',
              onPress: () => router.push('/workout/active'),
            },
          ]
        );
      } else {
        // Navigate to active workout
        logger.log('[Coach] Navigating to active workout...');
        router.push('/workout/active');
      }
    } catch (error: unknown) {
      logger.error('[Coach] Failed to start workout:', error);
      Alert.alert('Error', 'Failed to start workout. Please try again.');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    // Parse the message for actions (only for assistant messages)
    const parsed = item.role === 'assistant' 
      ? parseCoachResponse(item.content)
      : { message: item.content };

    // DEBUG: Log parsed result
    if (item.role === 'assistant') {
      logger.log('[Coach] Parsed message:', {
        hasAction: !!parsed.action,
        actionType: parsed.action?.type,
        exerciseCount: parsed.action?.exercises?.length || 0,
        workoutName: parsed.action?.name,
      });
      
      // Log button render status
      if (parsed.action?.type === 'workout' && parsed.action.name && parsed.action.exercises) {
        logger.log('[Coach] ✅ RENDERING WORKOUT BUTTON');
      } else if (parsed.action) {
        logger.log('[Coach] ❌ NOT rendering button:', {
          hasType: !!parsed.action?.type,
          type: parsed.action?.type,
          hasName: !!parsed.action?.name,
          hasExercises: !!parsed.action?.exercises,
        });
      }
    }

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
          {/* NEW: Render with exercise links for assistant messages */}
          {item.role === 'assistant' ? (
            <MessageWithLinks content={parsed.message} style={styles.messageText} />
          ) : (
            <Text style={styles.messageText}>{parsed.message}</Text>
          )}
          <Text style={styles.timestamp}>
            {item.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          
          {/* Action Button for Workout */}
          {parsed.action?.type === 'workout' && parsed.action.name && parsed.action.exercises && (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { opacity: pressed ? 0.7 : 1 }
              ]}
              onPress={() => {
                logger.log('[Coach] Button pressed! Action:', parsed.action);
                handleStartWorkout(parsed.action?.name ?? '', parsed.action?.exercises ?? []);
              }}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
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
          <Pressable onPress={confirmClearChat} style={styles.headerActionButton}>
            <RefreshCw size={18} color="#94a3b8" />
          </Pressable>
        </View>
      </View>

      {/* Messages */}
      {isLoadingContext || isLoadingContextData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading your training data...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
        >
          {messages.length === 0 && !isLoading ? (
            <SuggestedQuestions
              onSelect={(question) => sendMessage(question)}
              hasWorkouts={contextData.hasWorkouts}
              hasPlateaus={contextData.hasPlateaus}
              plateaus={contextData.plateaus}
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
  keyboardAvoidingView: {
    flex: 1,
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
  headerActionButton: {
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
    paddingBottom: 16,
    marginTop: 8,
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



