'use client';

import { Star } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/Badge';
import type { Block } from '../../lib/blocks-types';

interface BlockCardProps {
  block: Block;
  onInsert?: (content: string) => void;
  onSelect?: (block: Block) => void;
  onToggleFavorite?: (blockId: string) => void;
  selected?: boolean;
  compact?: boolean;
}

export function BlockCard({
  block,
  onInsert,
  onSelect,
  onToggleFavorite,
  selected = false,
  compact = false,
}: BlockCardProps) {
  const excerpt = block.content.length > 100
    ? block.content.slice(0, 100).trimEnd() + '...'
    : block.content;

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-white p-3 transition-all cursor-pointer',
        selected
          ? 'border-teal/40 ring-2 ring-teal/20 shadow-sm'
          : 'border-teal/10 hover:border-teal/25 hover:shadow-sm'
      )}
      onClick={() => onSelect?.(block)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="truncate text-sm font-medium text-charcoal">
              {block.title}
            </h4>
            {block.source === 'afeia_base' && (
              <Badge variant="info" className="shrink-0 text-[9px] px-1.5 py-0.5">AFEIA</Badge>
            )}
          </div>
          {!compact && (
            <p className="mt-1 text-xs text-warmgray line-clamp-2">{excerpt}</p>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(block.id);
          }}
          className={cn(
            'shrink-0 p-1 rounded transition-colors',
            block.is_favorite
              ? 'text-gold'
              : 'text-warmgray/40 hover:text-gold/70'
          )}
          title={block.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Star className="h-3.5 w-3.5" fill={block.is_favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {!compact && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[10px] text-warmgray">
            {block.usage_count > 0 && (
              <span>{block.usage_count} utilisation{block.usage_count > 1 ? 's' : ''}</span>
            )}
          </div>
          {onInsert && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInsert(block.content);
              }}
              className="shrink-0 rounded-md bg-teal px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-teal-deep"
            >
              Insérer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
