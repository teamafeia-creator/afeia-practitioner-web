import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';
import Input from '../ui/Input';

interface Option {
  label: string;
  value: string;
}

interface QuestionSectionProps {
  title: string;
  children: React.ReactNode;
}

interface TextQuestionProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'email-address';
}

interface ChoiceQuestionProps {
  label: string;
  options: Option[];
  value: string;
  onSelect: (value: string) => void;
}

interface MultiChoiceQuestionProps {
  label: string;
  options: Option[];
  values: string[];
  onToggle: (value: string) => void;
}

export function QuestionSection({ title, children }: QuestionSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function TextQuestion({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
}: TextQuestionProps) {
  return (
    <Input
      label={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
      keyboardType={keyboardType}
      style={multiline ? styles.multilineInput : undefined}
    />
  );
}

export function ChoiceQuestion({ label, options, value, onSelect }: ChoiceQuestionProps) {
  return (
    <View style={styles.questionContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionsRow}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.option, value === option.value && styles.optionSelected]}
            onPress={() => onSelect(option.value)}
          >
            <Text
              style={[styles.optionText, value === option.value && styles.optionTextSelected]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function MultiChoiceQuestion({ label, options, values, onToggle }: MultiChoiceQuestionProps) {
  return (
    <View style={styles.questionContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionsWrap}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.chip, values.includes(option.value) && styles.chipSelected]}
            onPress={() => onToggle(option.value)}
          >
            <Text
              style={[styles.chipText, values.includes(option.value) && styles.chipTextSelected]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.teal,
    marginBottom: 20,
  },
  questionContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.charcoal,
    marginBottom: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.teal,
    backgroundColor: Colors.blanc,
  },
  optionSelected: {
    backgroundColor: Colors.teal,
  },
  optionText: {
    fontSize: 14,
    color: Colors.teal,
  },
  optionTextSelected: {
    color: Colors.blanc,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.grisChaud,
    backgroundColor: Colors.blanc,
  },
  chipSelected: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  chipText: {
    fontSize: 13,
    color: Colors.charcoal,
  },
  chipTextSelected: {
    color: Colors.blanc,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
