/** Ligne de journal d’audit identitovigilance (CDC §2.2 : date, heure, utilisateur, poste). */
export interface AuditJournalEntry {
  id: string;
  dateHeure: string;
  numDossier?: string;
  action: string;
  couple: string;
  detail: string;
  operateur: string;
  poste: string;
  statut: 'OK' | 'ALERTE';
}
