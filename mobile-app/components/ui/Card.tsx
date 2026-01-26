import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/Colors';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
  onPress?: () => void;
  headerRight?: React.ReactNode;
  noPadding?: boolean;
  variant?: 'default' | 'outlined' | 'elevated';
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  style,
  onPress,
  headerRight,
  noPadding = false,
  variant = 'default',
}) => {
  const cardStyle: ViewStyle[] = [styles.card, styles[variant]];

  if (noPadding) {
    cardStyle.push(styles.noPadding);
  }

  if (style) {
    cardStyle.push(style);
  }

  const content = (
    <View style={cardStyle}>
      {(title || headerRight) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
        </View>
      )}
      <View style={[styles.content, noPadding && styles.contentNoPadding]}>
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.blanc,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  default: {
    shadowColor: Colors.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.grisChaud,
  },
  elevated: {
    shadowColor: Colors.charcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  noPadding: {
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerText: {
    flex: 1,
  },
  headerRight: {
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.charcoal,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.grisChaud,
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
  contentNoPadding: {
    padding: 0,
  },
});

export default Card;
