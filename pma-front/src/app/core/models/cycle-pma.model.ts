/** Résultat du β-hCG / test de grossesse en fin de cycle PMA */
export type ResultatTestGrossesse = 'positif' | 'negatif' | 'en_attente';

export interface CyclePma {
  id: number;
  /** Cycle injecté pour les tests (non en base). */
  demo?: boolean;
  phase: string;
  statutCycle: string;
  etapeCourante: string;
  dateDebut: string;
  dateFin?: string;
  derniereMiseAJour: string;
  patientId: number;
  /** Renseigné après le test de grossesse (affichage biologiste / suivi) */
  resultatTestGrossesse?: ResultatTestGrossesse | null;
  /** Biologiste ayant validé le résultat (après saisie positif / négatif). */
  resultatTestSignePar?: string | null;
  /** ISO 8601 — date/heure de signature du résultat. */
  resultatTestSigneLe?: string | null;
}

export interface CycleEtapeHistorique {
  id: number;
  etape: string;
  statut: string;
  dateEtape: string;
  observation?: string;
  cyclePmaId: number;
  userId?: number;
}
