'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Calendar,
  MessageSquare,
  Users,
  FileText,
  Search,
  Inbox,
  Bell,
  Clock,
  ClipboardList,
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
  | 'appointments'
  | 'clipboard';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: PresetIcon | React.ReactNode;
  image?: string;
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
  appointments: Clock,
  clipboard: ClipboardList
};

export function EmptyState({
  title,
  description,
  icon,
  image,
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
      transition={{ duration: 0.2 }}
      className={cn(
        'flex flex-col items-center gap-4 rounded-xl bg-white border border-divider text-center shadow-card',
        sizeStyles[size].container,
        className
      )}
    >
      {/* Image or Icon */}
      {image ? (
        <div className="w-28 h-28 rounded-full overflow-hidden mb-2 opacity-50">
          <Image
            src={image}
            alt=""
            width={112}
            height={112}
            className="object-cover w-full h-full"
          />
        </div>
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl bg-sage-light',
            sizeStyles[size].iconWrapper
          )}
        >
          {IconComponent ? (
            <IconComponent
              className={cn('text-sage', sizeStyles[size].icon)}
              strokeWidth={1.5}
            />
          ) : typeof icon === 'string' ? (
            <span className="text-3xl">{icon}</span>
          ) : (
            icon
          )}
        </div>
      )}

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
              'text-stone max-w-sm mx-auto',
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
          transition={{ delay: 0.1 }}
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
      image="/images/palm-minimal.jpg"
      title="Aucun consultant"
      description="Commencez par ajouter votre premier consultant pour suivre son parcours."
      action={action}
      size="lg"
    />
  );
}

export function NoAppointments({ action }: { action?: React.ReactNode }) {
  return (
    <EmptyState
      image="/images/sage-tisane.jpg"
      title="Aucun rendez-vous"
      description="Vous n'avez aucun rendez-vous programme. Planifiez votre premiere seance."
      action={action}
    />
  );
}

export function NoMessages({ action }: { action?: React.ReactNode }) {
  return (
    <EmptyState
      image="/images/eucalyptus-minimal.jpg"
      title="Aucun message"
      description="Vous n'avez pas encore de conversations. Les messages de vos consultants apparaitront ici."
      action={action}
    />
  );
}

export function NoNotifications() {
  return (
    <EmptyState
      icon="notifications"
      title="Aucune notification"
      description="Vous etes a jour ! Les nouvelles notifications apparaitront ici."
      size="sm"
    />
  );
}

export function NoSearchResults({ query }: { query?: string }) {
  return (
    <EmptyState
      icon="search"
      title="Aucun resultat"
      description={
        query
          ? `Aucun resultat trouve pour "${query}". Essayez avec d'autres termes.`
          : "Aucun resultat trouve. Essayez avec d'autres criteres de recherche."
      }
    />
  );
}
