import type { ElementBiologique } from '../models';

/**
 * Éléments biologiques « cryo » fictifs pour les patients démo (voir `environment.useDemoData`).
 * Ids 901xx pour limiter les collisions avec l’API.
 */
export const DEMO_ELEMENTS_CRYO: readonly ElementBiologique[] = [
  {
    id: 90101,
    typeElement: 'Sperme cryoconservé',
    dateCreation: '2026-03-01T10:00:00.000Z',
    numeroTube: 'T-DEMO-99001-A',
    codeBarre: 'CRYO-DEMO-99001-01',
    patientId: 99001,
  },
  {
    id: 90102,
    typeElement: 'Embryons vitrifiés (paillettes)',
    dateCreation: '2026-03-15T14:30:00.000Z',
    numeroTube: 'T-DEMO-99001-B',
    codeBarre: 'CRYO-DEMO-99001-02',
    patientId: 99001,
  },
  {
    id: 90103,
    typeElement: 'Ovocytes vitrifiés',
    dateCreation: '2026-04-01T09:00:00.000Z',
    numeroTube: 'T-DEMO-99002-01',
    codeBarre: 'CRYO-DEMO-99002-01',
    patientId: 99002,
  },
  {
    id: 90104,
    typeElement: 'Sperme — congélation azote',
    dateCreation: '2026-03-20T11:15:00.000Z',
    numeroTube: 'T-DEMO-99003-01',
    codeBarre: 'CRYO-DEMO-99003-01',
    patientId: 99003,
  },
  {
    id: 90105,
    typeElement: 'Embryons congelés',
    dateCreation: '2026-02-10T16:45:00.000Z',
    numeroTube: 'T-DEMO-99004-01',
    codeBarre: 'CRYO-DEMO-99004-01',
    patientId: 99004,
  },
];
