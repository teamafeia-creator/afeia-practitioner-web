import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Card, Button } from '../ui';
import { Colors } from '../../constants/Colors';
import { journalService, JournalEntryInput } from '../../services/api/journal';
import type { JournalEntry, Complement } from '../../types';

interface JournalCardProps {
  todayEntry: JournalEntry | null;
  complements: Complement[];
  onSaved: () => void;
}

const MOOD_EMOJIS = ['😔', '😕', '😐', '🙂', '😊'];

export const JournalCard: React.FC<JournalCardProps> = ({
  todayEntry,
  complements,
  onSaved,
}) => {
  const [isEditing, setIsEditing] = useState(!todayEntry);
  const [formData, setFormData] = useState<JournalEntryInput>({
    mood: todayEntry?.mood || 3,
    alimentation: todayEntry?.alimentation || 3,
    sommeil: todayEntry?.sommeil || 3,
    energie: todayEntry?.energie || 3,
    complementsTaken: todayEntry?.complementsTaken || [],
    problems: todayEntry?.problems || '',
    noteNaturopathe: todayEntry?.noteNaturopathe || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await journalService.createEntry(formData);
      setIsEditing(false);
      onSaved();
    } catch (error) {
      console.error('❌ Error saving journal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleComplement = (id: string) => {
    setFormData(prev => ({
      ...prev,
      complementsTaken: prev.complementsTaken.includes(id)
        ? prev.complementsTaken.filter(c => c !== id)
        : [...prev.complementsTaken, id],
    }));
  };

  if (todayEntry && !isEditing) {
    return (
      <Card
        title="Journal du jour"
        subtitle="Complété"
        headerRight={
          <Button
            title="Modifier"
            onPress={() => setIsEditing(true)}
            variant="ghost"
            size="small"
          />
        }
      >
        <View style={styles.summaryRow}>
          <SummaryItem label="Humeur" value={MOOD_EMOJIS[todayEntry.mood - 1]} />
          <SummaryItem label="Alimentation" value={`${todayEntry.alimentation}/5`} />
          <SummaryItem label="Sommeil" value={`${todayEntry.sommeil}/5`} />
          <SummaryItem label="Énergie" value={`${todayEntry.energie}/5`} />
        </View>
      </Card>
    );
  }

  return (
    <Card title="Journal du jour" subtitle="Comment vous sentez-vous ?">
      {/* Humeur */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Humeur</Text>
        <View style={styles.emojiRow}>
          {MOOD_EMOJIS.map((emoji, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.emojiButton,
                formData.mood === index + 1 && styles.emojiButtonSelected,
              ]}
              onPress={() => setFormData(prev => ({ ...prev, mood: index + 1 }))}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Évaluations */}
      <View style={styles.ratingsContainer}>
        <RatingSelector
          label="Alimentation"
          value={formData.alimentation}
          onChange={v => setFormData(prev => ({ ...prev, alimentation: v }))}
        />
        <RatingSelector
          label="Sommeil"
          value={formData.sommeil}
          onChange={v => setFormData(prev => ({ ...prev, sommeil: v }))}
        />
        <RatingSelector
          label="Énergie"
          value={formData.energie}
          onChange={v => setFormData(prev => ({ ...prev, energie: v }))}
        />
      </View>

      {/* Compléments */}
      {complements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Compléments pris</Text>
          <View style={styles.complementsGrid}>
            {complements.map(comp => (
              <TouchableOpacity
                key={comp.id}
                style={[
                  styles.complementChip,
                  formData.complementsTaken.includes(comp.id) && styles.complementChipSelected,
                ]}
                onPress={() => toggleComplement(comp.id)}
              >
                <Text
                  style={[
                    styles.complementChipText,
                    formData.complementsTaken.includes(comp.id) && styles.complementChipTextSelected,
                  ]}
                >
                  {comp.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Problèmes */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Problèmes particuliers ?</Text>
        <TextInput
          style={styles.textInput}
          value={formData.problems}
          onChangeText={v => setFormData(prev => ({ ...prev, problems: v }))}
          placeholder="Décrivez si vous avez eu des soucis..."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Note pour le naturopathe */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Note pour votre naturopathe</Text>
        <TextInput
          style={styles.textInput}
          value={formData.noteNaturopathe}
          onChangeText={v => setFormData(prev => ({ ...prev, noteNaturopathe: v }))}
          placeholder="Un message à partager..."
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
      </View>

      <Button
        title="Enregistrer"
        onPress={handleSave}
        variant="primary"
        fullWidth
        loading={isLoading}
      />
    </Card>
  );
};

const SummaryItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.summaryItem}>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const RatingSelector: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
}> = ({ label, value, onChange }) => (
  <View style={styles.ratingItem}>
    <Text style={styles.ratingLabel}>{label}</Text>
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity key={star} onPress={() => onChange(star)}>
          <Text style={[styles.star, star <= value && styles.starFilled]}>
            {star <= value ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.charcoal,
    marginBottom: 10,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.sable,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButtonSelected: {
    backgroundColor: Colors.tealLight,
    borderWidth: 2,
    borderColor: Colors.teal,
  },
  emojiText: {
    fontSize: 28,
  },
  ratingsContainer: {
    marginBottom: 20,
  },
  ratingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  ratingLabel: {
    fontSize: 14,
    color: Colors.charcoal,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    fontSize: 24,
    color: Colors.grisChaud,
  },
  starFilled: {
    color: Colors.dore,
  },
  complementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  complementChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.sable,
    borderWidth: 1,
    borderColor: Colors.grisChaud,
  },
  complementChipSelected: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  complementChipText: {
    fontSize: 13,
    color: Colors.charcoal,
  },
  complementChipTextSelected: {
    color: Colors.blanc,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: Colors.sable,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.charcoal,
    minHeight: 80,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.charcoal,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.grisChaud,
  },
});

export default JournalCard;
