import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = (current / total) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <View style={[styles.progress, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.text}>
        Section {current} sur {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 15,
  },
  barContainer: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progress: {
    height: '100%',
    backgroundColor: Colors.teal,
    borderRadius: 3,
  },
  text: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: Colors.charcoal,
  },
});
