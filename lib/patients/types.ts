export type Patient = {
  id: string;
  practitioner_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type NewPatient = {
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};
