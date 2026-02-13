export type TemplateType =
  | 'body_front'
  | 'body_back'
  | 'face'
  | 'feet_plantar'
  | 'hands_palmar'
  | 'iris_left'
  | 'iris_right'
  | 'spine'
  | 'blank';

export type ConsultantDrawing = {
  id: string;
  consultant_id: string;
  practitioner_id: string;
  title: string;
  template_type: TemplateType;
  excalidraw_data: ExcalidrawData;
  snapshot_path: string | null;
  appointment_id: string | null;
  version: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ExcalidrawData = {
  elements: any[];
  appState?: Record<string, any>;
  files?: Record<string, any>;
};

type TemplateConfigEntry = {
  label: string;
  description: string;
  category: 'Morphologie' | 'Visage' | 'Extrémités' | 'Iridologie' | 'Colonne' | 'Autre';
  file: string | null;
};

export const TEMPLATE_CONFIG: Record<TemplateType, TemplateConfigEntry> = {
  body_front: {
    label: 'Corps (face)',
    description: 'Silhouette humaine vue de face',
    category: 'Morphologie',
    file: '/templates/drawings/body_front.svg',
  },
  body_back: {
    label: 'Corps (dos)',
    description: 'Silhouette humaine vue de dos',
    category: 'Morphologie',
    file: '/templates/drawings/body_back.svg',
  },
  face: {
    label: 'Visage',
    description: 'Visage de face avec repères anatomiques',
    category: 'Visage',
    file: '/templates/drawings/face.svg',
  },
  feet_plantar: {
    label: 'Pieds (plantaire)',
    description: 'Vue plantaire des deux pieds',
    category: 'Extrémités',
    file: '/templates/drawings/feet_plantar.svg',
  },
  hands_palmar: {
    label: 'Mains (palmaire)',
    description: 'Paumes des deux mains',
    category: 'Extrémités',
    file: '/templates/drawings/hands_palmar.svg',
  },
  iris_left: {
    label: 'Iris gauche',
    description: 'Iris gauche avec secteurs iridologiques',
    category: 'Iridologie',
    file: '/templates/drawings/iris_left.svg',
  },
  iris_right: {
    label: 'Iris droit',
    description: 'Iris droit avec secteurs iridologiques',
    category: 'Iridologie',
    file: '/templates/drawings/iris_right.svg',
  },
  spine: {
    label: 'Colonne vertébrale',
    description: 'Colonne vertébrale vue postérieure',
    category: 'Colonne',
    file: '/templates/drawings/spine.svg',
  },
  blank: {
    label: 'Vierge',
    description: 'Canvas vide sans modèle',
    category: 'Autre',
    file: null,
  },
};
