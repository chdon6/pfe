export interface RendezVous {
  id: number;
  dateHeure: string;
  motif: string;
  statut: string;
  patientId: number;
}

export interface RdvFilters {
  date?: string;
  patientId?: number;
  statut?: string;
}

export const RDV_STATUTS = [
  { value: '', label: 'Toutes les décisions' },
  { value: 'planifie', label: 'En attente biologiste' },
  { value: 'confirme', label: 'Confirmé' },
  { value: 'termine', label: 'Résultat disponible' },
  { value: 'annule', label: 'Refusé / annulé' },
] as const;

/** Libellés affichés dans le calendrier (décision du biologiste : Oui / Non). */
export const RDV_DECISION_BIO: Record<string, { label: string; css: string }> = {
  planifie: { label: 'En attente', css: 'decision-attente' },
  confirme: { label: 'Oui', css: 'decision-confirme' },
  termine: { label: 'Oui', css: 'decision-confirme' },
  annule: { label: 'Non', css: 'decision-annule' },
};

export function decisionBioForStatut(statut: string): { label: string; css: string } {
  const key = statut.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return RDV_DECISION_BIO[key] ?? { label: statut, css: 'decision-attente' };
}
