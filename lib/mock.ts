export type WearableDailySummary = {
  date: string; // YYYY-MM-DD
  sleepDuration: number; // hours
  sleepScore: number; // 0..100
  hrvAvg: number; // ms
  activityLevel: number; // 0..100
  completeness: number; // 0..1
};

export type WearableInsight = {
  type: 'sleep' | 'hrv' | 'activity';
  level: 'info' | 'attention';
  message: string;
  suggestedAction: string;
};

export type Anamnese = {
  motif: string;
  objectifs: string;
  alimentation: string;
  digestion: string;
  sommeil: string;
  stress: string;
  complement?: string;
  allergies?: string;
};

export type JournalItem = {
  date: string;
  mood: '🙂' | '😐' | '🙁';
  energy: 'Bas' | 'Moyen' | 'Élevé';
  text: string;
  adherence: {
    hydratation: boolean;
    respiration: boolean;
    mouvement: boolean;
    plantes: boolean;
  };
};

export type ChatMessage = {
  id: string;
  at: string; // ISO
  from: 'patient' | 'praticien';
  text: string;
};

export type PlanSection = { title: string; body: string };

export type PlanVersion = {
  version: number;
  publishedAt: string; // ISO
  title: string;
  sections: PlanSection[];
};

export type Plan = {
  id: string;
  versions: PlanVersion[];
};

export type Consultation = {
  id: string;
  date: string; // ISO
  notes: string;
};

export type Patient = {
  id: string;
  name: string;
  age: number;
  city: string;
  isPremium: boolean;
  lastConsultation: string;
  nextConsultation?: string;
  flags: {
    newQuestionnaire: boolean;
    newCircularData: boolean;
    unreadMessages: number;
  };
  anamnese: Anamnese;
  wearable?: {
    summaries: WearableDailySummary[];
    insights: WearableInsight[];
  };
  journal: JournalItem[];
  messages: ChatMessage[];
  plan: Plan;
  consultations: Consultation[];
};

function d(daysAgo: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  return dt.toISOString().slice(0, 10);
}

function iso(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 3600000).toISOString();
}

export const mockPatients: Patient[] = [
  {
    id: 'p_001',
    name: 'Sofia R.',
    age: 31,
    city: 'Paris',
    isPremium: true,
    lastConsultation: d(14),
    nextConsultation: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10) + ' 09:00',
    flags: { newQuestionnaire: false, newCircularData: true, unreadMessages: 2 },
    anamnese: {
      motif: 'Fatigue, sommeil léger, stress.',
      objectifs: 'Retrouver de l’énergie, mieux dormir, réduire les ballonnements.',
      alimentation: 'Repas irréguliers, sucre en fin de journée, 2 cafés/jour.',
      digestion: 'Ballonnements après repas, transit variable.',
      sommeil: 'Endormissement difficile, réveils nocturnes.',
      stress: 'Pic en milieu de semaine, tension mentale au travail.',
      complement: 'Magnésium ponctuel',
      allergies: 'Aucune connue'
    },
    wearable: {
      summaries: [
        { date: d(6), sleepDuration: 6.4, sleepScore: 71, hrvAvg: 44, activityLevel: 58, completeness: 0.92 },
        { date: d(5), sleepDuration: 6.8, sleepScore: 74, hrvAvg: 49, activityLevel: 60, completeness: 0.95 },
        { date: d(4), sleepDuration: 7.1, sleepScore: 78, hrvAvg: 52, activityLevel: 74, completeness: 0.97 },
        { date: d(3), sleepDuration: 6.2, sleepScore: 69, hrvAvg: 41, activityLevel: 38, completeness: 0.88 },
        { date: d(2), sleepDuration: 7.3, sleepScore: 80, hrvAvg: 55, activityLevel: 57, completeness: 0.96 },
        { date: d(1), sleepDuration: 7.0, sleepScore: 77, hrvAvg: 53, activityLevel: 61, completeness: 0.94 }
      ],
      insights: [
        {
          type: 'sleep',
          level: 'info',
          message: 'Tendance positive : le sommeil se stabilise sur 3 jours.',
          suggestedAction: 'Conserver l’heure de coucher et réduire les écrans 45 min avant.'
        },
        {
          type: 'hrv',
          level: 'attention',
          message: 'HRV plus basse lors des journées très chargées.',
          suggestedAction: 'Tester 5 min de cohérence cardiaque en fin d’après-midi.'
        }
      ]
    },
    journal: [
      {
        date: d(2),
        mood: '🙂',
        energy: 'Moyen',
        text: 'Respiration faite le matin, meilleure concentration.',
        adherence: { hydratation: true, respiration: true, mouvement: false, plantes: true }
      },
      {
        date: d(1),
        mood: '😐',
        energy: 'Bas',
        text: 'Journée intense, envie de sucre le soir.',
        adherence: { hydratation: true, respiration: false, mouvement: false, plantes: true }
      }
    ],
    messages: [
      { id: 'm1', at: iso(6), from: 'patient', text: "J'ai eu un peu de mal à faire la respiration hier, c'est normal ?" },
      { id: 'm2', at: iso(5.5), from: 'praticien', text: "Oui, c'est normal. On peut y aller progressivement. Essaie 2 minutes aujourd’hui, c’est déjà très bien." },
      { id: 'm3', at: iso(2), from: 'patient', text: 'Ok merci 🙏 et pour les tisanes, je peux en prendre le soir ?' }
    ],
    plan: {
      id: 'plan_001',
      versions: [
        {
          version: 1,
          publishedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
          title: 'Stabilisation énergie & sommeil (V1)',
          sections: [
            { title: 'Alimentation', body: '• Ajouter une portion de légumes verts au dîner\n• Limiter le sucre après 20h (3 soirs/sem)' },
            { title: 'Plantes / Tisanes', body: '• Infusion verveine + passiflore le soir (5 jours/sem)' },
            { title: 'Hygiène de vie', body: '• Écrans off 45 min avant coucher\n• Marche légère 15 min après déjeuner' },
            { title: 'Respiration', body: '• Cohérence cardiaque 5 min (2 fois/jour)' },
            { title: 'Objectifs', body: '• Marcher ≥ 5 000 pas, 4 jours cette semaine' }
          ]
        }
      ]
    },
    consultations: [
      {
        id: 'c_001',
        date: new Date(Date.now() - 14 * 86400000).toISOString(),
        notes:
          '- Fatigue en fin de journée, sommeil léger\n- Ballonnements après repas\n- Stress au travail\n- Objectif : routine coucher + respiration\n- Plan : légumes verts + tisane + marche'
      }
    ]
  },
  {
    id: 'p_002',
    name: 'Mehdi B.',
    age: 27,
    city: 'Lyon',
    isPremium: false,
    lastConsultation: d(30),
    nextConsultation: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) + ' 18:30',
    flags: { newQuestionnaire: true, newCircularData: false, unreadMessages: 0 },
    anamnese: {
      motif: 'Digestion lente et reflux occasionnel.',
      objectifs: 'Confort digestif et énergie stable.',
      alimentation: 'Repas rapides, parfois tardifs.',
      digestion: 'Lourdeurs après repas, reflux.',
      sommeil: 'Sommeil correct, réveil un peu difficile.',
      stress: 'Modéré, surtout avant les deadlines.'
    },
    journal: [
      {
        date: d(3),
        mood: '🙂',
        energy: 'Moyen',
        text: 'Repas plus tôt, meilleure digestion.',
        adherence: { hydratation: true, respiration: false, mouvement: true, plantes: false }
      }
    ],
    messages: [],
    plan: {
      id: 'plan_002',
      versions: [
        {
          version: 1,
          publishedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
          title: 'Confort digestif (V1)',
          sections: [
            { title: 'Alimentation', body: '• Dîner plus tôt (au moins 3 soirs/sem)\n• Mastiquer davantage (objectif : 10 min/repas)' },
            { title: 'Hygiène de vie', body: '• Marche 10 min après repas quand possible' },
            { title: 'Objectifs', body: '• Noter les aliments déclencheurs sur 7 jours' }
          ]
        }
      ]
    },
    consultations: [
      {
        id: 'c_002',
        date: new Date(Date.now() - 30 * 86400000).toISOString(),
        notes:
          '- Digestion lente, reflux\n- Repas tardifs\n- Objectif : rythme + mastication\n- Plan : marche post-repas'
      }
    ]
  }
];

export const mockNotifications = [
  {
    id: 'n1',
    title: 'Questionnaire reçu',
    desc: 'Mehdi B. a complété son questionnaire pré-séance.',
    level: 'info' as const,
    patientId: 'p_002'
  },
  {
    id: 'n2',
    title: 'Données Circular disponibles',
    desc: 'Nouvelles données sommeil/HRV/activité à analyser pour Sofia R.',
    level: 'attention' as const,
    patientId: 'p_001'
  }
];
