export interface ElementBiologique {
  id: number;
  typeElement: string;
  dateCreation: string;
  numeroTube?: string;
  /** Code-barres unique sur l'étiquette du contenant (lié au patient). */
  codeBarre?: string | null;
  patientId: number;
}
