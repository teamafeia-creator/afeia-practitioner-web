'use client';

import { motion } from 'framer-motion';
import {
  Apple,
  Droplets,
  Leaf,
  Wind,
  Moon,
  Heart,
  Flame,
  FileText,
  Image,
  Video,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { EducationalResource, ResourceCategory } from '../../lib/types';

const CATEGORY_ICONS: Record<ResourceCategory, React.ElementType> = {
  alimentation: Apple,
  hydratation: Droplets,
  phytotherapie: Leaf,
  aromatherapie: Sparkles,
  respiration: Wind,
  activite_physique: Heart,
  sommeil: Moon,
  gestion_stress: Heart,
  detox: Flame,
  digestion: Apple,
  immunite: Sparkles,
  peau: Droplets,
  feminin: Heart,
  general: FileText,
};

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  alimentation: 'Alimentation',
  hydratation: 'Hydratation',
  phytotherapie: 'Phytothérapie',
  aromatherapie: 'Aromathérapie',
  respiration: 'Respiration',
  activite_physique: 'Activité physique',
  sommeil: 'Sommeil',
  gestion_stress: 'Gestion du stress',
  detox: 'Détox',
  digestion: 'Digestion',
  immunite: 'Immunité',
  peau: 'Peau',
  feminin: 'Féminin',
  general: 'Général',
};

const CONTENT_TYPE_LABELS = {
  article: 'Article',
  pdf: 'PDF',
  image: 'Image',
  video_link: 'Vidéo',
};

const CONTENT_TYPE_ICONS = {
  article: FileText,
  pdf: FileText,
  image: Image,
  video_link: Video,
};

export { CATEGORY_LABELS, CATEGORY_ICONS };

export function ResourceCard({
  resource,
  onClick,
}: {
  resource: EducationalResource;
  onClick: () => void;
}) {
  const CategoryIcon = CATEGORY_ICONS[resource.category] ?? FileText;
  const TypeIcon = CONTENT_TYPE_ICONS[resource.content_type] ?? FileText;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-divider bg-white/80 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream">
          <CategoryIcon className="h-5 w-5 text-sage" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-charcoal line-clamp-2 leading-tight">
            {resource.title}
          </h3>
          {resource.summary && (
            <p className="mt-1 text-xs text-stone line-clamp-2">{resource.summary}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-terracotta/10 px-2 py-0.5 text-[10px] font-medium text-terracotta">
              {CATEGORY_LABELS[resource.category]}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-warmgray">
              <TypeIcon className="h-3 w-3" />
              {CONTENT_TYPE_LABELS[resource.content_type]}
            </span>
            {resource.read_time_minutes && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-warmgray">
                <Clock className="h-3 w-3" />
                {resource.read_time_minutes} min
              </span>
            )}
            {resource.source === 'afeia' && (
              <span className="inline-flex items-center rounded-full bg-sage/10 px-2 py-0.5 text-[10px] font-semibold text-sage">
                AFEIA
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
