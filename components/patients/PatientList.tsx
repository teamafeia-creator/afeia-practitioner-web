'use client';

import { Card, CardContent, CardHeader } from '../ui/Card';
import type { Patient } from '../../lib/patients/types';
import { formatBirthDate, getPatientDisplayName } from '../../lib/patients/utils';

type Props = {
  patients: Patient[];
};

export function PatientList({ patients }: Props) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold">Liste des patients</h2>
      </CardHeader>
      <CardContent>
        {patients.length === 0 ? (
          <p className="text-sm text-warmgray">Aucun patient trouvé.</p>
        ) : (
          <div className="space-y-3">
            {patients.map((patient) => {
              const displayName = getPatientDisplayName(patient);
              const birthDate = formatBirthDate(patient.date_of_birth);
              return (
                <div
                  key={patient.id}
                  className="flex flex-col gap-2 rounded-xl bg-white p-4 ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-charcoal">{displayName}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-warmgray">
                      {patient.email ? <span>{patient.email}</span> : null}
                      {patient.phone ? <span>{patient.phone}</span> : null}
                      {birthDate ? <span>Né·e le {birthDate}</span> : null}
                      {!patient.email && !patient.phone && !birthDate ? (
                        <span>Aucune information complémentaire.</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-xs text-warmgray">
                    Ajouté le {new Date(patient.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
