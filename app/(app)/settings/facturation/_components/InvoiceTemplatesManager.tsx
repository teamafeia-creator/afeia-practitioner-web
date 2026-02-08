'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toaster';
import { formatCurrency, generateTemplateId } from '@/lib/invoicing/utils';
import type { InvoiceTemplate } from '@/lib/invoicing/types';
import { Plus, Wand2 } from 'lucide-react';

interface Props {
  templates: InvoiceTemplate[];
  authToken: string;
  onRefresh: () => void;
}

export function InvoiceTemplatesManager({
  templates,
  authToken,
  onRefresh,
}: Props) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [montant, setMontant] = useState<number>(60);
  const [duree, setDuree] = useState<number>(60);
  const [loading, setLoading] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  async function handleInitDefaults() {
    setLoading(true);
    try {
      const response = await fetch('/api/invoicing/templates', {
        method: 'POST',
        headers,
        body: JSON.stringify({ init_defaults: true }),
      });

      if (!response.ok) throw new Error('Erreur');

      showToast.success('Templates par defaut crees');
      onRefresh();
    } catch {
      showToast.error('Erreur lors de la creation des templates');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setLoading(true);
    try {
      const response = await fetch('/api/invoicing/templates', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: generateTemplateId(label),
          label,
          description,
          montant_defaut: montant,
          duree_defaut: duree || null,
          ordre: templates.length + 1,
          is_active: true,
        }),
      });

      if (!response.ok) throw new Error('Erreur');

      showToast.success('Template cree');
      setShowCreateModal(false);
      setLabel('');
      setDescription('');
      setMontant(60);
      setDuree(60);
      onRefresh();
    } catch {
      showToast.error('Erreur lors de la creation du template');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Templates de facturation</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-warmgray mb-4">
                Aucun template configure. Creez des templates pour accelerer
                la facturation.
              </p>
              <Button
                variant="outline"
                size="sm"
                icon={<Wand2 className="h-4 w-4" />}
                onClick={handleInitDefaults}
                loading={loading}
              >
                Creer les templates par defaut
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 border border-neutral-100"
                >
                  <div>
                    <p className="text-sm font-medium text-charcoal">
                      {template.label}
                    </p>
                    <p className="text-xs text-warmgray">
                      {template.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-charcoal">
                      {formatCurrency(template.montant_defaut)}
                    </p>
                    {template.duree_defaut && (
                      <p className="text-xs text-warmgray">
                        {template.duree_defaut} min
                      </p>
                    )}
                  </div>
                </div>
              ))}

              <Button
                variant="ghost"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setShowCreateModal(true)}
                className="w-full"
              >
                Ajouter un template
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nouveau template"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nom du template"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Premiere consultation"
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Bilan de vitalite + conseillancier"
          />
          <Input
            label="Montant par defaut (EUR)"
            type="number"
            step="0.01"
            min="0"
            value={montant}
            onChange={(e) => setMontant(parseFloat(e.target.value) || 0)}
          />
          <Input
            label="Duree par defaut (minutes)"
            type="number"
            min="0"
            value={duree}
            onChange={(e) => setDuree(parseInt(e.target.value) || 0)}
          />
        </div>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setShowCreateModal(false)}
          >
            Annuler
          </Button>
          <Button onClick={handleCreate} loading={loading}>
            Creer
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
