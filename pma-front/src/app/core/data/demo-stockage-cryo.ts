import type { Bonbonne, Canister, PailleTube } from '../models';
import { composeLibelleVisotube } from '../constants/visotube-couleurs';

/** Bonbonnes démo — ids 8801+ */
export const DEMO_BONBONNES_CRYO: readonly Bonbonne[] = [
  {
    id: 8801,
    code: 'BB-EMB-01',
    couleur: '#0d9488',
    typeStockage: 'Azote liquide — embryons / ovocytes',
    temperature: '-196°C',
  },
  {
    id: 8802,
    code: 'BB-SP-01',
    couleur: '#dc2626',
    typeStockage: 'Azote liquide — sperme',
    temperature: '-196°C',
  },
];

export const DEMO_CANISTERS_CRYO: readonly Canister[] = [
  { id: 8811, numero: 3, bonbonneId: 8801 },
  { id: 8812, numero: 11, bonbonneId: 8802 },
  { id: 8813, numero: 6, bonbonneId: 8801 },
];

/**
 * Paillettes / visotubes démo — code-barres alignés sur `DEMO_ELEMENTS_CRYO`.
 * `cyclePmaId` = cycles démo 98501–98504 (voir `demo-cycles.ts`).
 */
export const DEMO_PAILLES_CRYO: readonly PailleTube[] = [
  {
    id: 88201,
    codeBarre: 'CRYO-DEMO-99001-01',
    typeContenu: 'Sperme cryoconservé',
    couleurVisotube: composeLibelleVisotube('mm10', 'Bleu'),
    cyclePmaId: 98501,
    canisterId: 8812,
    position: 5,
  },
  {
    id: 88202,
    codeBarre: 'CRYO-DEMO-99001-02',
    typeContenu: 'Embryons vitrifiés',
    couleurVisotube: composeLibelleVisotube('mm71', 'Violet'),
    cyclePmaId: 98501,
    canisterId: 8811,
    position: 8,
  },
  {
    id: 88203,
    codeBarre: 'CRYO-DEMO-99002-01',
    typeContenu: 'Ovocytes vitrifiés',
    couleurVisotube: composeLibelleVisotube('mm10', 'Rose'),
    cyclePmaId: 98502,
    canisterId: 8813,
    position: 2,
  },
  {
    id: 88204,
    codeBarre: 'CRYO-DEMO-99003-01',
    typeContenu: 'Sperme cryoconservé',
    couleurVisotube: composeLibelleVisotube('imv_polygonal', 'Orange'),
    cyclePmaId: 98503,
    canisterId: 8812,
    position: 12,
  },
  {
    id: 88205,
    codeBarre: 'CRYO-DEMO-99004-01',
    typeContenu: 'Embryons congelés',
    couleurVisotube: composeLibelleVisotube('mm10', 'Vert'),
    cyclePmaId: 98504,
    canisterId: 8811,
    position: 3,
  },
];
