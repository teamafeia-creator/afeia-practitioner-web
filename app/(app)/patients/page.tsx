'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { getPatients } from '../../../lib/queries';
import type { Patient } from '../../../lib/types';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await getPatients();
      setPatients(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.city?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-warmgray">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Patients</h1>
          <p className="text-sm text-warmgray">{patients.length} patient(s) au total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="cta" onClick={() => alert('Création patient (a venir)')}>+ Nouveau patient</Button>
        </div>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Rechercher par nom ou ville..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Liste des patients</h2>
        </CardHeader>
        <CardContent>
          {filteredPatients.length === 0 ? (
            <p className="text-sm text-warmgray">Aucun patient trouve</p>
          ) : (
            <div className="space-y-3">
              {filteredPatients.map((patient) => (
                <Link
                  key={patient.id}
                  href={`/patients/${patient.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl bg-white p-4 ring-1 ring-black/5 hover:bg-sable/30 transition"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-charcoal">{patient.name}</p>
                    <p className="text-sm text-warmgray">
                      {patient.age} ans • {patient.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={patient.is_premium ? 'premium' : 'info'}>
                      {patient.is_premium ? 'Premium' : 'Standard'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
