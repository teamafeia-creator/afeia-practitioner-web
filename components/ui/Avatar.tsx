'use client';

import { cn } from '../../lib/cn';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | 'away';
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-teal',
    'bg-emerald-500',
    'bg-primary-500',
    'bg-accent-orange',
    'bg-accent-pink',
    'bg-sage',
    'bg-aubergine'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  status,
  className
}: AvatarProps) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg'
  };

  const statusColors = {
    online: 'bg-accent-success',
    offline: 'bg-neutral-400',
    busy: 'bg-accent-danger',
    away: 'bg-accent-warning'
  };

  const statusSizes = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
    xl: 'h-4 w-4'
  };

  const showFallback = !src;
  const initials = name ? getInitials(name) : null;
  const bgColor = name ? getColorFromName(name) : 'bg-neutral-200';

  return (
    <div className={cn('relative inline-flex', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full overflow-hidden ring-2 ring-white shadow-sm',
          sizes[size],
          showFallback && bgColor
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="h-full w-full object-cover"
          />
        ) : initials ? (
          <span className="font-semibold text-white">{initials}</span>
        ) : (
          <User className="h-1/2 w-1/2 text-neutral-500" />
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white',
            statusColors[status],
            statusSizes[size]
          )}
        />
      )}
    </div>
  );
}

interface AvatarGroupProps {
  avatars: Array<{ src?: string; name?: string }>;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarGroup({ avatars, max = 4, size = 'md' }: AvatarGroupProps) {
  const displayed = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const overlapSizes = {
    sm: '-ml-2',
    md: '-ml-3',
    lg: '-ml-4'
  };

  return (
    <div className="flex items-center">
      {displayed.map((avatar, index) => (
        <Avatar
          key={index}
          src={avatar.src}
          name={avatar.name}
          size={size}
          className={index > 0 ? overlapSizes[size] : ''}
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-neutral-100 ring-2 ring-white font-medium text-neutral-600',
            size === 'sm' && 'h-8 w-8 text-xs -ml-2',
            size === 'md' && 'h-10 w-10 text-sm -ml-3',
            size === 'lg' && 'h-12 w-12 text-base -ml-4'
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
