export interface LoadedIngredient {
  id?: string;
  name: string;
  // Add other ingredient properties as needed
}

export interface LoadedReference {
  id: string;
  name?: string;
  healthSystem?: string;
  populationType?: string;
  validationStatus?: 'untested' | 'passed' | 'failed' | 'partial';
  validationNotes?: string;
  validatedBy?: string;
  validatedAt?: string | Date;
  updatedAt?: string | Date;
  version?: string;
  // Add other reference properties as needed
}

export interface ValidationData {
  status: 'untested' | 'passed' | 'failed' | 'partial';
  notes: string;
  validatedBy: string | null;
  validatedAt: Date | null;
}