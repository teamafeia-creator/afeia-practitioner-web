import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { api } from '../services/api';

const STORAGE_KEY = '@anamnese_data';

// Types de questions
type QuestionType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'number' | 'date';

interface Question {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  placeholder?: string;
  required?: boolean;
  conditionalOn?: { questionId: string; value: string };
}

interface Section {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

// Définition des 12 sections du questionnaire
const SECTIONS: Section[] = [
  // 1. Informations générales
  {
    id: 'general',
    title: 'Informations générales',
    description: 'Ces informations nous aident à mieux vous connaître.',
    questions: [
      { id: 'nom', label: 'Nom', type: 'text', placeholder: 'Votre nom', required: true },
      { id: 'prenom', label: 'Prénom', type: 'text', placeholder: 'Votre prénom', required: true },
      { id: 'dateNaissance', label: 'Date de naissance', type: 'date', placeholder: 'JJ/MM/AAAA' },
      { id: 'profession', label: 'Profession', type: 'text', placeholder: 'Votre profession' },
      { id: 'situationFamiliale', label: 'Situation familiale', type: 'radio', options: ['Célibataire', 'En couple', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve'] },
      { id: 'nombreEnfants', label: 'Nombre d\'enfants', type: 'number', placeholder: '0' },
      { id: 'ville', label: 'Ville de résidence', type: 'text', placeholder: 'Votre ville' },
    ],
  },
  // 2. Profil personnel et émotionnel
  {
    id: 'profil',
    title: 'Profil personnel et émotionnel',
    description: 'Votre tempérament et vos tendances émotionnelles.',
    questions: [
      { id: 'temperament', label: 'Comment décririez-vous votre tempérament ?', type: 'radio', options: ['Calme', 'Anxieux', 'Dynamique', 'Introverti', 'Extraverti', 'Variable'] },
      { id: 'emotionsDominantes', label: 'Quelles émotions vous traversent le plus souvent ?', type: 'checkbox', options: ['Joie', 'Tristesse', 'Colère', 'Peur', 'Anxiété', 'Sérénité', 'Frustration'] },
      { id: 'gestionStress', label: 'Comment gérez-vous habituellement le stress ?', type: 'textarea', placeholder: 'Décrivez vos stratégies...' },
      { id: 'qualiteRelations', label: 'Comment évaluez-vous vos relations sociales ?', type: 'radio', options: ['Très satisfaisantes', 'Satisfaisantes', 'Moyennes', 'Difficiles', 'Très difficiles'] },
    ],
  },
  // 3. Motif de consultation
  {
    id: 'motif',
    title: 'Motif de consultation',
    description: 'Pourquoi consultez-vous un naturopathe ?',
    questions: [
      { id: 'motifPrincipal', label: 'Quel est le motif principal de votre consultation ?', type: 'textarea', placeholder: 'Décrivez votre problématique principale...', required: true },
      { id: 'depuis', label: 'Depuis quand ressentez-vous ces symptômes ?', type: 'text', placeholder: 'Ex: 6 mois, 2 ans...' },
      { id: 'objectifs', label: 'Quels sont vos objectifs avec cet accompagnement ?', type: 'checkbox', options: ['Améliorer mon énergie', 'Mieux dormir', 'Perdre du poids', 'Gérer mon stress', 'Améliorer ma digestion', 'Renforcer mon immunité', 'Équilibrer mes émotions', 'Autre'] },
      { id: 'attentes', label: 'Quelles sont vos attentes ?', type: 'textarea', placeholder: 'Ce que vous espérez de cet accompagnement...' },
      { id: 'antecedentsMedicaux', label: 'Antécédents médicaux importants', type: 'textarea', placeholder: 'Maladies, opérations, hospitalisations...' },
      { id: 'traitementActuel', label: 'Traitements médicaux en cours', type: 'textarea', placeholder: 'Médicaments, dosages...' },
    ],
  },
  // 4. Alimentation et hydratation
  {
    id: 'alimentation',
    title: 'Alimentation et hydratation',
    description: 'Vos habitudes alimentaires quotidiennes.',
    questions: [
      { id: 'regimeAlimentaire', label: 'Quel est votre régime alimentaire ?', type: 'radio', options: ['Omnivore', 'Végétarien', 'Végétalien', 'Flexitarien', 'Sans gluten', 'Autre'] },
      { id: 'petitDejeuner', label: 'Que prenez-vous habituellement au petit-déjeuner ?', type: 'textarea', placeholder: 'Décrivez un petit-déjeuner type...' },
      { id: 'dejeuner', label: 'Que prenez-vous habituellement au déjeuner ?', type: 'textarea', placeholder: 'Décrivez un déjeuner type...' },
      { id: 'diner', label: 'Que prenez-vous habituellement au dîner ?', type: 'textarea', placeholder: 'Décrivez un dîner type...' },
      { id: 'grignotage', label: 'Grignotez-vous entre les repas ?', type: 'radio', options: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Très souvent'] },
      { id: 'typeGrignotage', label: 'Si oui, que grignotez-vous ?', type: 'text', placeholder: 'Sucré, salé, fruits...' },
      { id: 'hydratation', label: 'Combien de litres d\'eau buvez-vous par jour ?', type: 'radio', options: ['Moins de 0.5L', '0.5L à 1L', '1L à 1.5L', '1.5L à 2L', 'Plus de 2L'] },
      { id: 'autresBoissons', label: 'Autres boissons consommées', type: 'checkbox', options: ['Café', 'Thé', 'Tisanes', 'Sodas', 'Jus de fruits', 'Alcool', 'Boissons énergisantes'] },
    ],
  },
  // 5. Digestion et transit
  {
    id: 'digestion',
    title: 'Digestion et transit',
    description: 'Votre confort digestif au quotidien.',
    questions: [
      { id: 'qualiteDigestion', label: 'Comment évaluez-vous votre digestion ?', type: 'radio', options: ['Excellente', 'Bonne', 'Moyenne', 'Difficile', 'Très difficile'] },
      { id: 'troublesDigestifs', label: 'Avez-vous des troubles digestifs ?', type: 'checkbox', options: ['Ballonnements', 'Gaz', 'Brûlures d\'estomac', 'Reflux', 'Nausées', 'Douleurs abdominales', 'Aucun'] },
      { id: 'frequenceTransit', label: 'À quelle fréquence allez-vous à la selle ?', type: 'radio', options: ['Plusieurs fois par jour', '1 fois par jour', '1 jour sur 2', 'Moins souvent', 'Irrégulier'] },
      { id: 'qualiteTransit', label: 'Qualité de votre transit', type: 'radio', options: ['Normal', 'Tendance constipation', 'Tendance diarrhée', 'Alternance des deux'] },
      { id: 'intolerances', label: 'Avez-vous des intolérances alimentaires connues ?', type: 'checkbox', options: ['Lactose', 'Gluten', 'Œufs', 'Fruits de mer', 'Arachides', 'Soja', 'Aucune', 'Autre'] },
      { id: 'intolerancesAutre', label: 'Si autre, précisez', type: 'text', placeholder: 'Autres intolérances...' },
    ],
  },
  // 6. Sommeil et énergie
  {
    id: 'sommeil',
    title: 'Sommeil et énergie',
    description: 'La qualité de votre repos et votre vitalité.',
    questions: [
      { id: 'heuresCoucher', label: 'À quelle heure vous couchez-vous généralement ?', type: 'text', placeholder: 'Ex: 22h30' },
      { id: 'heuresLever', label: 'À quelle heure vous levez-vous ?', type: 'text', placeholder: 'Ex: 7h00' },
      { id: 'qualiteSommeil', label: 'Comment évaluez-vous la qualité de votre sommeil ?', type: 'radio', options: ['Excellente', 'Bonne', 'Moyenne', 'Mauvaise', 'Très mauvaise'] },
      { id: 'troublesSommeil', label: 'Avez-vous des troubles du sommeil ?', type: 'checkbox', options: ['Difficultés d\'endormissement', 'Réveils nocturnes', 'Réveil trop tôt', 'Sommeil non réparateur', 'Ronflements', 'Apnée du sommeil', 'Aucun'] },
      { id: 'energieMatin', label: 'Comment est votre énergie au réveil ?', type: 'radio', options: ['Très bonne', 'Bonne', 'Moyenne', 'Faible', 'Très faible'] },
      { id: 'coupFatigue', label: 'Avez-vous des coups de fatigue dans la journée ?', type: 'radio', options: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Très souvent'] },
      { id: 'momentFatigue', label: 'Si oui, à quel moment ?', type: 'checkbox', options: ['Matin', 'Fin de matinée', 'Après le déjeuner', 'Fin d\'après-midi', 'Soirée'] },
    ],
  },
  // 7. Activité physique et posture
  {
    id: 'activite',
    title: 'Activité physique et posture',
    description: 'Votre niveau d\'activité et votre rapport au corps.',
    questions: [
      { id: 'activitePhysique', label: 'Pratiquez-vous une activité physique régulière ?', type: 'radio', options: ['Oui, quotidiennement', 'Oui, plusieurs fois par semaine', 'Oui, 1 fois par semaine', 'Occasionnellement', 'Non'] },
      { id: 'typeActivite', label: 'Quel type d\'activité ?', type: 'checkbox', options: ['Marche', 'Course', 'Vélo', 'Natation', 'Yoga/Pilates', 'Musculation', 'Sports collectifs', 'Danse', 'Autre'] },
      { id: 'dureeActivite', label: 'Durée moyenne par séance', type: 'radio', options: ['Moins de 30 min', '30 min à 1h', '1h à 1h30', 'Plus de 1h30'] },
      { id: 'travailSedentaire', label: 'Votre travail est-il sédentaire ?', type: 'radio', options: ['Oui, assis(e) toute la journée', 'Plutôt oui', 'Mixte', 'Plutôt non', 'Non, très actif'] },
      { id: 'douleurs', label: 'Avez-vous des douleurs physiques ?', type: 'checkbox', options: ['Dos', 'Nuque/cervicales', 'Épaules', 'Genoux', 'Hanches', 'Tête (migraines)', 'Articulations', 'Aucune'] },
      { id: 'douleursDetails', label: 'Précisions sur vos douleurs', type: 'textarea', placeholder: 'Localisation, fréquence, intensité...' },
    ],
  },
  // 8. Stress, émotions et équilibre intérieur
  {
    id: 'stress',
    title: 'Stress, émotions et équilibre intérieur',
    description: 'Votre gestion du stress et votre bien-être mental.',
    questions: [
      { id: 'niveauStress', label: 'Comment évaluez-vous votre niveau de stress actuel ?', type: 'radio', options: ['Très faible', 'Faible', 'Modéré', 'Élevé', 'Très élevé'] },
      { id: 'sourcesStress', label: 'Quelles sont vos principales sources de stress ?', type: 'checkbox', options: ['Travail', 'Famille', 'Finances', 'Santé', 'Relations', 'Avenir', 'Autre'] },
      { id: 'manifestationsStress', label: 'Comment le stress se manifeste-t-il chez vous ?', type: 'checkbox', options: ['Tensions musculaires', 'Maux de tête', 'Troubles digestifs', 'Irritabilité', 'Troubles du sommeil', 'Fatigue', 'Anxiété', 'Autre'] },
      { id: 'activitesDetente', label: 'Quelles activités vous aident à vous détendre ?', type: 'checkbox', options: ['Méditation', 'Lecture', 'Musique', 'Nature', 'Sport', 'Art', 'Socialiser', 'Autre'] },
      { id: 'accompagnementPsy', label: 'Suivez-vous un accompagnement psychologique ?', type: 'radio', options: ['Oui, actuellement', 'Oui, par le passé', 'Non'] },
    ],
  },
  // 9. Élimination et peau
  {
    id: 'elimination',
    title: 'Élimination et peau',
    description: 'Votre système d\'élimination et l\'état de votre peau.',
    questions: [
      { id: 'typePeau', label: 'Quel est votre type de peau ?', type: 'radio', options: ['Normale', 'Sèche', 'Grasse', 'Mixte', 'Sensible'] },
      { id: 'problemesPeau', label: 'Avez-vous des problèmes de peau ?', type: 'checkbox', options: ['Acné', 'Eczéma', 'Psoriasis', 'Rosacée', 'Sécheresse', 'Démangeaisons', 'Aucun'] },
      { id: 'transpiration', label: 'Transpirez-vous facilement ?', type: 'radio', options: ['Très peu', 'Peu', 'Normalement', 'Beaucoup', 'Excessivement'] },
      { id: 'odeurTranspiration', label: 'Votre transpiration a-t-elle une odeur forte ?', type: 'radio', options: ['Non', 'Légèrement', 'Oui'] },
      { id: 'urines', label: 'Couleur habituelle de vos urines', type: 'radio', options: ['Claire (bien hydraté)', 'Jaune pâle', 'Jaune foncé', 'Foncée'] },
      { id: 'frequenceUrines', label: 'Fréquence des mictions par jour', type: 'radio', options: ['Moins de 4 fois', '4-6 fois', '6-8 fois', 'Plus de 8 fois'] },
    ],
  },
  // 10. Questions spécifiques (femmes/hommes)
  {
    id: 'specifique',
    title: 'Questions spécifiques',
    description: 'Questions adaptées à votre profil.',
    questions: [
      { id: 'sexe', label: 'Vous êtes', type: 'radio', options: ['Une femme', 'Un homme', 'Autre/Ne souhaite pas répondre'], required: true },
      // Questions femmes
      { id: 'cycleRegulier', label: '(Femmes) Vos cycles sont-ils réguliers ?', type: 'radio', options: ['Oui', 'Non', 'Ménopausée', 'Non concernée'], conditionalOn: { questionId: 'sexe', value: 'Une femme' } },
      { id: 'douleursMenstruelles', label: '(Femmes) Avez-vous des douleurs menstruelles ?', type: 'radio', options: ['Non', 'Légères', 'Modérées', 'Importantes', 'Non concernée'], conditionalOn: { questionId: 'sexe', value: 'Une femme' } },
      { id: 'spmSymptomes', label: '(Femmes) Symptômes prémenstruels ?', type: 'checkbox', options: ['Irritabilité', 'Fatigue', 'Ballonnements', 'Maux de tête', 'Seins douloureux', 'Fringales', 'Aucun'], conditionalOn: { questionId: 'sexe', value: 'Une femme' } },
      { id: 'grossesses', label: '(Femmes) Nombre de grossesses', type: 'number', placeholder: '0', conditionalOn: { questionId: 'sexe', value: 'Une femme' } },
      { id: 'contraception', label: '(Femmes) Méthode de contraception', type: 'radio', options: ['Pilule', 'Stérilet hormonal', 'Stérilet cuivre', 'Préservatif', 'Naturelle', 'Aucune', 'Non concernée'], conditionalOn: { questionId: 'sexe', value: 'Une femme' } },
      // Questions hommes
      { id: 'problemesProstate', label: '(Hommes) Problèmes de prostate ?', type: 'radio', options: ['Non', 'Oui, légers', 'Oui, importants', 'Non concerné'], conditionalOn: { questionId: 'sexe', value: 'Un homme' } },
      { id: 'libido', label: 'Comment évaluez-vous votre libido ?', type: 'radio', options: ['Normale', 'Faible', 'Très faible', 'Élevée'] },
    ],
  },
  // 11. Mode de vie global
  {
    id: 'modeVie',
    title: 'Mode de vie global',
    description: 'Vos habitudes quotidiennes et votre environnement.',
    questions: [
      { id: 'tabac', label: 'Fumez-vous ?', type: 'radio', options: ['Non, jamais', 'Non, j\'ai arrêté', 'Occasionnellement', 'Oui, quotidiennement'] },
      { id: 'tabacQuantite', label: 'Si oui, combien par jour ?', type: 'text', placeholder: 'Nombre de cigarettes...' },
      { id: 'alcool', label: 'Consommez-vous de l\'alcool ?', type: 'radio', options: ['Jamais', 'Rarement', 'Occasionnellement', 'Régulièrement', 'Quotidiennement'] },
      { id: 'cannabis', label: 'Consommez-vous du cannabis ou autres substances ?', type: 'radio', options: ['Non', 'Occasionnellement', 'Régulièrement'] },
      { id: 'ecrans', label: 'Temps d\'écran quotidien (hors travail)', type: 'radio', options: ['Moins de 1h', '1-2h', '2-4h', '4-6h', 'Plus de 6h'] },
      { id: 'exposition', label: 'Êtes-vous exposé(e) à des polluants ?', type: 'checkbox', options: ['Pollution urbaine', 'Produits chimiques (travail)', 'Pesticides', 'Ondes électromagnétiques', 'Non particulièrement'] },
      { id: 'natureSortie', label: 'À quelle fréquence sortez-vous dans la nature ?', type: 'radio', options: ['Quotidiennement', 'Plusieurs fois par semaine', 'Une fois par semaine', 'Rarement', 'Jamais'] },
      { id: 'complementsActuels', label: 'Prenez-vous des compléments alimentaires ?', type: 'textarea', placeholder: 'Si oui, lesquels...' },
    ],
  },
  // 12. Question ouverte
  {
    id: 'ouvert',
    title: 'Question ouverte',
    description: 'Exprimez-vous librement.',
    questions: [
      { id: 'informationsSupplementaires', label: 'Y a-t-il autre chose que vous souhaitez partager ?', type: 'textarea', placeholder: 'Tout ce qui vous semble important pour votre accompagnement...' },
      { id: 'commentConnu', label: 'Comment avez-vous connu AFEIA ?', type: 'radio', options: ['Recommandation', 'Internet', 'Réseaux sociaux', 'Mon médecin', 'Autre'] },
      { id: 'engagementSuivi', label: 'Êtes-vous prêt(e) à vous engager dans un suivi naturopathique ?', type: 'radio', options: ['Oui, totalement', 'Oui, mais j\'ai des réserves', 'Je ne suis pas sûr(e)', 'J\'ai besoin d\'en savoir plus'] },
    ],
  },
];

interface AnamneseScreenProps {
  onComplete: () => void;
}

export default function AnamneseScreen({ onComplete }: AnamneseScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const currentSection = SECTIONS[currentStep];
  const totalSteps = SECTIONS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Charger les données sauvegardées au démarrage
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setAnswers(parsed.answers || {});
        setCurrentStep(parsed.currentStep || 0);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  // Sauvegarder à chaque changement
  const saveData = async (newAnswers: Record<string, any>, step: number) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ answers: newAnswers, currentStep: step })
      );
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  };

  const handleAnswer = (questionId: string, value: any) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    saveData(newAnswers, currentStep);
  };

  const handleCheckboxToggle = (questionId: string, option: string) => {
    const currentValues = answers[questionId] || [];
    let newValues: string[];

    if (currentValues.includes(option)) {
      newValues = currentValues.filter((v: string) => v !== option);
    } else {
      newValues = [...currentValues, option];
    }

    handleAnswer(questionId, newValues);
  };

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      saveData(answers, newStep);
    }
  };

  const goPrevious = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      saveData(answers, newStep);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.submitAnamnese(answers);
      await AsyncStorage.removeItem(STORAGE_KEY);
      Alert.alert(
        'Questionnaire envoyé',
        'Merci d\'avoir complété votre anamnèse. Votre naturopathe va l\'analyser.',
        [{ text: 'OK', onPress: onComplete }]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le questionnaire. Vos réponses sont sauvegardées.');
    } finally {
      setLoading(false);
    }
  };

  // Vérifie si une question doit être affichée (conditions)
  const shouldShowQuestion = (question: Question): boolean => {
    if (!question.conditionalOn) return true;
    const { questionId, value } = question.conditionalOn;
    return answers[questionId] === value;
  };

  const renderQuestion = (question: Question) => {
    if (!shouldShowQuestion(question)) return null;

    return (
      <View key={question.id} style={styles.questionContainer}>
        <Text style={styles.questionLabel}>
          {question.label}
          {question.required && <Text style={styles.required}> *</Text>}
        </Text>

        {question.type === 'text' && (
          <TextInput
            style={styles.input}
            value={answers[question.id] || ''}
            onChangeText={(text) => handleAnswer(question.id, text)}
            placeholder={question.placeholder}
            placeholderTextColor="#999"
          />
        )}

        {question.type === 'textarea' && (
          <TextInput
            style={[styles.input, styles.textarea]}
            value={answers[question.id] || ''}
            onChangeText={(text) => handleAnswer(question.id, text)}
            placeholder={question.placeholder}
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        )}

        {question.type === 'number' && (
          <TextInput
            style={styles.input}
            value={answers[question.id]?.toString() || ''}
            onChangeText={(text) => handleAnswer(question.id, text.replace(/[^0-9]/g, ''))}
            placeholder={question.placeholder}
            placeholderTextColor="#999"
            keyboardType="number-pad"
          />
        )}

        {question.type === 'date' && (
          <TextInput
            style={styles.input}
            value={answers[question.id] || ''}
            onChangeText={(text) => handleAnswer(question.id, text)}
            placeholder={question.placeholder}
            placeholderTextColor="#999"
            keyboardType="number-pad"
          />
        )}

        {question.type === 'radio' && question.options && (
          <View style={styles.optionsContainer}>
            {question.options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.radioOption,
                  answers[question.id] === option && styles.radioOptionSelected,
                ]}
                onPress={() => handleAnswer(question.id, option)}
              >
                <View style={styles.radioCircle}>
                  {answers[question.id] === option && (
                    <View style={styles.radioCircleInner} />
                  )}
                </View>
                <Text style={[
                  styles.optionText,
                  answers[question.id] === option && styles.optionTextSelected,
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {question.type === 'checkbox' && question.options && (
          <View style={styles.optionsContainer}>
            {question.options.map((option) => {
              const isSelected = (answers[question.id] || []).includes(option);
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.checkboxOption,
                    isSelected && styles.checkboxOptionSelected,
                  ]}
                  onPress={() => handleCheckboxToggle(question.id, option)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header avec progression */}
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>
          {currentStep + 1} / {totalSteps}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Contenu de la section */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>{currentSection.title}</Text>
        {currentSection.description && (
          <Text style={styles.sectionDescription}>{currentSection.description}</Text>
        )}

        {currentSection.questions.map(renderQuestion)}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonSecondary, currentStep === 0 && styles.navButtonDisabled]}
          onPress={goPrevious}
          disabled={currentStep === 0}
        >
          <Text style={[styles.navButtonText, styles.navButtonTextSecondary]}>Précédent</Text>
        </TouchableOpacity>

        {currentStep < totalSteps - 1 ? (
          <TouchableOpacity style={styles.navButton} onPress={goNext}>
            <Text style={styles.navButtonText}>Suivant</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, styles.submitButton, loading && styles.navButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.navButtonText}>
              {loading ? 'Envoi...' : 'Envoyer'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sable,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.sable,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.charcoal,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  stepIndicator: {
    fontSize: 14,
    color: Colors.teal,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.blanc,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.teal,
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.teal,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.charcoal,
    marginBottom: 20,
    opacity: 0.8,
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.charcoal,
    marginBottom: 10,
  },
  required: {
    color: Colors.dore,
  },
  input: {
    backgroundColor: Colors.blanc,
    borderWidth: 1,
    borderColor: Colors.teal,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.charcoal,
  },
  textarea: {
    minHeight: 100,
  },
  optionsContainer: {
    gap: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blanc,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  radioOptionSelected: {
    borderColor: Colors.teal,
    backgroundColor: 'rgba(42, 128, 128, 0.05)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.teal,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.teal,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blanc,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  checkboxOptionSelected: {
    borderColor: Colors.teal,
    backgroundColor: 'rgba(42, 128, 128, 0.05)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.teal,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.teal,
  },
  checkmark: {
    color: Colors.blanc,
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionText: {
    fontSize: 15,
    color: Colors.charcoal,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '500',
  },
  navigation: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: Colors.sable,
  },
  navButton: {
    flex: 1,
    backgroundColor: Colors.dore,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  navButtonSecondary: {
    backgroundColor: Colors.blanc,
    borderWidth: 1,
    borderColor: Colors.teal,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.blanc,
  },
  navButtonTextSecondary: {
    color: Colors.teal,
  },
  submitButton: {
    backgroundColor: Colors.teal,
  },
});
