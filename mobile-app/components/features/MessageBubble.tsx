import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatTime } from '../../utils/dates';
import { colors, spacing, fontSize, borderRadius } from '../../constants/theme';

interface MessageBubbleProps {
  content: string;
  senderType: 'patient' | 'praticien';
  timestamp: string;
  read?: boolean;
}

export function MessageBubble({
  content,
  senderType,
  timestamp,
  read,
}: MessageBubbleProps) {
  const isPatient = senderType === 'patient';

  return (
    <View
      style={[
        styles.container,
        isPatient ? styles.containerRight : styles.containerLeft,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isPatient ? styles.bubblePatient : styles.bubblePraticien,
        ]}
      >
        <Text
          style={[
            styles.text,
            isPatient ? styles.textPatient : styles.textPraticien,
          ]}
        >
          {content}
        </Text>
      </View>
      <View
        style={[
          styles.meta,
          isPatient ? styles.metaRight : styles.metaLeft,
        ]}
      >
        <Text style={styles.time}>{formatTime(timestamp)}</Text>
        {isPatient && read !== undefined && (
          <Text style={styles.readStatus}>{read ? '\u2713\u2713' : '\u2713'}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    maxWidth: '80%',
  },
  containerRight: {
    alignSelf: 'flex-end',
  },
  containerLeft: {
    alignSelf: 'flex-start',
  },
  bubble: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  bubblePatient: {
    backgroundColor: colors.primary[500],
    borderBottomRightRadius: spacing.xs,
  },
  bubblePraticien: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  text: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  textPatient: {
    color: colors.white,
  },
  textPraticien: {
    color: colors.neutral[900],
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  metaRight: {
    justifyContent: 'flex-end',
  },
  metaLeft: {
    justifyContent: 'flex-start',
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
  },
  readStatus: {
    fontSize: fontSize.xs,
    color: colors.primary[500],
  },
});
