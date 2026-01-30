import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../constants/Colors';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { api } from '../services/api';
import { JournalEntry } from '../types';

interface JournalScreenProps {
  onBack: () => void;
}

export default function JournalScreen({ onBack }: JournalScreenProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<JournalEntry[]>([]);

  // Form state
  const [mood, setMood] = useState(5);
  const [alimentation, setAlimentation] = useState(5);
  const [sleep, setSleep] = useState(7);
  const [energy, setEnergy] = useState(5);
  const [problems, setProblems] = useState('');
  const [noteForNaturo, setNoteForNaturo] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await api.getJournalHistory();
      setHistory(data.entries || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      // Ne pas utiliser de donnees mockees - afficher une liste vide
      setHistory([]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.submitJournal({
        date: new Date().toISOString(),
        mood,
        alimentation,
        sleep,
        energy,
        problems,
        noteForNaturo,
      });
      Alert.alert('Succès', 'Votre journal a été enregistré !');
      setMode('view');
      loadHistory();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer le journal');
    } finally {
      setLoading(false);
    }
  };

  const getMoodEmoji = (value: number) => {
    if (value >= 8) return '😄';
    if (value >= 6) return '🙂';
    if (value >= 4) return '😐';
    if (value >= 2) return '😕';
    return '😢';
  };

  const renderSlider = (
    label: string,
    value: number,
    setValue: (v: number) => void,
    max: number = 10,
    unit: string = ''
  ) => (
    <View style={styles.sliderContainer}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <View style={styles.sliderRow}>
        <TouchableOpacity
          style={styles.sliderButton}
          onPress={() => setValue(Math.max(0, value - 1))}
        >
          <Text style={styles.sliderButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.sliderValue}>
          {value}{unit}{max === 10 && '/10'}
        </Text>
        <TouchableOpacity
          style={styles.sliderButton}
          onPress={() => setValue(Math.min(max, value + 1))}
        >
          <Text style={styles.sliderButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (mode === 'edit') {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode('view')}>
            <Text style={styles.backButton}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Journal du jour</Text>
        </View>

        <Card>
          <View style={styles.moodSection}>
            <Text style={styles.moodEmoji}>{getMoodEmoji(mood)}</Text>
            {renderSlider('Comment vous sentez-vous ?', mood, setMood)}
          </View>
        </Card>

        <Card>
          {renderSlider('Qualité de l\'alimentation', alimentation, setAlimentation)}
          {renderSlider('Heures de sommeil', sleep, setSleep, 12, 'h')}
          {renderSlider('Niveau d\'énergie', energy, setEnergy)}
        </Card>

        <Card>
          <Input
            label="Problèmes ou symptômes rencontrés"
            value={problems}
            onChangeText={setProblems}
            placeholder="Maux de tête, fatigue..."
            multiline
            numberOfLines={3}
          />
          <Input
            label="Note pour votre naturopathe"
            value={noteForNaturo}
            onChangeText={setNoteForNaturo}
            placeholder="Questions, remarques..."
            multiline
            numberOfLines={3}
          />
        </Card>

        <View style={styles.submitButton}>
          <Button title="Enregistrer" onPress={handleSubmit} loading={loading} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📔 Mon Journal</Text>
      </View>

      <TouchableOpacity style={styles.newEntryButton} onPress={() => setMode('edit')}>
        <Text style={styles.newEntryButtonText}>+ Nouvelle entrée</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Historique</Text>
      {history.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Aucune entrée dans votre journal</Text>
        </Card>
      ) : (
        history.map((entry) => (
          <Card key={entry.id}>
            <View style={styles.entryHeader}>
              <Text style={styles.entryDate}>
                {new Date(entry.date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
              <Text style={styles.entryMood}>{getMoodEmoji(entry.mood)}</Text>
            </View>
            <View style={styles.entryStats}>
              <View style={styles.entryStat}>
                <Text style={styles.entryStatValue}>{entry.mood}/10</Text>
                <Text style={styles.entryStatLabel}>Humeur</Text>
              </View>
              <View style={styles.entryStat}>
                <Text style={styles.entryStatValue}>{entry.sleep}h</Text>
                <Text style={styles.entryStatLabel}>Sommeil</Text>
              </View>
              <View style={styles.entryStat}>
                <Text style={styles.entryStatValue}>{entry.energy}/10</Text>
                <Text style={styles.entryStatLabel}>Énergie</Text>
              </View>
              <View style={styles.entryStat}>
                <Text style={styles.entryStatValue}>{entry.alimentation}/10</Text>
                <Text style={styles.entryStatLabel}>Alimentation</Text>
              </View>
            </View>
            {entry.problems && (
              <Text style={styles.entryNote}>📝 {entry.problems}</Text>
            )}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sable,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    color: Colors.teal,
    fontSize: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.teal,
  },
  newEntryButton: {
    backgroundColor: Colors.dore,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 25,
  },
  newEntryButtonText: {
    color: Colors.blanc,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.charcoal,
    marginBottom: 15,
  },
  emptyText: {
    color: Colors.grisChaud,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  moodSection: {
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.charcoal,
    marginBottom: 10,
    textAlign: 'center',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonText: {
    color: Colors.blanc,
    fontSize: 24,
    fontWeight: 'bold',
  },
  sliderValue: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.charcoal,
    minWidth: 80,
    textAlign: 'center',
  },
  submitButton: {
    marginBottom: 40,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  entryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.charcoal,
    textTransform: 'capitalize',
  },
  entryMood: {
    fontSize: 28,
  },
  entryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  entryStat: {
    alignItems: 'center',
  },
  entryStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.teal,
  },
  entryStatLabel: {
    fontSize: 11,
    color: Colors.grisChaud,
    marginTop: 2,
  },
  entryNote: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    fontSize: 14,
    color: Colors.charcoal,
  },
});
