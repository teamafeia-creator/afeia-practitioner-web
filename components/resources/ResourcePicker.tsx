'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EducationalResource, ResourceCategory } from '../../lib/types';
import { getEducationalResources } from '../../lib/queries/resources';
import { CATEGORY_LABELS, CATEGORY_ICONS } from './ResourceCard';
import { supabase } from '../../lib/supabase';

export function ResourcePicker({
  onSelect,
  onClose,
  filterCategory,
}: {
  onSelect: (resource: EducationalResource) => void;
  onClose: () => void;
  filterCategory?: ResourceCategory;
}) {
  const [resources, setResources] = useState<EducationalResource[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const data = await getEducationalResources(session.user.id, {
        category: filterCategory,
        search: search || undefined,
      });
      setResources(data);
      setLoading(false);
    }
    const timeout = setTimeout(load, 200);
    return () => clearTimeout(timeout);
  }, [filterCategory, search]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-end bg-charcoal/30 backdrop-blur-[4px]"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ x: 320 }}
          animate={{ x: 0 }}
          exit={{ x: 320 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="h-full w-full max-w-sm bg-white shadow-xl flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-divider px-4 py-3">
            <h2 className="text-sm font-semibold text-charcoal">Choisir une fiche éducative</h2>
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-cream transition-colors">
              <X className="h-4 w-4 text-stone" />
            </button>
          </div>

          <div className="px-4 py-2 border-b border-divider">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone" />
              <input
                type="text"
                placeholder="Rechercher une fiche..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-divider bg-cream/50 py-2 pl-9 pr-3 text-sm text-charcoal placeholder:text-stone focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <p className="text-center text-sm text-stone py-8">Chargement...</p>
            ) : resources.length === 0 ? (
              <p className="text-center text-sm text-stone py-8">Aucune fiche trouvée</p>
            ) : (
              resources.map((resource) => {
                const Icon = CATEGORY_ICONS[resource.category];
                return (
                  <button
                    key={resource.id}
                    onClick={() => onSelect(resource)}
                    className="w-full text-left rounded-lg border border-divider bg-white/60 p-3 hover:bg-cream/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="h-4 w-4 text-sage shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-charcoal line-clamp-1">{resource.title}</p>
                        {resource.summary && (
                          <p className="text-xs text-stone line-clamp-1 mt-0.5">{resource.summary}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-terracotta font-medium">
                            {CATEGORY_LABELS[resource.category]}
                          </span>
                          {resource.source === 'afeia' && (
                            <span className="text-[10px] text-sage font-semibold">AFEIA</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
