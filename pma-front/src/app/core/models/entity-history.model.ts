export interface EntityHistoryEntry {
  id: string;
  at: string;
  entity: 'patient' | 'cycle';
  entityId: number;
  action: string;
  summary: string;
  actor?: string;
}
