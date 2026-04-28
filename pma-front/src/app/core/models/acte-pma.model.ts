export interface ActePma {
  id: number;
  /** Code : fiv, icsi, etc. */
  typeActe: string;
  libelle: string;
  observation?: string;
  /** a_realiser | en_cours | realise | annule */
  statutRealisation: string;
  patientId: number;
}
