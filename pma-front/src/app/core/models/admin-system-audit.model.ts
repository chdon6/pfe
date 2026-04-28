/** Événement traçable côté administration (connexion, gestion des comptes). Stockage local — léger. */
export interface AdminSystemAuditEntry {
  id: string;
  at: string;
  action: string;
  detail?: string;
  actor?: string;
}
