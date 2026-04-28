export interface RealisationActe {
  id: number;
  dateRealisation: string;
  resultat: string;
  observation?: string;
  statut: string;
  actePmaId: number;
  userId: number;
}
