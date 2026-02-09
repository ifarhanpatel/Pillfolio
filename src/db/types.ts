export type Patient = {
  id: string;
  name: string;
  relationship: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Prescription = {
  id: string;
  patientId: string;
  photoUri: string;
  doctorName: string;
  doctorSpecialty: string | null;
  condition: string;
  tags: string[];
  visitDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewPatientInput = {
  name: string;
  relationship?: string | null;
};

export type UpdatePatientInput = {
  name: string;
  relationship?: string | null;
};

export type NewPrescriptionInput = {
  patientId: string;
  photoUri: string;
  doctorName: string;
  doctorSpecialty?: string | null;
  condition: string;
  tags: string[];
  visitDate: string;
  notes?: string | null;
};

export type UpdatePrescriptionInput = {
  photoUri?: string;
  doctorName?: string;
  doctorSpecialty?: string | null;
  condition?: string;
  tags?: string[];
  visitDate?: string;
  notes?: string | null;
};
