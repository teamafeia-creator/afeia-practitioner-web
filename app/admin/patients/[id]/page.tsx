'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { PatientActivationBadge } from '@/components/admin/PatientActivationBadge';
import { PatientEngagementSection } from '@/components/admin/PatientEngagementSection';
import { PatientCodeSection } from '@/components/admin/PatientCodeSection';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

type PatientDetail = {
  id: string;
  practitioner_id: string | null;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  age: number | null;
  city: string | null;
  status: string;
  is_premium: boolean;
  activated: boolean;
  activated_at: string | null;
  circular_enabled: boolean;
  last_circular_sync_at: string | null;
  last_circular_sync_status: string | null;
  source: string | null;
  created_at: string;
  updated_at: string | null;
};

type PractitionerInfo = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type ActivationInfo = {
  status: 'activated' | 'pending' | 'expired';
  code: string | null;
  generated_at: string | null;
  used_at: string | null;
  expires_at: string | null;
  generated_by_practitioner_id: string | null;
};

type EngagementInfo = {
  last_activity: string | null;
  journal_entries_count: number;
  journal_frequency: number;
  last_journal_entry: string | null;
  messages_count: number;
  last_message: string | null;
  questionnaires_count: number;
  last_questionnaire: string | null;
  plans_count: number;
};

type PatientPageData = {
  patient: PatientDetail;
  practitioner: PractitionerInfo | null;
  activation: ActivationInfo;
  engagement: EngagementInfo;
};

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AdminPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<PatientPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPatient() {
      try {
        const response = await fetch(`/api/admin/patients/${id}`, {
          credentials: 'include',
        });

        if (!isMounted) return;

        if (!response.ok) {
          setError('Patient non trouve.');
          setLoading(false);
          return;
        }

        const json = await response.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err) {
        console.error('[admin] patient detail fetch error:', err);
        if (isMounted) setError('Erreur de chargement.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPatient();
    return () => { isMounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/admin/patients')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux patients
        </button>
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">{error ?? 'Patient non trouve.'}</p>
        </div>
      </div>
    );
  }

  const { patient, practitioner, activation, engagement } = data;

  return (
    <div className="space-y-6">
      {/* Back bar */}
      <button
        onClick={() => router.push('/admin/patients')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux patients
      </button>

      {/* Header */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-4">
          {/* Initials avatar */}
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-sage-700 font-semibold text-lg shrink-0">
            {getInitials(patient.full_name)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-slate-800">
                {patient.full_name}
              </h1>
              <span
                className={
                  patient.is_premium
                    ? 'inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700'
                    : 'inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600'
                }
              >
                {patient.is_premium ? 'Premium' : 'Standard'}
              </span>
              <PatientActivationBadge status={activation.status} />
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {patient.email ?? '—'}
            </div>
            <div className="mt-1 flex items-center gap-4 text-xs text-slate-400">
              <span>Inscrit(e) le {formatDate(patient.created_at)}</span>
              {practitioner && (
                <span className="flex items-center gap-1">
                  Praticien :{' '}
                  <Link
                    href={`/admin/practitioners/${practitioner.id}`}
                    className="text-sage-600 hover:text-sage-700 hover:underline"
                  >
                    {practitioner.full_name ?? practitioner.email}
                  </Link>
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0">
            {practitioner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/admin/practitioners/${practitioner.id}`)}
                icon={<ExternalLink className="h-3.5 w-3.5" />}
              >
                Voir le praticien
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Profile section */}
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Profil</h3>
            <dl className="space-y-3">
              <ProfileRow label="Nom complet" value={patient.full_name} />
              <ProfileRow label="Email" value={patient.email} />
              <ProfileRow label="Telephone" value={patient.phone} />
              {patient.age && <ProfileRow label="Age" value={`${patient.age} ans`} />}
              {patient.city && <ProfileRow label="Ville" value={patient.city} />}
              <ProfileRow label="Date de creation" value={formatDate(patient.created_at)} />
              <ProfileRow
                label="Praticien associe"
                value={
                  practitioner ? (
                    <Link
                      href={`/admin/practitioners/${practitioner.id}`}
                      className="text-sage-600 hover:text-sage-700 hover:underline"
                    >
                      {practitioner.full_name ?? practitioner.email}
                    </Link>
                  ) : '—'
                }
              />
              <ProfileRow
                label="Statut"
                value={patient.is_premium ? 'Premium' : 'Standard'}
              />
              <ProfileRow label="Source" value={patient.source ?? 'manual'} />
            </dl>
          </div>

          {/* Activation code section */}
          <PatientCodeSection
            activation={activation}
            practitionerName={practitioner?.full_name ?? null}
            patientId={patient.id}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Engagement section */}
          <PatientEngagementSection
            engagement={engagement}
            circularEnabled={patient.circular_enabled}
            lastCircularSyncAt={patient.last_circular_sync_at}
          />
        </div>
      </div>
    </div>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-slate-50 last:border-0">
      <dt className="text-sm text-slate-500 w-40 shrink-0">{label}</dt>
      <dd className="text-sm text-slate-800">{value ?? '—'}</dd>
    </div>
  );
}
