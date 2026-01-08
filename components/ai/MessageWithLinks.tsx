/**
 * MessageWithLinks Component
 * 
 * Renders AI chat messages with tappable exercise links.
 * Automatically detects exercise names and makes them clickable.
 */

import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

interface MessageWithLinksProps {
  content: string;
  style?: TextStyle;
}

interface Exercise {
  id: string;
  name: string;
}

// Cache for exercise names (avoid re-fetching)
let exerciseNamesCache: Exercise[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function MessageWithLinks({ content, style }: MessageWithLinksProps) {
  const [exerciseNames, setExerciseNames] = useState<Exercise[]>([]);

  useEffect(() => {
    loadExerciseNames();
  }, []);

  const loadExerciseNames = async () => {
    try {
      // Check cache
      const now = Date.now();
      if (exerciseNamesCache && (now - cacheTimestamp) < CACHE_DURATION) {
        setExerciseNames(exerciseNamesCache);
        return;
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name')
        .eq('is_active', true)
        .limit(500); // Limit to avoid performance issues

      if (error) {
        logger.error('[MessageWithLinks] Error fetching exercises:', error);
        return;
      }

      if (data) {
        exerciseNamesCache = data;
        cacheTimestamp = now;
        setExerciseNames(data);
      }
    } catch (error: unknown) {
      logger.error('[MessageWithLinks] Failed to load exercises:', error);
    }
  };

  const renderTextWithLinks = () => {
    if (exerciseNames.length === 0) {
      // No exercises loaded yet, render plain text
      return <Text style={style}>{content}</Text>;
    }

    // Create regex pattern from exercise names (case-insensitive)
    // Escape special regex characters
    const escapedNames = exerciseNames.map(ex => 
      ex.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    
    // Match whole words only (word boundaries)
    const pattern = `\\b(${escapedNames.join('|')})\\b`;
    const regex = new RegExp(pattern, 'gi');

    // Split text by matches
    const parts: Array<{ text: string; isLink: boolean; exerciseId?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push({
          text: content.substring(lastIndex, match.index),
          isLink: false,
        });
      }

      // Find matching exercise (case-insensitive)
      const matchedText = match[0];
      const exercise = exerciseNames.find(
        ex => ex.name.toLowerCase() === matchedText.toLowerCase()
      );

      // Add matched text as link
      parts.push({
        text: matchedText,
        isLink: true,
        exerciseId: exercise?.id,
      });

      lastIndex = match.index + matchedText.length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        text: content.substring(lastIndex),
        isLink: false,
      });
    }

    // Render parts
    return (
      <Text style={style}>
        {parts.map((part, index) => {
          if (part.isLink && part.exerciseId) {
            return (
              <Text
                key={index}
                style={styles.exerciseLink}
                onPress={() => {
                  if (part.exerciseId) {
                    router.push(`/exercise/${part.exerciseId}?returnTo=coach`);
                  }
                }}
              >
                {part.text}
              </Text>
            );
          }
          return <Text key={index}>{part.text}</Text>;
        })}
      </Text>
    );
  };

  return renderTextWithLinks();
}

const styles = StyleSheet.create({
  exerciseLink: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});

