'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';

type Patient = {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  city?: string | null;
  activated?: boolean;
};

type LinkQuestionnaireModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLink: (patientId: string) => Promise<void>;
  questionnaireInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

function getDisplayName(patient: Patient): string {
  if (patient.full_name) return patient.full_name;
  const parts = [patient.first_name, patient.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return patient.email || 'Non renseigné';
}

export function LinkQuestionnaireModal({
  isOpen,
  onClose,
  onLink,
  questionnaireInfo
}: LinkQuestionnaireModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load patients when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPatients();
      // Pre-fill search with questionnaire info
      if (questionnaireInfo?.lastName) {
        setSearch(questionnaireInfo.lastName);
      }
    } else {
      // Reset state when modal closes
      setSelectedPatientId(null);
      setSearch('');
      setError(null);
    }
  }, [isOpen, questionnaireInfo]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('patients')
        .select('id, full_name, first_name, last_name, email, city, activated')
        .eq('practitioner_id', user.id)
        .order('full_name', { ascending: true });

      if (fetchError) {
        console.error('Error loading patients:', fetchError);
        setError('Impossible de charger la liste des patients.');
        return;
      }

      setPatients(data || []);
    } catch (err) {
      console.error('Exception loading patients:', err);
      setError('Erreur lors du chargement des patients.');
    } finally {
      setLoading(false);
    }
  };

  // Filter patients by search
  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((p) =>
      [getDisplayName(p), p.email, p.city].some((value) =>
        value?.toLowerCase().includes(term)
      )
    );
  }, [patients, search]);

  const handleLink = async () => {
    if (!selectedPatientId) return;

    setLinking(true);
    setError(null);
    try {
      await onLink(selectedPatientId);
      onClose();
    } catch (err) {
      console.error('Error linking questionnaire:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la liaison.');
    } finally {
      setLinking(false);
    }
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Associer à un patient existant"
      description="Sélectionnez le patient auquel associer ce questionnaire. Les données du questionnaire seront ajoutées à son anamnèse."
      size="lg"
    >
      <div className="space-y-4">
        {/* Search input */}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email ou ville..."
          autoFocus
        />

        {/* Questionnaire info */}
        {questionnaireInfo && (
          <div className="text-sm text-warmgray bg-teal-light/30 rounded-sm p-3 border border-teal/10">
            <span className="font-medium text-charcoal">Questionnaire de :</span>{' '}
            {questionnaireInfo.firstName} {questionnaireInfo.lastName}
            {questionnaireInfo.email && (
              <span className="text-warmgray"> ({questionnaireInfo.email})</span>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="text-sm text-accent-danger bg-red-50 rounded-sm p-3 border border-red-200">
            {error}
          </div>
        )}

        {/* Patient list */}
        <div className="max-h-[300px] overflow-y-auto rounded-sm border border-teal/15">
          {loading ? (
            <div className="p-4 text-center text-warmgray">
              Chargement des patients...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-4 text-center text-warmgray">
              {search ? 'Aucun patient trouvé.' : 'Aucun patient disponible.'}
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {filteredPatients.map((patient) => {
                const isSelected = patient.id === selectedPatientId;
                const displayName = getDisplayName(patient);
                const isActive = patient.activated !== false;

                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={`w-full p-3 text-left transition hover:bg-teal/5 ${
                      isSelected ? 'bg-teal/10 ring-2 ring-teal ring-inset' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={displayName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-charcoal truncate">
                            {displayName}
                          </span>
                          {!isActive && (
                            <Badge variant="attention" className="text-[10px]">
                              Inactif
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-warmgray truncate">
                          {patient.email}
                          {patient.city && ` • ${patient.city}`}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="text-teal">
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected patient summary */}
        {selectedPatient && (
          <div className="text-sm text-charcoal bg-teal/10 rounded-sm p-3 border border-teal/20">
            Patient selectionne : <strong>{getDisplayName(selectedPatient)}</strong>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={linking}>
          Annuler
        </Button>
        <Button
          variant="primary"
          onClick={handleLink}
          disabled={!selectedPatientId || linking}
          loading={linking}
        >
          Associer le questionnaire
        </Button>
      </ModalFooter>
    </Modal>
  );
}
