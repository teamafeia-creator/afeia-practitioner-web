/**
 * Anamnese Questionnaire Screen
 * Multi-step questionnaire (12 sections)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { Button, StepProgress, Input, RadioGroup, CheckboxGroup, Rating } from '@/components/ui';
import { anamneseApi, formatApiError } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { DraftStorage } from '@/services/storage/secureStore';
import { Colors, Theme, Spacing, TextStyles } from '@/constants';
import type { AnamneseData } from '@/types';

const TOTAL_STEPS = 12;

const SECTION_TITLES = [
  'Informations générales',
  'Profil personnel et émotionnel',
  'Motif de consultation',
  'Alimentation et hydratation',
  'Digestion et transit',
  'Sommeil et énergie',
  'Activité physique et posture',
  'Stress, émotions et équilibre',
  'Élimination et peau',
  'Santé spécifique',
  'Mode de vie global',
  'Question ouverte',
];

export default function AnamneseScreen() {
  const { setNeedsAnamnese } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | null>(null);

  const methods = useForm<AnamneseData>({
    defaultValues: {
      section1: { nom: '', age: '', profession: '', situationFamiliale: '', poids: '', taille: '' },
      section2: { profil: 'entre_les_deux', temperament: [], anxiete: '' },
      section3: { motifConsultation: '', objectifsAmelioration: '', dureeDesequilibres: '', periodesAmelioration: '' },
      section4: { habitudesAlimentaires: '', nombreRepas: '', petitDejeuner: '', typesRepas: 'mixte', alimentsFrequents: [], boissonsFrequentes: '', enviesAlimentaires: '' },
      section5: { digestion: '', frequenceTransit: '', variationTransit: '' },
      section6: { heureCoucher: '', heureReveil: '', typeSommeil: 'entre_les_deux', reposReveil: '', reveilsNocturnes: '', coupsFatigue: '' },
      section7: { activitePhysique: '', douleursTensions: '' },
      section8: { stressFrequent: '', sourcesTension: '', sourcesDetente: '', expressionEmotions: '', humeurGenerale: '' },
      section9: { transpiration: '', typePeau: 'mixte', problemesPeau: '', urines: '' },
      section10: { gender: 'male', niveauEnergie: '', tensionsBasVentre: '', sommeilRecuperation: '' },
      section11: { eauParJour: '', fumeur: '', alcool: '', tempsNature: '', activitesPlaisir: '' },
      section12: { questionOuverte: '' },
    },
  });

  const { control, handleSubmit, getValues, setValue, watch } = methods;

  // Load draft on mount
  useEffect(() => {
    loadDraft();
  }, []);

  // Auto-save draft on step change
  useEffect(() => {
    const values = getValues();
    saveDraft(values);
  }, [currentStep]);

  const loadDraft = async () => {
    try {
      const draftStr = await DraftStorage.getAnamneseDraft();
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        Object.keys(draft).forEach((key) => {
          setValue(key as keyof AnamneseData, draft[key]);
        });
        if (draft.section10?.gender) {
          setGender(draft.section10.gender);
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = async (data: Partial<AnamneseData>) => {
    setIsSavingDraft(true);
    try {
      await DraftStorage.setAnamneseDraft(JSON.stringify(data));
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmitForm = async () => {
    setIsLoading(true);
    try {
      const data = getValues();
      await anamneseApi.submit(data);
      await DraftStorage.clearAnamneseDraft();
      setNeedsAnamnese(false);
      router.replace('/(onboarding)/complete');
    } catch (error) {
      Alert.alert('Erreur', formatApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExit = () => {
    Alert.alert(
      'Quitter le questionnaire ?',
      'Vos réponses seront sauvegardées et vous pourrez reprendre plus tard.',
      [
        { text: 'Continuer', style: 'cancel' },
        {
          text: 'Quitter',
          onPress: async () => {
            const values = getValues();
            await saveDraft(values);
            router.back();
          },
        },
      ]
    );
  };

  const renderSection = () => {
    switch (currentStep) {
      case 0:
        return <Section1 control={control} />;
      case 1:
        return <Section2 control={control} />;
      case 2:
        return <Section3 control={control} />;
      case 3:
        return <Section4 control={control} />;
      case 4:
        return <Section5 control={control} />;
      case 5:
        return <Section6 control={control} />;
      case 6:
        return <Section7 control={control} />;
      case 7:
        return <Section8 control={control} />;
      case 8:
        return <Section9 control={control} />;
      case 9:
        return (
          <Section10
            control={control}
            gender={gender}
            setGender={(g) => {
              setGender(g);
              setValue('section10.gender', g);
            }}
          />
        );
      case 10:
        return <Section11 control={control} />;
      case 11:
        return <Section12 control={control} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
            <Ionicons name="close" size={24} color={Theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{SECTION_TITLES[currentStep]}</Text>
            {isSavingDraft && (
              <Text style={styles.savingText}>Sauvegarde...</Text>
            )}
          </View>
          <View style={styles.exitButton} />
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <StepProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FormProvider {...methods}>{renderSection()}</FormProvider>
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.footer}>
          {currentStep > 0 && (
            <Button
              variant="outline"
              onPress={handleBack}
              style={styles.footerButton}
            >
              Précédent
            </Button>
          )}
          <View style={styles.footerSpacer} />
          {currentStep < TOTAL_STEPS - 1 ? (
            <Button
              variant="primary"
              onPress={handleNext}
              style={styles.footerButton}
            >
              Suivant
            </Button>
          ) : (
            <Button
              variant="primary"
              onPress={handleSubmitForm}
              isLoading={isLoading}
              style={styles.footerButton}
            >
              Envoyer
            </Button>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Section 1: Informations générales
function Section1({ control }: { control: any }) {
  return (
    <View>
      <Text style={styles.sectionIntro}>
        Ces informations permettent à votre naturopathe de mieux vous connaître.
      </Text>
      <Controller
        control={control}
        name="section1.nom"
        render={({ field: { onChange, value } }) => (
          <Input label="Nom complet" placeholder="Votre nom et prénom" value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="section1.age"
        render={({ field: { onChange, value } }) => (
          <Input label="Âge" placeholder="Ex: 35" keyboardType="number-pad" value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="section1.profession"
        render={({ field: { onChange, value } }) => (
          <Input label="Profession" placeholder="Votre métier actuel" value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="section1.situationFamiliale"
        render={({ field: { onChange, value } }) => (
          <Input label="Situation familiale" placeholder="Ex: Marié(e), 2 enfants" value={value} onChangeText={onChange} />
        )}
      />
      <View style={styles.rowInputs}>
        <Controller
          control={control}
          name="section1.poids"
          render={({ field: { onChange, value } }) => (
            <Input label="Poids (kg)" placeholder="Ex: 70" keyboardType="number-pad" value={value} onChangeText={onChange} containerStyle={styles.halfInput} />
          )}
        />
        <Controller
          control={control}
          name="section1.taille"
          render={({ field: { onChange, value } }) => (
            <Input label="Taille (cm)" placeholder="Ex: 175" keyboardType="number-pad" value={value} onChangeText={onChange} containerStyle={styles.halfInput} />
          )}
        />
      </View>
      <Controller
        control={control}
        name="section1.medecinTraitant"
        render={({ field: { onChange, value } }) => (
          <Input label="Médecin traitant (optionnel)" placeholder="Nom du médecin" value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="section1.traitementsActuels"
        render={({ field: { onChange, value } }) => (
          <Input label="Traitements ou compléments actuels" placeholder="Listez vos traitements en cours" multiline numberOfLines={3} value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="section1.allergies"
        render={({ field: { onChange, value } }) => (
          <Input label="Allergies connues" placeholder="Ex: Pollen, arachides..." value={value} onChangeText={onChange} />
        )}
      />
    </View>
  );
}

// Section 2: Profil personnel et émotionnel
function Section2({ control }: { control: any }) {
  return (
    <View>
      <Controller
        control={control}
        name="section2.profil"
        render={({ field: { onChange, value } }) => (
          <RadioGroup
            label="Vous diriez que vous êtes plutôt :"
            options={[
              { value: 'introverti', label: 'Introverti(e)', description: 'Vous rechargez votre énergie seul(e)' },
              { value: 'extraverti', label: 'Extraverti(e)', description: 'Vous rechargez votre énergie au contact des autres' },
              { value: 'entre_les_deux', label: 'Entre les deux' },
            ]}
            value={value}
            onChange={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section2.temperament"
        render={({ field: { onChange, value } }) => (
          <CheckboxGroup
            label="Comment décririez-vous votre tempérament ?"
            options={[
              { value: 'calme', label: 'Calme / posé(e)' },
              { value: 'stresse', label: 'Stressé(e) ou souvent sous tension' },
              { value: 'dynamique', label: 'Dynamique / actif(ve)' },
              { value: 'emotif', label: 'Émotif(ve) / sensible' },
              { value: 'chill', label: 'Plutôt "chill" / détendu(e)' },
            ]}
            values={value || []}
            onChange={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section2.anxiete"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Vous sentez-vous facilement dépassé(e) ou anxieux(se) ? Dans quelles situations ?"
            placeholder="Décrivez les situations qui vous stressent..."
            multiline
            numberOfLines={4}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
    </View>
  );
}

// Section 3: Motif de consultation
function Section3({ control }: { control: any }) {
  return (
    <View>
      <Text style={styles.sectionIntro}>
        Ces informations nous aident à comprendre vos besoins et à personnaliser votre accompagnement.
      </Text>
      <Controller
        control={control}
        name="section3.motifConsultation"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Qu'est-ce qui vous amène à consulter aujourd'hui ?"
            placeholder="Ex: fatigue, digestion difficile, sommeil léger, stress..."
            multiline
            numberOfLines={4}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section3.objectifsAmelioration"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Qu'aimeriez-vous améliorer dans votre santé ou votre bien-être ?"
            placeholder="Ex: énergie, sommeil, digestion, détente, peau, émotions..."
            multiline
            numberOfLines={4}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section3.dureeDesequilibres"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Depuis combien de temps ressentez-vous ces déséquilibres ?"
            placeholder="Ex: Quelques semaines, plusieurs mois, des années..."
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section3.periodesAmelioration"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Avez-vous remarqué des périodes où cela s'améliore ou s'aggrave ?"
            placeholder="Décrivez quand et dans quelles conditions..."
            multiline
            numberOfLines={3}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
    </View>
  );
}

// Section 4: Alimentation et hydratation
function Section4({ control }: { control: any }) {
  return (
    <View>
      <Controller
        control={control}
        name="section4.habitudesAlimentaires"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Comment décririez-vous vos habitudes alimentaires ?"
            placeholder="Ex: variées, rapides, irrégulières, équilibrées..."
            multiline
            numberOfLines={3}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section4.nombreRepas"
        render={({ field: { onChange, value } }) => (
          <Input label="Combien de repas prenez-vous par jour ?" placeholder="Ex: 3 repas" value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="section4.petitDejeuner"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Prenez-vous un petit-déjeuner ? Si oui, de quoi est-il composé ?"
            placeholder="Décrivez votre petit-déjeuner habituel..."
            multiline
            numberOfLines={2}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section4.typesRepas"
        render={({ field: { onChange, value } }) => (
          <RadioGroup
            label="Vos repas sont-ils majoritairement :"
            options={[
              { value: 'maison', label: 'Préparés à la maison' },
              { value: 'exterieur', label: 'Pris à l\'extérieur (cantine, restaurant, plats à emporter)' },
              { value: 'mixte', label: 'Un mélange des deux' },
            ]}
            value={value}
            onChange={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section4.alimentsFrequents"
        render={({ field: { onChange, value } }) => (
          <CheckboxGroup
            label="Quels types d'aliments consommez-vous le plus souvent ?"
            options={[
              { value: 'viandes', label: 'Viandes, charcuteries, œufs' },
              { value: 'poissons', label: 'Poissons, fruits de mer' },
              { value: 'feculents', label: 'Féculents (pâtes, riz, pain, pommes de terre...)' },
              { value: 'legumes', label: 'Légumes et crudités' },
              { value: 'fruits', label: 'Fruits' },
              { value: 'sucres', label: 'Produits sucrés (pâtisseries, chocolat, sodas...)' },
              { value: 'laitiers', label: 'Produits laitiers' },
              { value: 'legumineuses', label: 'Légumineuses (lentilles, pois chiches, haricots...)' },
            ]}
            values={value || []}
            onChange={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section4.boissonsFrequentes"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Quels types de boissons consommez-vous le plus dans la journée ?"
            placeholder="Ex: eau, café, thé, infusions, jus, sodas..."
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section4.enviesAlimentaires"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Avez-vous des envies alimentaires particulières ?"
            placeholder="Ex: sucré, salé, chocolat, gras, pain..."
            value={value}
            onChangeText={onChange}
          />
        )}
      />
    </View>
  );
}

// Section 5: Digestion et transit
function Section5({ control }: { control: any }) {
  return (
    <View>
      <Controller
        control={control}
        name="section5.digestion"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Comment décririez-vous votre digestion ?"
            placeholder="Ex: facile, lente, ballonnements, lourdeurs, brûlures, reflux, gaz..."
            multiline
            numberOfLines={3}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section5.frequenceTransit"
        render={({ field: { onChange, value } }) => (
          <Input
            label="À quelle fréquence allez-vous à la selle ?"
            placeholder="Ex: chaque jour, tous les 2 ou 3 jours, 2 fois par semaine..."
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section5.variationTransit"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Avez-vous remarqué que votre transit varie selon votre alimentation ou état émotionnel ?"
            placeholder="Ex: plus lent en période de stress, plus rapide en vacances..."
            multiline
            numberOfLines={3}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section5.remarquesTransit"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Autre remarque sur votre transit ou confort digestif (optionnel)"
            placeholder="Partagez d'autres observations..."
            multiline
            numberOfLines={2}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
    </View>
  );
}

// Section 6: Sommeil et énergie
function Section6({ control }: { control: any }) {
  return (
    <View>
      <View style={styles.rowInputs}>
        <Controller
          control={control}
          name="section6.heureCoucher"
          render={({ field: { onChange, value } }) => (
            <Input label="Heure de coucher" placeholder="Ex: 22h30" value={value} onChangeText={onChange} containerStyle={styles.halfInput} />
          )}
        />
        <Controller
          control={control}
          name="section6.heureReveil"
          render={({ field: { onChange, value } }) => (
            <Input label="Heure de réveil" placeholder="Ex: 7h00" value={value} onChangeText={onChange} containerStyle={styles.halfInput} />
          )}
        />
      </View>
      <Controller
        control={control}
        name="section6.typeSommeil"
        render={({ field: { onChange, value } }) => (
          <RadioGroup
            label="Votre sommeil est-il plutôt :"
            options={[
              { value: 'leger', label: 'Léger' },
              { value: 'profond', label: 'Profond' },
              { value: 'entre_les_deux', label: 'Entre les deux' },
            ]}
            value={value}
            onChange={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section6.reposReveil"
        render={({ field: { onChange, value } }) => (
          <Input label="Vous sentez-vous reposé(e) au réveil ?" placeholder="Oui / Non / Parfois..." value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="section6.reveilsNocturnes"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Avez-vous des réveils nocturnes ou des difficultés d'endormissement ?"
            placeholder="Décrivez vos difficultés de sommeil..."
            multiline
            numberOfLines={2}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section6.coupsFatigue"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Avez-vous souvent des coups de fatigue dans la journée ? À quel moment ?"
            placeholder="Ex: Après le déjeuner, en fin d'après-midi..."
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section6.remarquesSommeil"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Autre remarque sur votre sommeil (optionnel)"
            placeholder="Partagez d'autres observations..."
            multiline
            numberOfLines={2}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
    </View>
  );
}

// Section 7: Activité physique et posture
function Section7({ control }: { control: any }) {
  return (
    <View>
      <Controller
        control={control}
        name="section7.activitePhysique"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Avez-vous une activité physique régulière ? Si oui, laquelle et à quelle fréquence ?"
            placeholder="Ex: marche 30 min/jour, yoga 2x/semaine, course à pied..."
            multiline
            numberOfLines={3}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section7.activiteSouhaitee"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Si vous n'avez pas d'activité régulière, qu'aimeriez-vous pratiquer ?"
            placeholder="Ex: Natation, yoga, marche en nature..."
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section7.douleursTensions"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Avez-vous des douleurs ou tensions corporelles récurrentes ?"
            placeholder="Ex: dos, nuque, jambes lourdes, articulations..."
            multiline
            numberOfLines={3}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
    </View>
  );
}

// Section 8: Stress, émotions et équilibre intérieur
function Section8({ control }: { control: any }) {
  return (
    <View>
      <Controller
        control={control}
        name="section8.stressFrequent"
        render={({ field: { onChange, value } }) => (
          <Input label="Vous sentez-vous souvent stressé(e), tendu(e) ou nerveux(se) ?" placeholder="Oui / Non / Parfois..." value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="section8.sourcesTension"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Qu'est-ce qui provoque le plus de tension dans votre quotidien ?"
            placeholder="Ex: travail, famille, finances, santé..."
            multiline
            numberOfLines={3}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section8.sourcesDetente"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Quelles sont vos principales sources de détente ou de ressourcement ?"
            placeholder="Ex: lecture, nature, méditation, musique, activités manuelles, sport..."
            multiline
            numberOfLines={3}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section8.expressionEmotions"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Avez-vous tendance à intérioriser vos émotions ou à les exprimer facilement ?"
            placeholder="Décrivez votre manière de gérer vos émotions..."
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section8.humeurGenerale"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Comment décririez-vous votre humeur en général ?"
            placeholder="Ex: stable, joyeuse, anxieuse, fatiguée, irritable, changeante..."
            value={value}
            onChangeText={onChange}
          />
        )}
      />
    </View>
  );
}

// Section 9: Élimination et peau
function Section9({ control }: { control: any }) {
  return (
    <View>
      <Controller
        control={control}
        name="section9.transpiration"
        render={({ field: { onChange, value } }) => (
          <Input label="Transpirez-vous facilement ?" placeholder="Oui / Non / Parfois..." value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="section9.typePeau"
        render={({ field: { onChange, value } }) => (
          <RadioGroup
            label="Votre peau est-elle :"
            options={[
              { value: 'seche', label: 'Sèche' },
              { value: 'grasse', label: 'Grasse' },
              { value: 'mixte', label: 'Mixte' },
              { value: 'sensible', label: 'Sensible' },
            ]}
            value={value}
            onChange={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section9.problemesPeau"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Avez-vous des boutons, démangeaisons, eczéma, etc. ?"
            placeholder="Décrivez vos problèmes de peau..."
            multiline
            numberOfLines={2}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section9.urines"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Vos urines sont-elles claires, foncées, abondantes ou peu fréquentes ?"
            placeholder="Décrivez..."
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="section9.remarquesElimination"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Autre remarque sur votre peau ou élimination (optionnel)"
            placeholder="Partagez d'autres observations..."
            multiline
            numberOfLines={2}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
    </View>
  );
}

// Section 10: Pour les femmes / Pour les hommes
function Section10({
  control,
  gender,
  setGender,
}: {
  control: any;
  gender: 'male' | 'female' | null;
  setGender: (g: 'male' | 'female') => void;
}) {
  return (
    <View>
      <Text style={styles.sectionIntro}>
        Cette section concerne votre santé spécifique. Sélectionnez la section qui vous correspond.
      </Text>
      <RadioGroup
        options={[
          { value: 'female', label: 'Pour les femmes' },
          { value: 'male', label: 'Pour les hommes' },
        ]}
        value={gender || ''}
        onChange={(v) => setGender(v as 'male' | 'female')}
      />

      {gender === 'female' && (
        <View style={styles.genderSection}>
          <Controller
            control={control}
            name="section10.reglesRegulieres"
            render={({ field: { onChange, value } }) => (
              <RadioGroup
                label="Avez-vous vos règles de façon régulière ?"
                options={[
                  { value: 'oui', label: 'Oui' },
                  { value: 'non', label: 'Non' },
                  { value: 'parfois', label: 'Parfois' },
                ]}
                value={value || ''}
                onChange={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="section10.dureeRegles"
            render={({ field: { onChange, value } }) => (
              <Input label="Combien de jours durent vos règles ?" placeholder="Ex: 4-5 jours" value={value} onChangeText={onChange} />
            )}
          />
          <Controller
            control={control}
            name="section10.douleursRegles"
            render={({ field: { onChange, value } }) => (
              <Input label="Avez-vous des douleurs ou gênes pendant vos règles ?" placeholder="Décrivez..." value={value} onChangeText={onChange} />
            )}
          />
          <Controller
            control={control}
            name="section10.intensiteDouleurs"
            render={({ field: { onChange, value } }) => (
              <RadioGroup
                label="Intensité des douleurs :"
                options={[
                  { value: 'legere', label: 'Légère' },
                  { value: 'moyenne', label: 'Moyenne' },
                  { value: 'forte', label: 'Forte / difficile à supporter' },
                ]}
                value={value || ''}
                onChange={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="section10.changementsAvantRegles"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Ressentez-vous des changements avant vos règles ?"
                placeholder="Ex: irritabilité, fatigue, tristesse, envies alimentaires..."
                multiline
                numberOfLines={2}
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="section10.variationsEnergie"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Avez-vous remarqué des variations d'énergie au fil du mois ?"
                placeholder="Ex: plus d'énergie à certains moments..."
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="section10.menopausee"
            render={({ field: { onChange, value } }) => (
              <RadioGroup
                label="Êtes-vous ménopausée ?"
                options={[
                  { value: 'oui', label: 'Oui' },
                  { value: 'non', label: 'Non' },
                ]}
                value={value || ''}
                onChange={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="section10.symptomesMenopause"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Si oui, ressentez-vous des bouffées de chaleur, troubles du sommeil ou variations d'humeur ?"
                placeholder="Décrivez vos symptômes..."
                multiline
                numberOfLines={2}
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="section10.contraception"
            render={({ field: { onChange, value } }) => (
              <Input label="Utilisez-vous une contraception ? Si oui, laquelle ?" placeholder="Ex: Pilule, stérilet..." value={value} onChangeText={onChange} />
            )}
          />
        </View>
      )}

      {gender === 'male' && (
        <View style={styles.genderSection}>
          <Controller
            control={control}
            name="section10.niveauEnergie"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Comment décririez-vous votre niveau d'énergie générale ?"
                placeholder="Ex: stable, variable, en baisse récente..."
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="section10.tensionsBasVentre"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Avez-vous des tensions, douleurs ou lourdeurs au niveau du bas-ventre ou du dos ?"
                placeholder="Décrivez..."
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="section10.sommeilRecuperation"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Comment se porte votre sommeil et votre récupération après l'effort ?"
                placeholder="Décrivez..."
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="section10.remarquesVitalite"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Autre remarque concernant votre vitalité ou équilibre hormonal (optionnel)"
                placeholder="Partagez d'autres observations..."
                multiline
                numberOfLines={2}
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </View>
      )}
    </View>
  );
}

// Section 11: Mode de vie global
function Section11({ control }: { control: any }) {
  return (
    <View>
      <Controller
        control={control}
        name="section11.eauParJour"
        render={({ field: { onChange, value } }) => (
          <Input label="Combien d'eau buvez-vous par jour (environ) ?" placeholder="Ex: 1,5L, 2L..." value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="section11.fumeur"
        render={({ field: { onChange, value } }) => (
          <Input label="Fumez-vous ?" placeholder="Oui / Non / Ancien fumeur..." value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="section11.alcool"
        render={({ field: { onChange, value } }) => (
          <Input label="Consommez-vous de l'alcool ? Si oui, à quelle fréquence ?" placeholder="Ex: Occasionnellement, 1-2 verres/semaine..." value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="section11.tempsNature"
        render={({ field: { onChange, value } }) => (
          <Input label="Passez-vous du temps dans la nature ou à l'extérieur ?" placeholder="Ex: Quotidiennement, le week-end..." value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="section11.activitesPlaisir"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Avez-vous des activités qui vous procurent du plaisir et du calme intérieur ?"
            placeholder="Décrivez vos activités de détente..."
            multiline
            numberOfLines={3}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
    </View>
  );
}

// Section 12: Question ouverte
function Section12({ control }: { control: any }) {
  return (
    <View>
      <Text style={styles.sectionIntro}>
        Y a-t-il autre chose que vous aimeriez partager sur votre santé, vos habitudes ou votre état actuel ?
      </Text>
      <Text style={styles.sectionHint}>
        Tout ce qui vous semble utile ou important, même si vous pensez que ce n'est "pas lié".
      </Text>
      <Controller
        control={control}
        name="section12.questionOuverte"
        render={({ field: { onChange, value } }) => (
          <Input
            placeholder="Partagez librement vos pensées, observations ou questions..."
            multiline
            numberOfLines={8}
            value={value}
            onChangeText={onChange}
            style={styles.largeTextarea}
          />
        )}
      />
      <View style={styles.thankYouBox}>
        <Text style={styles.thankYouText}>
          Merci d'avoir pris le temps de remplir ce questionnaire.
        </Text>
        <Text style={styles.thankYouSubtext}>
          Ces informations permettront à votre naturopathe de préparer une séance personnalisée et adaptée à votre rythme et à vos besoins.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.sandDark,
  },
  exitButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...TextStyles.label,
    color: Theme.text,
  },
  savingText: {
    ...TextStyles.caption,
    color: Theme.textSecondary,
    marginTop: 2,
  },
  progressContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.neutral.sand,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  sectionIntro: {
    ...TextStyles.body,
    color: Theme.textSecondary,
    marginBottom: Spacing.lg,
    fontStyle: 'italic',
  },
  sectionHint: {
    ...TextStyles.bodySmall,
    color: Theme.textSecondary,
    marginBottom: Spacing.md,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  genderSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.sandDark,
  },
  largeTextarea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  thankYouBox: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.primary.tealPale,
    borderRadius: 12,
  },
  thankYouText: {
    ...TextStyles.body,
    color: Colors.primary.tealDeep,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  thankYouSubtext: {
    ...TextStyles.bodySmall,
    color: Colors.primary.teal,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.sandDark,
    backgroundColor: Colors.neutral.white,
  },
  footerButton: {
    flex: 1,
  },
  footerSpacer: {
    width: Spacing.md,
  },
});
