'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Edit3,
  Send,
  Link2,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ResourceDetail } from '@/components/resources/ResourceDetail';
import { CATEGORY_LABELS } from '@/components/resources/ResourceCard';
import { getResourceBySlug, deleteResource, assignResourceToConsultant } from '@/lib/queries/resources';
import type { EducationalResource, Consultant } from '@/lib/types';

export default function ResourceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [resource, setResource] = useState<EducationalResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Send-to-consultant modal
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [consultants, setConsultants] = useState<{ id: string; name: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      setUserId(session.user.id);
      const data = await getResourceBySlug(slug);
      setResource(data);
      setLoading(false);
    }
    load();
  }, [slug]);

  async function loadConsultants() {
    const { data } = await supabase
      .from('consultants')
      .select('id, name')
      .is('deleted_at', null)
      .order('name');
    setConsultants(data ?? []);
  }

  async function handleSendToConsultant(consultantId: string) {
    if (!resource || !userId) return;
    setSending(true);
    await assignResourceToConsultant(resource.id, consultantId, userId);
    setSending(false);
    setSendModalOpen(false);
    setSentMessage('Fiche envoyée avec succès');
    setTimeout(() => setSentMessage(''), 3000);
  }

  async function handleDelete() {
    if (!resource || !userId) return;
    if (!confirm('Voulez-vous vraiment supprimer cette fiche ? Cette action est irréversible.')) return;
    setDeleting(true);
    const ok = await deleteResource(resource.id, userId);
    if (ok) {
      router.push('/bibliotheque');
    }
    setDeleting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="text-center py-16">
        <p className="text-stone">Fiche introuvable</p>
        <Button variant="secondary" onClick={() => router.push('/bibliotheque')} className="mt-4">
          Retour à la bibliothèque
        </Button>
      </div>
    );
  }

  const isOwner = resource.source === 'practitioner' && resource.practitioner_id === userId;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => router.push('/bibliotheque')}
          className="flex items-center gap-1 text-sage hover:text-sage/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Bibliothèque
        </button>
        <span className="text-stone">/</span>
        <span className="text-charcoal font-medium truncate">{resource.title}</span>
      </div>

      {sentMessage && (
        <div className="rounded-lg bg-sage/10 px-4 py-2 text-sm text-sage font-medium">
          {sentMessage}
        </div>
      )}

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-charcoal">{resource.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-terracotta/10 px-2.5 py-0.5 text-xs font-medium text-terracotta">
                  {CATEGORY_LABELS[resource.category]}
                </span>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-warmgray capitalize">
                  {resource.content_type === 'video_link' ? 'Vidéo' : resource.content_type}
                </span>
                {resource.read_time_minutes && (
                  <span className="inline-flex items-center gap-1 text-xs text-warmgray">
                    <Clock className="h-3 w-3" />
                    {resource.read_time_minutes} min de lecture
                  </span>
                )}
                {resource.source === 'afeia' && (
                  <Badge variant="info">AFEIA</Badge>
                )}
              </div>
              {resource.summary && (
                <p className="mt-2 text-sm text-stone">{resource.summary}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                variant="secondary"
                onClick={() => {
                  setSendModalOpen(true);
                  loadConsultants();
                }}
              >
                <Send className="mr-1 h-4 w-4" />
                Envoyer
              </Button>
              {isOwner && (
                <>
                  <Button variant="secondary" onClick={() => router.push(`/bibliotheque/nouvelle?edit=${resource.id}`)}>
                    <Edit3 className="mr-1 h-4 w-4" />
                    Modifier
                  </Button>
                  <Button variant="destructive" onClick={handleDelete} loading={deleting}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    Supprimer
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResourceDetail resource={resource} />
        </CardContent>
      </Card>

      {/* Send modal */}
      {sendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/30 backdrop-blur-[4px] px-4">
          <div className="w-full max-w-md rounded-xl glass-card p-6">
            <h2 className="text-lg font-semibold text-charcoal">Envoyer la fiche</h2>
            <p className="mt-1 text-sm text-stone">Sélectionnez un consultant</p>
            <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
              {consultants.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSendToConsultant(c.id)}
                  disabled={sending}
                  className="w-full text-left rounded-lg border border-divider px-4 py-2.5 text-sm text-charcoal hover:bg-cream transition-colors"
                >
                  {c.name}
                </button>
              ))}
              {consultants.length === 0 && (
                <p className="text-sm text-stone py-4 text-center">Aucun consultant</p>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={() => setSendModalOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
