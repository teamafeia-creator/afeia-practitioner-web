import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Card, LoadingSpinner } from '../../components/ui';
import { ProgressBar, SectionWrapper } from '../../components/anamnese';
import { anamneseService } from '../../services/api/anamnese';
import { Colors } from '../../constants/Colors';
import { Config } from '../../constants/Config';

const TOTAL_SECTIONS = Config.ANAMNESE_TOTAL_SECTIONS;

// Définition des sections
const SECTIONS = [
  {
    id: 1,
    title: 'Informations générales',
    description: 'Commençons par faire connaissance',
  },
  {
    id: 2,
    title: 'Profil personnel et émotionnel',
    description: 'Parlez-nous de vous',
  },
  {
    id: 3,
    title: 'Motif de consultation',
    description: 'Pourquoi consultez-vous ?',
  },
  {
    id: 4,
    title: 'Alimentation et hydratation',
    description: 'Vos habitudes alimentaires',
  },
  {
    id: 5,
    title: 'Digestion et transit',
    description: 'Comment fonctionne votre système digestif',
  },
  {
    id: 6,
    title: 'Sommeil et énergie',
    description: 'Votre qualité de sommeil et vitalité',
  },
  {
    id: 7,
    title: 'Activité physique et posture',
    description: 'Votre rapport au mouvement',
  },
  {
    id: 8,
    title: 'Stress et émotions',
    description: 'Votre équilibre intérieur',
  },
  {
    id: 9,
    title: 'Élimination et peau',
    description: 'Signes extérieurs de santé',
  },
  {
    id: 10,
    title: 'Questions spécifiques',
    description: 'Selon votre profil',
  },
  {
    id: 11,
    title: 'Mode de vie global',
    description: 'Vos habitudes au quotidien',
  },
  {
    id: 12,
    title: 'Question ouverte',
    description: 'Ajoutez ce qui vous semble important',
  },
];

export default function AnamneseScreen() {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [`section${currentSection}`]: {
        ...prev[`section${currentSection}`],
        [field]: value,
      },
    }));
  };

  const getValue = (field: string) => {
    return formData[`section${currentSection}`]?.[field] || '';
  };

  const handleNext = async () => {
    if (currentSection < TOTAL_SECTIONS) {
      // Sauvegarder la section actuelle
      try {
        setIsLoading(true);
        await anamneseService.saveSection(
          currentSection,
          formData[`section${currentSection}`] || {}
        );
        setCurrentSection(prev => prev + 1);
      } catch (error) {
        console.log('⚠️ Anamnese: Could not save section, continuing anyway');
        setCurrentSection(prev => prev + 1);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Soumettre le questionnaire complet
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentSection > 1) {
      setCurrentSection(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      console.log('✅ Anamnese: Submitting questionnaire');

      await anamneseService.submit(formData as any);

      Alert.alert(
        'Questionnaire terminé',
        'Merci d\'avoir rempli le questionnaire. Votre naturopathe va pouvoir l\'analyser.',
        [
          {
            text: 'Continuer',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Anamnese: Submit failed', error);
      Alert.alert('Erreur', 'Erreur lors de l\'envoi du questionnaire');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSection = () => {
    switch (currentSection) {
      case 1:
        return renderSection1();
      case 2:
        return renderSection2();
      case 3:
        return renderSection3();
      case 4:
        return renderSection4();
      case 5:
        return renderSection5();
      case 6:
        return renderSection6();
      case 7:
        return renderSection7();
      case 8:
        return renderSection8();
      case 9:
        return renderSection9();
      case 10:
        return renderSection10();
      case 11:
        return renderSection11();
      case 12:
        return renderSection12();
      default:
        return null;
    }
  };

  // Section 1: Informations générales
  const renderSection1 = () => (
    <SectionWrapper
      title={SECTIONS[0].title}
      description={SECTIONS[0].description}
    >
      <Input
        label="Prénom"
        value={getValue('firstName')}
        onChangeText={v => handleChange('firstName', v)}
        placeholder="Votre prénom"
      />
      <Input
        label="Nom"
        value={getValue('lastName')}
        onChangeText={v => handleChange('lastName', v)}
        placeholder="Votre nom"
      />
      <Input
        label="Âge"
        value={getValue('age')}
        onChangeText={v => handleChange('age', v)}
        keyboardType="numeric"
        placeholder="Votre âge"
      />
      <Input
        label="Profession"
        value={getValue('profession')}
        onChangeText={v => handleChange('profession', v)}
        placeholder="Votre profession"
      />
      <Input
        label="Situation familiale"
        value={getValue('familySituation')}
        onChangeText={v => handleChange('familySituation', v)}
        placeholder="Ex: Marié(e), 2 enfants"
      />
      <View style={styles.rowInputs}>
        <Input
          label="Poids (kg)"
          value={getValue('weight')}
          onChangeText={v => handleChange('weight', v)}
          keyboardType="numeric"
          containerStyle={styles.halfInput}
          placeholder="70"
        />
        <Input
          label="Taille (cm)"
          value={getValue('height')}
          onChangeText={v => handleChange('height', v)}
          keyboardType="numeric"
          containerStyle={styles.halfInput}
          placeholder="170"
        />
      </View>
      <Input
        label="Médecin traitant"
        value={getValue('doctor')}
        onChangeText={v => handleChange('doctor', v)}
        placeholder="Nom de votre médecin"
      />
      <Input
        label="Traitements en cours"
        value={getValue('currentTreatments')}
        onChangeText={v => handleChange('currentTreatments', v)}
        placeholder="Médicaments, compléments..."
        multiline
        numberOfLines={3}
      />
      <Input
        label="Allergies connues"
        value={getValue('allergies')}
        onChangeText={v => handleChange('allergies', v)}
        placeholder="Alimentaires, médicamenteuses..."
        multiline
        numberOfLines={2}
      />
    </SectionWrapper>
  );

  // Section 2: Profil personnel et émotionnel
  const renderSection2 = () => (
    <SectionWrapper
      title={SECTIONS[1].title}
      description={SECTIONS[1].description}
    >
      <SelectOption
        label="Vous vous décrivez comme..."
        value={getValue('personality')}
        onChange={v => handleChange('personality', v)}
        options={[
          { value: 'introvert', label: 'Plutôt introverti(e)' },
          { value: 'extrovert', label: 'Plutôt extraverti(e)' },
          { value: 'ambivert', label: 'Un peu des deux' },
        ]}
      />
      <Input
        label="Comment décririez-vous votre tempérament ?"
        value={getValue('temperament')}
        onChangeText={v => handleChange('temperament', v)}
        placeholder="Calme, nerveux, réactif..."
        multiline
        numberOfLines={2}
      />
      <SliderOption
        label="Niveau d'anxiété général (1 = très calme, 10 = très anxieux)"
        value={getValue('anxietyLevel') || 5}
        onChange={v => handleChange('anxietyLevel', v)}
        min={1}
        max={10}
      />
    </SectionWrapper>
  );

  // Section 3: Motif de consultation
  const renderSection3 = () => (
    <SectionWrapper
      title={SECTIONS[2].title}
      description={SECTIONS[2].description}
    >
      <Input
        label="Pourquoi consultez-vous ?"
        value={getValue('reasonForConsultation')}
        onChangeText={v => handleChange('reasonForConsultation', v)}
        placeholder="Décrivez vos motifs principaux..."
        multiline
        numberOfLines={4}
      />
      <Input
        label="Qu'aimeriez-vous améliorer ?"
        value={getValue('wantToImprove')}
        onChangeText={v => handleChange('wantToImprove', v)}
        placeholder="Énergie, sommeil, digestion..."
        multiline
        numberOfLines={3}
      />
      <Input
        label="Depuis quand ressentez-vous ces symptômes ?"
        value={getValue('symptomsDuration')}
        onChangeText={v => handleChange('symptomsDuration', v)}
        placeholder="Quelques jours, mois, années..."
      />
      <Input
        label="Y a-t-il des périodes où c'est pire/mieux ?"
        value={getValue('symptomsPeriods')}
        onChangeText={v => handleChange('symptomsPeriods', v)}
        placeholder="Saisons, stress, alimentation..."
        multiline
        numberOfLines={2}
      />
    </SectionWrapper>
  );

  // Section 4: Alimentation et hydratation
  const renderSection4 = () => (
    <SectionWrapper
      title={SECTIONS[3].title}
      description={SECTIONS[3].description}
    >
      <Input
        label="Décrivez vos habitudes alimentaires"
        value={getValue('eatingHabits')}
        onChangeText={v => handleChange('eatingHabits', v)}
        placeholder="Régulier, grignotage, repas sautés..."
        multiline
        numberOfLines={3}
      />
      <Input
        label="Nombre de repas par jour"
        value={getValue('mealsPerDay')}
        onChangeText={v => handleChange('mealsPerDay', v)}
        keyboardType="numeric"
        placeholder="Ex: 3"
      />
      <SelectOption
        label="Prenez-vous un petit-déjeuner ?"
        value={getValue('hasBreakfast')}
        onChange={v => handleChange('hasBreakfast', v)}
        options={[
          { value: 'yes', label: 'Oui, tous les jours' },
          { value: 'sometimes', label: 'Parfois' },
          { value: 'rarely', label: 'Rarement' },
          { value: 'never', label: 'Jamais' },
        ]}
      />
      <Input
        label="Types d'aliments consommés fréquemment"
        value={getValue('foodTypes')}
        onChangeText={v => handleChange('foodTypes', v)}
        placeholder="Viande, légumes, féculents, sucre..."
        multiline
        numberOfLines={3}
      />
      <Input
        label="Boissons consommées (eau, café, thé, sodas...)"
        value={getValue('beverages')}
        onChangeText={v => handleChange('beverages', v)}
        placeholder="Quantité et type de boissons"
        multiline
        numberOfLines={2}
      />
      <Input
        label="Avez-vous des envies particulières ?"
        value={getValue('cravings')}
        onChangeText={v => handleChange('cravings', v)}
        placeholder="Sucré, salé, gras..."
      />
    </SectionWrapper>
  );

  // Section 5: Digestion et transit
  const renderSection5 = () => (
    <SectionWrapper
      title={SECTIONS[4].title}
      description={SECTIONS[4].description}
    >
      <Input
        label="Comment décririez-vous votre digestion ?"
        value={getValue('digestionQuality')}
        onChangeText={v => handleChange('digestionQuality', v)}
        placeholder="Facile, lente, ballonnements..."
        multiline
        numberOfLines={3}
      />
      <Input
        label="Fréquence des selles"
        value={getValue('bowelFrequency')}
        onChangeText={v => handleChange('bowelFrequency', v)}
        placeholder="1x/jour, irrégulier, constipation..."
      />
      <Input
        label="Variations ou problèmes digestifs ?"
        value={getValue('digestiveVariations')}
        onChangeText={v => handleChange('digestiveVariations', v)}
        placeholder="Brûlures, reflux, gaz..."
        multiline
        numberOfLines={3}
      />
    </SectionWrapper>
  );

  // Section 6: Sommeil et énergie
  const renderSection6 = () => (
    <SectionWrapper
      title={SECTIONS[5].title}
      description={SECTIONS[5].description}
    >
      <Input
        label="Heure de coucher habituelle"
        value={getValue('bedtime')}
        onChangeText={v => handleChange('bedtime', v)}
        placeholder="Ex: 23h00"
      />
      <Input
        label="Heure de réveil habituelle"
        value={getValue('wakeTime')}
        onChangeText={v => handleChange('wakeTime', v)}
        placeholder="Ex: 7h00"
      />
      <SliderOption
        label="Qualité du sommeil (1 = très mauvais, 10 = excellent)"
        value={getValue('sleepQuality') || 5}
        onChange={v => handleChange('sleepQuality', v)}
        min={1}
        max={10}
      />
      <SelectOption
        label="Vous réveillez-vous la nuit ?"
        value={getValue('nightWakeups')}
        onChange={v => handleChange('nightWakeups', v)}
        options={[
          { value: 'never', label: 'Jamais' },
          { value: 'sometimes', label: 'Parfois' },
          { value: 'often', label: 'Souvent' },
          { value: 'always', label: 'Toutes les nuits' },
        ]}
      />
      <Input
        label="Avez-vous des coups de fatigue ? Quand ?"
        value={getValue('energyDips')}
        onChangeText={v => handleChange('energyDips', v)}
        placeholder="Matin, après-midi, après les repas..."
        multiline
        numberOfLines={2}
      />
    </SectionWrapper>
  );

  // Section 7: Activité physique et posture
  const renderSection7 = () => (
    <SectionWrapper
      title={SECTIONS[6].title}
      description={SECTIONS[6].description}
    >
      <SelectOption
        label="Pratiquez-vous une activité physique régulière ?"
        value={getValue('regularActivity')}
        onChange={v => handleChange('regularActivity', v)}
        options={[
          { value: 'yes', label: 'Oui' },
          { value: 'sometimes', label: 'De temps en temps' },
          { value: 'no', label: 'Non' },
        ]}
      />
      <Input
        label="Type d'activité"
        value={getValue('activityType')}
        onChangeText={v => handleChange('activityType', v)}
        placeholder="Marche, natation, yoga..."
      />
      <Input
        label="Fréquence"
        value={getValue('activityFrequency')}
        onChangeText={v => handleChange('activityFrequency', v)}
        placeholder="Ex: 2-3 fois par semaine"
      />
      <Input
        label="Douleurs ou tensions corporelles ?"
        value={getValue('bodyPains')}
        onChangeText={v => handleChange('bodyPains', v)}
        placeholder="Dos, nuque, articulations..."
        multiline
        numberOfLines={3}
      />
    </SectionWrapper>
  );

  // Section 8: Stress, émotions et équilibre intérieur
  const renderSection8 = () => (
    <SectionWrapper
      title={SECTIONS[7].title}
      description={SECTIONS[7].description}
    >
      <SliderOption
        label="Niveau de stress (1 = très calme, 10 = très stressé)"
        value={getValue('stressLevel') || 5}
        onChange={v => handleChange('stressLevel', v)}
        min={1}
        max={10}
      />
      <Input
        label="Où ressentez-vous les tensions ?"
        value={getValue('bodyTensions')}
        onChangeText={v => handleChange('bodyTensions', v)}
        placeholder="Nuque, épaules, ventre..."
      />
      <Input
        label="Comment vous détendez-vous ?"
        value={getValue('relaxationMethods')}
        onChangeText={v => handleChange('relaxationMethods', v)}
        placeholder="Lecture, sport, méditation..."
        multiline
        numberOfLines={2}
      />
      <SelectOption
        label="Avez-vous tendance à intérioriser vos émotions ?"
        value={getValue('emotionInternalization')}
        onChange={v => handleChange('emotionInternalization', v)}
        options={[
          { value: 'yes', label: 'Oui, beaucoup' },
          { value: 'sometimes', label: 'Parfois' },
          { value: 'no', label: 'Non, j\'exprime facilement' },
        ]}
      />
      <Input
        label="Comment décririez-vous votre humeur générale ?"
        value={getValue('generalMood')}
        onChangeText={v => handleChange('generalMood', v)}
        placeholder="Stable, changeante, plutôt positive..."
      />
    </SectionWrapper>
  );

  // Section 9: Élimination et peau
  const renderSection9 = () => (
    <SectionWrapper
      title={SECTIONS[8].title}
      description={SECTIONS[8].description}
    >
      <Input
        label="Transpiration"
        value={getValue('perspiration')}
        onChangeText={v => handleChange('perspiration', v)}
        placeholder="Normale, excessive, peu..."
      />
      <SelectOption
        label="Type de peau"
        value={getValue('skinType')}
        onChange={v => handleChange('skinType', v)}
        options={[
          { value: 'normal', label: 'Normale' },
          { value: 'dry', label: 'Sèche' },
          { value: 'oily', label: 'Grasse' },
          { value: 'combination', label: 'Mixte' },
          { value: 'sensitive', label: 'Sensible' },
        ]}
      />
      <Input
        label="Problèmes de peau (boutons, eczéma, etc.)"
        value={getValue('skinIssues')}
        onChangeText={v => handleChange('skinIssues', v)}
        placeholder="Décrivez vos problèmes éventuels"
        multiline
        numberOfLines={2}
      />
      <Input
        label="Couleur et aspect des urines"
        value={getValue('urineColor')}
        onChangeText={v => handleChange('urineColor', v)}
        placeholder="Claire, foncée, fréquence..."
      />
    </SectionWrapper>
  );

  // Section 10: Questions spécifiques (homme/femme)
  const renderSection10 = () => {
    const gender = formData.section1?.gender || 'female';

    return (
      <SectionWrapper
        title={SECTIONS[9].title}
        description={SECTIONS[9].description}
      >
        <SelectOption
          label="Vous êtes..."
          value={getValue('gender')}
          onChange={v => handleChange('gender', v)}
          options={[
            { value: 'female', label: 'Une femme' },
            { value: 'male', label: 'Un homme' },
          ]}
        />

        {getValue('gender') === 'male' ? (
          <>
            <SliderOption
              label="Niveau d'énergie général"
              value={getValue('energyLevel') || 5}
              onChange={v => handleChange('energyLevel', v)}
              min={1}
              max={10}
            />
            <Input
              label="Tensions bas-ventre ou dos ?"
              value={getValue('lowerBodyTensions')}
              onChangeText={v => handleChange('lowerBodyTensions', v)}
              placeholder="Décrivez..."
              multiline
              numberOfLines={2}
            />
            <Input
              label="Qualité de récupération après le sommeil"
              value={getValue('sleepRecovery')}
              onChangeText={v => handleChange('sleepRecovery', v)}
              placeholder="Bonne, moyenne, difficile..."
            />
          </>
        ) : (
          <>
            <SelectOption
              label="Cycles réguliers ?"
              value={getValue('regularCycles')}
              onChange={v => handleChange('regularCycles', v)}
              options={[
                { value: 'yes', label: 'Oui' },
                { value: 'no', label: 'Non' },
                { value: 'menopause', label: 'Ménopause' },
              ]}
            />
            <Input
              label="Durée moyenne des cycles (jours)"
              value={getValue('cycleDuration')}
              onChangeText={v => handleChange('cycleDuration', v)}
              keyboardType="numeric"
              placeholder="Ex: 28"
            />
            <SelectOption
              label="Douleurs menstruelles ?"
              value={getValue('menstrualPain')}
              onChange={v => handleChange('menstrualPain', v)}
              options={[
                { value: 'no', label: 'Non' },
                { value: 'light', label: 'Légères' },
                { value: 'moderate', label: 'Modérées' },
                { value: 'severe', label: 'Fortes' },
              ]}
            />
            <Input
              label="Changements avant les règles (SPM)"
              value={getValue('premenstrualChanges')}
              onChangeText={v => handleChange('premenstrualChanges', v)}
              placeholder="Humeur, fatigue, ballonnements..."
              multiline
              numberOfLines={2}
            />
            <Input
              label="Contraception utilisée"
              value={getValue('contraception')}
              onChangeText={v => handleChange('contraception', v)}
              placeholder="Pilule, stérilet, naturelle..."
            />
          </>
        )}
      </SectionWrapper>
    );
  };

  // Section 11: Mode de vie global
  const renderSection11 = () => (
    <SectionWrapper
      title={SECTIONS[10].title}
      description={SECTIONS[10].description}
    >
      <Input
        label="Consommation d'eau par jour (litres)"
        value={getValue('dailyWaterIntake')}
        onChangeText={v => handleChange('dailyWaterIntake', v)}
        keyboardType="numeric"
        placeholder="Ex: 1.5"
      />
      <SelectOption
        label="Consommation de tabac"
        value={getValue('smokingStatus')}
        onChange={v => handleChange('smokingStatus', v)}
        options={[
          { value: 'no', label: 'Non-fumeur' },
          { value: 'former', label: 'Ancien fumeur' },
          { value: 'occasional', label: 'Occasionnel' },
          { value: 'regular', label: 'Quotidien' },
        ]}
      />
      <SelectOption
        label="Consommation d'alcool"
        value={getValue('alcoholConsumption')}
        onChange={v => handleChange('alcoholConsumption', v)}
        options={[
          { value: 'never', label: 'Jamais' },
          { value: 'occasional', label: 'Occasionnel' },
          { value: 'moderate', label: 'Modéré (1-2/semaine)' },
          { value: 'regular', label: 'Régulier' },
        ]}
      />
      <Input
        label="Temps passé dans la nature"
        value={getValue('natureExposure')}
        onChangeText={v => handleChange('natureExposure', v)}
        placeholder="Tous les jours, rarement..."
      />
      <Input
        label="Activités de plaisir / hobbies"
        value={getValue('pleasureActivities')}
        onChangeText={v => handleChange('pleasureActivities', v)}
        placeholder="Lecture, musique, jardinage..."
        multiline
        numberOfLines={2}
      />
    </SectionWrapper>
  );

  // Section 12: Question ouverte
  const renderSection12 = () => (
    <SectionWrapper
      title={SECTIONS[11].title}
      description={SECTIONS[11].description}
    >
      <Text style={styles.openQuestionLabel}>
        Y a-t-il quelque chose d'autre que vous souhaitez partager avec votre
        naturopathe ? Des informations qui vous semblent importantes et que nous
        n'avons pas abordées ?
      </Text>
      <TextInput
        style={styles.openQuestionInput}
        value={getValue('additionalInfo')}
        onChangeText={v => handleChange('additionalInfo', v)}
        placeholder="Écrivez librement..."
        multiline
        numberOfLines={10}
        textAlignVertical="top"
      />
    </SectionWrapper>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header avec progression */}
      <View style={styles.header}>
        <ProgressBar current={currentSection} total={TOTAL_SECTIONS} />
      </View>

      {/* Contenu de la section */}
      <View style={styles.content}>{renderSection()}</View>

      {/* Navigation */}
      <View style={styles.navigation}>
        {currentSection > 1 && (
          <Button
            title="Précédent"
            onPress={handlePrevious}
            variant="outline"
            style={styles.navButton}
          />
        )}
        <Button
          title={currentSection === TOTAL_SECTIONS ? 'Terminer' : 'Suivant'}
          onPress={handleNext}
          variant="primary"
          style={currentSection === 1 ? [styles.navButton, styles.fullButton] : styles.navButton}
          loading={isLoading}
        />
      </View>

      {isLoading && <LoadingSpinner fullScreen overlay />}
    </SafeAreaView>
  );
}

// Composant SelectOption
const SelectOption: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
  <View style={styles.selectContainer}>
    <Text style={styles.selectLabel}>{label}</Text>
    <View style={styles.selectOptions}>
      {options.map(option => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.selectOption,
            value === option.value && styles.selectOptionSelected,
          ]}
          onPress={() => onChange(option.value)}
        >
          <Text
            style={[
              styles.selectOptionText,
              value === option.value && styles.selectOptionTextSelected,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// Composant SliderOption (simplifié avec boutons)
const SliderOption: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}> = ({ label, value, onChange, min, max }) => (
  <View style={styles.sliderContainer}>
    <Text style={styles.sliderLabel}>{label}</Text>
    <View style={styles.sliderRow}>
      <Text style={styles.sliderMin}>{min}</Text>
      <View style={styles.sliderButtons}>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(num => (
          <TouchableOpacity
            key={num}
            style={[
              styles.sliderButton,
              value === num && styles.sliderButtonSelected,
            ]}
            onPress={() => onChange(num)}
          >
            <Text
              style={[
                styles.sliderButtonText,
                value === num && styles.sliderButtonTextSelected,
              ]}
            >
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.sliderMax}>{max}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sable,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grisChaud,
    backgroundColor: Colors.blanc,
  },
  navButton: {
    flex: 1,
  },
  fullButton: {
    flex: 1,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  selectContainer: {
    marginBottom: 16,
  },
  selectLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.charcoal,
    marginBottom: 8,
  },
  selectOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grisChaud,
    backgroundColor: Colors.blanc,
  },
  selectOptionSelected: {
    borderColor: Colors.teal,
    backgroundColor: Colors.tealLight,
  },
  selectOptionText: {
    fontSize: 14,
    color: Colors.charcoal,
  },
  selectOptionTextSelected: {
    color: Colors.blanc,
    fontWeight: '500',
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.charcoal,
    marginBottom: 12,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderMin: {
    fontSize: 12,
    color: Colors.grisChaud,
  },
  sliderMax: {
    fontSize: 12,
    color: Colors.grisChaud,
  },
  sliderButtons: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.grisChaud,
    backgroundColor: Colors.blanc,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonSelected: {
    borderColor: Colors.teal,
    backgroundColor: Colors.teal,
  },
  sliderButtonText: {
    fontSize: 12,
    color: Colors.charcoal,
  },
  sliderButtonTextSelected: {
    color: Colors.blanc,
    fontWeight: '600',
  },
  openQuestionLabel: {
    fontSize: 16,
    color: Colors.charcoal,
    lineHeight: 24,
    marginBottom: 16,
  },
  openQuestionInput: {
    backgroundColor: Colors.blanc,
    borderWidth: 1,
    borderColor: Colors.grisChaud,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.charcoal,
    minHeight: 200,
  },
});
