'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { getPatients, getNotifications } from '../../../lib/queries';
import type { Patient, Notification } from '../../../lib/types';

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [notifications, setNotifications] = useState<(Notification & { patient?: Patient })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [patientsData, notificationsData] = await Promise.all([
        getPatients(),
        getNotifications()
      ]);
      setPatients(patientsData);
      setNotifications(notificationsData);
      setLoading(false);
    }
    loadData();
  }, []);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  });

  const premiumPatients = patients.filter((p) => p.is_premium);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-warmgray">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Tableau de bord</h1>
          <p className="text-sm text-warmgray">{today} — apercu rapide</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => alert('Création patient (a venir)')}>+ Nouveau patient</Button>
          <Button variant="cta" onClick={() => alert('Agenda / prise de RDV (a venir)')}>Prise de RDV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">Notifications</h2>
              <p className="text-xs text-warmgray">Questionnaires, Circular, messages</p>
            </div>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-sm text-warmgray">Aucune notification</p>
            ) : (
              <ul className="space-y-3">
                {notifications.slice(0, 5).map((n) => (
                  <li key={n.id} className="flex items-start gap-3 rounded-xl bg-sable/60 p-3 ring-1 ring-black/5">
                    <div className={`mt-1 h-2 w-2 rounded-full ${n.level === 'attention' ? 'bg-gold' : 'bg-teal'}`} />
                    <div className="min-w-0">
                      <p className="text-sm text-charcoal">{n.title}</p>
                      <p className="text-xs text-warmgray">{n.description}</p>
                      {n.patient_id && (
                        <Link className="mt-1 inline-block text-xs text-teal hover:underline" href={`/patients/${n.patient_id}`}>
                          Ouvrir le dossier
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Patients */}
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">Patients</h2>
              <p className="text-xs text-warmgray">{patients.length} patient(s) au total</p>
            </div>
          </CardHeader>
          <CardContent>
            {patients.length === 0 ? (
              <p className="text-sm text-warmgray">Aucun patient</p>
            ) : (
              <ul className="space-y-3">
                {patients.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-black/5">
                    <div className="min-w-0">
                      <Link className="truncate text-sm font-medium text-charcoal hover:underline" href={`/patients/${p.id}`}>
                        {p.name}
                      </Link>
                      <p className="truncate text-xs text-warmgray">{p.city} • {p.age} ans</p>
                    </div>
                    <Badge variant={p.is_premium ? 'premium' : 'info'}>
                      {p.is_premium ? 'Premium' : 'Standard'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Link href="/patients" className="inline-block w-full">
                <Button variant="secondary" className="w-full">Voir tous les patients</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Premium (Circular) */}
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">Premium (Circular)</h2>
              <p className="text-xs text-warmgray">Sommeil - HRV - Activite</p>
            </div>
          </CardHeader>
          <CardContent>
            {premiumPatients.length === 0 ? (
              <p className="text-sm text-warmgray">Aucun patient premium</p>
            ) : (
              <div className="space-y-3">
                {premiumPatients.slice(0, 3).map((p) => (
                  <div key={p.id} className="rounded-xl bg-sable/60 p-3 ring-1 ring-black/5">
                    <div className="flex items-center justify-between">
                      <Link className="text-sm font-medium text-charcoal hover:underline" href={`/patients/${p.id}`}>{p.name}</Link>
                      <Badge variant="premium">Premium</Badge>
                    </div>
                    <p className="mt-1 text-xs text-warmgray">{p.city}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Raccourcis */}
      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold">Raccourcis</h2>
            <p className="text-xs text-warmgray">Actions rapides</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-sable/60 p-4 ring-1 ring-black/5">
              <p className="text-sm font-semibold text-charcoal">Preparer une seance</p>
              <p className="mt-1 text-sm text-warmgray">Analyser anamnese et dernieres entrees avant consultation.</p>
            </div>
            <div className="rounded-xl bg-sable/60 p-4 ring-1 ring-black/5">
              <p className="text-sm font-semibold text-charcoal">Envoyer un message</p>
              <p className="mt-1 text-sm text-warmgray">Ton neutre, doux, non medicalisant.</p>
            </div>
            <div className="rounded-xl bg-sable/60 p-4 ring-1 ring-black/5">
              <p className="text-sm font-semibold text-charcoal">Publier un plan</p>
              <p className="mt-1 text-sm text-warmgray">Versionner, publier, et suivre l adhesion au quotidien.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
