export interface Bonbonne {
  id: number;
  /** Repère précis en salle (ex. BB-EMB-01). */
  code?: string;
  /** Couleur capot / étiquette cuve (nom ou #hex). */
  couleur?: string;
  typeStockage: string;
  temperature: string;
}

export interface Canister {
  id: number;
  numero: number;
  bonbonneId: number;
}

export interface PailleTube {
  id: number;
  codeBarre: string;
  typeContenu: string;
  /** Couleur du visotube / paillette (repère visuel). */
  couleurVisotube?: string | null;
  /** Si présent : tube lié au cycle AMP. Sinon utiliser `patientId`. */
  cyclePmaId?: number | null;
  /** Si pas de cycle : dossier patient (ex. conservation sperme). */
  patientId?: number | null;
  canisterId: number;
  position: number;
}
