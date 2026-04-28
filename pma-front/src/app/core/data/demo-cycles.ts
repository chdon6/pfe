import type { CyclePma, CycleEtapeHistorique } from '../models';

/** Cycles démo — `patientId` alignés sur `DEMO_PATIENTS` (99001–99004). */
export const DEMO_CYCLE_PMA: readonly CyclePma[] = [
  {
    id: 98501,
    demo: true,
    phase: 'Stimulation ovarienne',
    statutCycle: 'en_cours',
    etapeCourante: '3/10',
    dateDebut: '2026-03-15T08:00:00',
    derniereMiseAJour: '2026-04-10T10:00:00',
    patientId: 99001,
    resultatTestGrossesse: 'en_attente',
  },
  {
    id: 98502,
    demo: true,
    phase: 'Cryoconservation',
    statutCycle: 'en_cours',
    etapeCourante: 'Stockage',
    dateDebut: '2026-03-20T08:00:00',
    derniereMiseAJour: '2026-04-01T10:00:00',
    patientId: 99002,
    resultatTestGrossesse: 'en_attente',
  },
  {
    id: 98503,
    demo: true,
    phase: 'Bilan andrologique',
    statutCycle: 'brouillon',
    etapeCourante: 'initialisation',
    dateDebut: '2026-03-18T08:00:00',
    derniereMiseAJour: '2026-03-18T08:00:00',
    patientId: 99003,
    resultatTestGrossesse: 'en_attente',
  },
  {
    id: 98504,
    demo: true,
    phase: 'Insémination',
    statutCycle: 'en_cours',
    etapeCourante: 'suivi',
    dateDebut: '2026-02-01T08:00:00',
    derniereMiseAJour: '2026-04-05T10:00:00',
    patientId: 99004,
    resultatTestGrossesse: 'en_attente',
  },
];

const DEMO_HISTORIQUE_98501: CycleEtapeHistorique[] = [
  {
    id: 98001,
    etape: 'Consultation initiale',
    statut: 'realise',
    dateEtape: '2026-03-15T09:30:00',
    observation: 'Démo — entrée en parcours FIV',
    cyclePmaId: 98501,
  },
  {
    id: 98002,
    etape: 'Stimulation ovarienne',
    statut: 'en_cours',
    dateEtape: '2026-03-18T08:00:00',
    cyclePmaId: 98501,
  },
];

export function demoHistoriqueForCycle(cycleId: number): CycleEtapeHistorique[] {
  if (cycleId === 98501) return [...DEMO_HISTORIQUE_98501];
  return [];
}
