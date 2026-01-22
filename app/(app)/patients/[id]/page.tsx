import { notFound } from 'next/navigation';
import { mockPatients } from '../../../../lib/mock';
import { PatientTabs } from '../../../../components/patients/PatientTabs';

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const patient = mockPatients.find((p) => p.id === params.id);
  if (!patient) return notFound();

  return (
    <div className="space-y-4">
      <PatientTabs patient={patient} />
    </div>
  );
}
