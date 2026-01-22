/* eslint-disable react/no-unescaped-entities */
'use client';

import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-charcoal">Paramètres</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold">Profil professionnel</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-warmgray">Nom</label>
                <Input defaultValue="Naturopathe AFEIA" />
              </div>
              <div>
                <label className="text-xs font-medium text-warmgray">Email</label>
                <Input defaultValue="pro@afeia.app" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-warmgray">Lien Calendly</label>
              <Input placeholder="https://calendly.com/..." />
              <p className="mt-1 text-xs text-warmgray">Intégration prévue : gestion des disponibilités et réservations.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="cta" onClick={() => alert('✅ Enregistré (mock)')}>Enregistrer</Button>
              <Button variant="secondary" onClick={() => alert('📄 Documents pro (à brancher)')}>Gérer mes documents</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Abonnement</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-charcoal">Plan</div>
              <Badge variant="premium">Premium</Badge>
            </div>
            <div className="rounded-2xl bg-sable p-3 text-sm text-marine ring-1 ring-black/5">
              Circular (sommeil, HRV, activité) activé pour les patients Premium.
            </div>
            <Button variant="secondary" onClick={() => alert('💳 Gestion paiement (à brancher)')}>Gérer la facturation</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
