'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { showToast } from '@/components/ui/Toaster';
import type { PractitionerBillingSettings } from '@/lib/invoicing/types';
import { Save } from 'lucide-react';

interface Props {
  settings: PractitionerBillingSettings | null;
  authToken: string;
  onSaved: () => void;
}

export function BillingSettingsForm({ settings, authToken, onSaved }: Props) {
  const [siret, setSiret] = useState('');
  const [adresse, setAdresse] = useState('');
  const [mentionTva, setMentionTva] = useState(
    'TVA non applicable, art. 293 B du CGI'
  );
  const [statutJuridique, setStatutJuridique] = useState('Micro-entrepreneur');
  const [libelleDocument, setLibelleDocument] = useState('facture');
  const [emailAutoConsultant, setEmailAutoConsultant] = useState(true);
  const [emailCopiePraticien, setEmailCopiePraticien] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setSiret(settings.siret);
      setAdresse(settings.adresse_facturation);
      setMentionTva(settings.mention_tva);
      setStatutJuridique(settings.statut_juridique);
      setLibelleDocument(settings.libelle_document);
      setEmailAutoConsultant(settings.email_auto_consultant);
      setEmailCopiePraticien(settings.email_copie_praticien);
    }
  }, [settings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation
    if (!/^\d{14}$/.test(siret)) {
      showToast.error('Le SIRET doit contenir exactement 14 chiffres');
      return;
    }
    if (adresse.length < 10) {
      showToast.error('L\'adresse de facturation est requise (minimum 10 caracteres)');
      return;
    }
    if (mentionTva.length < 5) {
      showToast.error('La mention TVA est requise');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/invoicing/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          siret,
          adresse_facturation: adresse,
          mention_tva: mentionTva,
          statut_juridique: statutJuridique,
          libelle_document: libelleDocument,
          email_auto_consultant: emailAutoConsultant,
          email_copie_praticien: emailCopiePraticien,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      showToast.success('Parametres enregistres');
      onSaved();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Erreur lors de la sauvegarde'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations legales</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="SIRET (14 chiffres)"
            value={siret}
            onChange={(e) => setSiret(e.target.value.replace(/\D/g, ''))}
            placeholder="12345678901234"
            maxLength={14}
            pattern="\d{14}"
            required
          />

          <Textarea
            placeholder="Adresse de facturation"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            className="min-h-[80px]"
          />
          <span className="text-[13px] font-medium text-stone block -mt-2">
            Adresse de facturation
          </span>

          <Input
            label="Mention TVA"
            value={mentionTva}
            onChange={(e) => setMentionTva(e.target.value)}
          />

          <Select
            label="Statut juridique"
            value={statutJuridique}
            onChange={(e) => setStatutJuridique(e.target.value)}
          >
            <option value="Micro-entrepreneur">Micro-entrepreneur</option>
            <option value="EI">Entreprise Individuelle (EI)</option>
            <option value="EIRL">EIRL</option>
            <option value="EURL">EURL</option>
            <option value="SASU">SASU</option>
          </Select>

          <Select
            label="Type de document"
            value={libelleDocument}
            onChange={(e) => setLibelleDocument(e.target.value)}
          >
            <option value="facture">Facture</option>
            <option value="recu">Recu</option>
            <option value="facture-recu">Facture-Recu</option>
          </Select>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={emailAutoConsultant}
                onChange={(e) => setEmailAutoConsultant(e.target.checked)}
                className="rounded border-sage/30 text-sage focus:ring-sage/30"
              />
              <span className="text-sm text-charcoal">
                Envoyer automatiquement la facture par email au consultant
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={emailCopiePraticien}
                onChange={(e) => setEmailCopiePraticien(e.target.checked)}
                className="rounded border-sage/30 text-sage focus:ring-sage/30"
              />
              <span className="text-sm text-charcoal">
                Recevoir une copie de chaque facture envoyee
              </span>
            </label>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              loading={loading}
              icon={<Save className="h-4 w-4" />}
            >
              Enregistrer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
