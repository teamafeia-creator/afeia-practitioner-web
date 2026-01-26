/**
 * Avatar Component
 * AFEIA Design System
 */

import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Theme, AvatarSize, BorderRadius } from '@/constants';

export interface AvatarProps {
  source?: string;
  name?: string;
  size?: keyof typeof AvatarSize;
  style?: ViewStyle;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getColorFromName(name: string): string {
  const colors = [
    Colors.primary.teal,
    Colors.primary.tealDeep,
    Colors.secondary.sage,
    Colors.secondary.marine,
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ source, name, size = 'md', style }: AvatarProps) {
  const sizeValue = AvatarSize[size];
  const fontSize = sizeValue * 0.4;

  if (source) {
    return (
      <Image
        source={{ uri: source }}
        style={[
          styles.image,
          { width: sizeValue, height: sizeValue, borderRadius: sizeValue / 2 },
          style,
        ]}
      />
    );
  }

  const backgroundColor = name ? getColorFromName(name) : Colors.neutral.grayWarm;
  const initials = name ? getInitials(name) : '?';

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: sizeValue,
          height: sizeValue,
          borderRadius: sizeValue / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.neutral.sand,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.neutral.white,
    fontWeight: '600',
  },
});
