import React, { memo } from 'react';
import {
  View,
  StyleSheet,
  ViewProps,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';

type CardVariant = 'default' | 'elevated' | 'outlined';

interface BaseCardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  noPadding?: boolean;
}

interface NonPressableCardProps extends BaseCardProps, ViewProps {
  onPress?: never;
}

interface PressableCardProps extends BaseCardProps, TouchableOpacityProps {
  onPress: () => void;
}

type CardProps = NonPressableCardProps | PressableCardProps;

const CardComponent: React.FC<CardProps> = ({
  variant = 'default',
  children,
  noPadding = false,
  onPress,
  style,
  ...props
}) => {
  const cardStyles = [
    styles.base,
    styles[variant],
    noPadding && styles.noPadding,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.7}
        {...(props as TouchableOpacityProps)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyles} {...(props as ViewProps)}>
      {children}
    </View>
  );
};

export const Card = memo(CardComponent);
Card.displayName = 'Card';

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    padding: 16,
  },

  default: {
    backgroundColor: '#1e293b',
  },

  elevated: {
    backgroundColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#334155',
  },

  noPadding: {
    padding: 0,
  },
});

