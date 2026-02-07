'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';

interface MorningReviewHeaderProps {
  practitionerName: string;
  urgentCount: number;
}

function getContextualGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon apres-midi';
  return 'Bonsoir';
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function MorningReviewHeader({ practitionerName, urgentCount }: MorningReviewHeaderProps) {
  const greeting = getContextualGreeting();
  const today = useMemo(() => dateFormatter.format(new Date()), []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <h1 className="text-2xl md:text-3xl font-light text-charcoal">
        {greeting}{practitionerName ? `, ${practitionerName}` : ''}
      </h1>
      <p className="text-warmgray mt-1 capitalize">{today}</p>

      {urgentCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 inline-flex items-center gap-2 bg-gold/10 text-gold border border-gold/20 px-4 py-2 rounded-full text-sm font-medium"
        >
          <Bell className="w-4 h-4" />
          <span>
            {urgentCount} consultant{urgentCount > 1 ? 's necessitent' : ' necessite'} votre attention
          </span>
        </motion.div>
      )}
    </motion.header>
  );
}
