export interface Consentement {
  id: number;
  type: string;
  dateSignature: string;
  patientId: number;
  photoPath?: string | null;
  cinHommePath?: string | null;
  cinFemmePath?: string | null;
  contratMariagePath?: string | null;
}
