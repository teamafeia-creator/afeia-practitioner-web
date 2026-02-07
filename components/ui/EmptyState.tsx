'use client';

import { motion } from 'framer-motion';
import {
  Calendar,
  MessageSquare,
  Users,
  FileText,
  Search,
  Inbox,
  Bell,
  Clock,
  type LucideIcon
} from 'lucide-react';
import { cn } from '../../lib/cn';

type PresetIcon =
  | 'calendar'
  | 'messages'
  | 'consultants'
  | 'documents'
  | 'search'
  | 'inbox'
  | 'notifications'
  | 'appointments';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: PresetIcon | React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const presetIcons: Record<PresetIcon, LucideIcon> = {
  calendar: Calendar,
  messages: MessageSquare,
  consultants: Users,
  documents: FileText,
  search: Search,
  inbox: Inbox,
  notifications: Bell,
  appointments: Clock
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  size = 'md'
}: EmptyStateProps) {
  const sizeStyles = {
    sm: {
      container: 'px-4 py-5',
      icon: 'h-10 w-10',
      iconWrapper: 'h-14 w-14',
      title: 'text-sm',
      description: 'text-xs'
    },
    md: {
      container: 'px-6 py-8',
      icon: 'h-12 w-12',
      iconWrapper: 'h-20 w-20',
      title: 'text-base',
      description: 'text-sm'
    },
    lg: {
      container: 'px-8 py-12',
      icon: 'h-16 w-16',
      iconWrapper: 'h-24 w-24',
      title: 'text-lg',
      description: 'text-base'
    }
  };

  const IconComponent =
    typeof icon === 'string' && icon in presetIcons
      ? presetIcons[icon as PresetIcon]
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center gap-4 rounded-2xl bg-gradient-to-br from-white to-sable/30 text-center shadow-sm ring-1 ring-black/5',
        sizeStyles[size].container,
        className
      )}
    >
      {/* Icon or illustration */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className={cn(
          'flex items-center justify-center rounded-2xl bg-gradient-to-br from-teal/10 to-emerald-50',
          sizeStyles[size].iconWrapper
        )}
      >
        {IconComponent ? (
          <IconComponent
            className={cn('text-teal', sizeStyles[size].icon)}
            strokeWidth={1.5}
          />
        ) : typeof icon === 'string' ? (
          <span className="text-3xl">{icon}</span>
        ) : (
          icon
        )}
      </motion.div>

      {/* Text content */}
      <div className="space-y-1">
        <p
          className={cn(
            'font-semibold text-charcoal',
            sizeStyles[size].title
          )}
        >
          {title}
        </p>
        {description && (
          <p
            className={cn(
              'text-warmgray max-w-sm mx-auto',
              sizeStyles[size].description
            )}
          >
            {description}
          </p>
        )}
      </div>

      {/* Action button */}
      {action && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}

// Pre-configured empty states for common use cases
export function NoConsultants({ action }: { action?: React.ReactNode }) {
  return (
    <EmptyState
      icon="consultants"
      title="Aucun consultant"
      description="Commencez par ajouter votre premier consultant pour suivre son parcours de soins."
      action={action}
      size="lg"
    />
  );
}

export function NoAppointments({ action }: { action?: React.ReactNode }) {
  return (
    <EmptyState
      icon="appointments"
      title="Aucun rendez-vous"
      description="Vous n'avez aucun rendez-vous programmé. Planifiez votre premier rendez-vous."
      action={action}
    />
  );
}

export function NoMessages({ action }: { action?: React.ReactNode }) {
  return (
    <EmptyState
      icon="messages"
      title="Aucun message"
      description="Vous n'avez pas encore de conversations. Les messages de vos consultants apparaîtront ici."
      action={action}
    />
  );
}

export function NoNotifications() {
  return (
    <EmptyState
      icon="notifications"
      title="Aucune notification"
      description="Vous êtes à jour ! Les nouvelles notifications apparaîtront ici."
      size="sm"
    />
  );
}

export function NoSearchResults({ query }: { query?: string }) {
  return (
    <EmptyState
      icon="search"
      title="Aucun résultat"
      description={
        query
          ? `Aucun résultat trouvé pour "${query}". Essayez avec d'autres termes.`
          : "Aucun résultat trouvé. Essayez avec d'autres critères de recherche."
      }
    />
  );
}
