import { libelleTypeActe, norm } from './acte-pma-types';

export interface ActeCyclePhaseStep {
  key: string;
  label: string;
  offsetJours: number;
}

/** Parcours AMP complet (FIV / ICSI / dons avec culture). */
const PHASES_AMP_CLASSIQUE: ActeCyclePhaseStep[] = [
  { key: 'consultation', label: 'Consultation initiale', offsetJours: 0 },
  { key: 'stimulation', label: 'Stimulation ovarienne', offsetJours: 3 },
  { key: 'monitoring', label: 'Monitoring folliculaire', offsetJours: 10 },
  { key: 'declenchement', label: 'Déclenchement OV', offsetJours: 12 },
  { key: 'ponction', label: 'Ponction ovocytaire', offsetJours: 14 },
  { key: 'fec', label: 'Fécondation (FIV/ICSI)', offsetJours: 15 },
  { key: 'culture', label: 'Culture embryonnaire', offsetJours: 17 },
  { key: 'transfert', label: 'Transfert embryonnaire', offsetJours: 19 },
  { key: 'luteal', label: 'Phase lutéale', offsetJours: 21 },
  { key: 'test', label: 'Test de grossesse', offsetJours: 28 },
];

const PHASES_IIU: ActeCyclePhaseStep[] = [
  { key: 'consultation', label: 'Consultation initiale', offsetJours: 0 },
  { key: 'stimulation', label: 'Stimulation ovarienne (si indiquée)', offsetJours: 3 },
  { key: 'monitoring', label: 'Monitoring', offsetJours: 8 },
  { key: 'preparation', label: 'Préparation sperme / ovocytes', offsetJours: 12 },
  { key: 'insemination', label: 'Insémination intra-utérine', offsetJours: 14 },
  { key: 'luteal', label: 'Phase lutéale', offsetJours: 16 },
  { key: 'test', label: 'Test de grossesse', offsetJours: 28 },
];

const PHASES_PONCTION_SEULE: ActeCyclePhaseStep[] = [
  { key: 'consultation', label: 'Consultation / bilan', offsetJours: 0 },
  { key: 'stimulation', label: 'Stimulation ovarienne', offsetJours: 3 },
  { key: 'monitoring', label: 'Monitoring folliculaire', offsetJours: 10 },
  { key: 'declenchement', label: 'Déclenchement', offsetJours: 12 },
  { key: 'ponction', label: 'Ponction ovocytaire', offsetJours: 14 },
  { key: 'suivi', label: 'Suivi post-ponction', offsetJours: 16 },
];

const PHASES_TRANSFERT_SEUL: ActeCyclePhaseStep[] = [
  { key: 'consultation', label: 'Consultation pré-transfert', offsetJours: 0 },
  { key: 'preparation', label: 'Préparation endométriale', offsetJours: 2 },
  { key: 'transfert', label: 'Transfert embryonnaire', offsetJours: 5 },
  { key: 'luteal', label: 'Phase lutéale', offsetJours: 7 },
  { key: 'test', label: 'Test de grossesse', offsetJours: 21 },
];

const PHASES_CONGELATION_EMBRYONS: ActeCyclePhaseStep[] = [
  { key: 'consultation', label: 'Consultation', offsetJours: 0 },
  { key: 'culture', label: 'Culture / sélection embryons', offsetJours: 3 },
  { key: 'congelation', label: 'Congélation embryons', offsetJours: 5 },
  { key: 'stockage', label: 'Stockage cryogénique', offsetJours: 6 },
  { key: 'suivi', label: 'Suivi dossier', offsetJours: 14 },
];

const PHASES_SPERMOGRAMME: ActeCyclePhaseStep[] = [
  { key: 'consultation', label: 'Consultation andrologique', offsetJours: 0 },
  { key: 'prelevement', label: 'Recueil / prélèvement sperme', offsetJours: 1 },
  { key: 'analyse', label: 'Spermogramme & analyse', offsetJours: 3 },
  { key: 'resultats', label: 'Restitution des résultats', offsetJours: 7 },
];

const PHASES_CRYO_SPERME: ActeCyclePhaseStep[] = [
  { key: 'consultation', label: 'Consultation', offsetJours: 0 },
  { key: 'prelevement', label: 'Recueil sperme', offsetJours: 1 },
  { key: 'preparation', label: 'Préparation laboratoire', offsetJours: 2 },
  { key: 'cryo', label: 'Cryoconservation', offsetJours: 3 },
  { key: 'stockage', label: 'Stockage & traçabilité', offsetJours: 4 },
];

const PHASES_PRELEVEMENT_TESTICULAIRE: ActeCyclePhaseStep[] = [
  { key: 'consultation', label: 'Consultation', offsetJours: 0 },
  { key: 'bilan', label: 'Bilan pré-opératoire', offsetJours: 3 },
  { key: 'prelevement', label: 'Prélèvement (TESA / TESE / PESA / MESA)', offsetJours: 7 },
  { key: 'labo', label: 'Traitement laboratoire', offsetJours: 8 },
  { key: 'cryo', label: 'Cryoconservation (si indiquée)', offsetJours: 10 },
];

const PHASES_DON_OVOCYTES: ActeCyclePhaseStep[] = [
  { key: 'consultation', label: 'Consultation & consentement', offsetJours: 0 },
  { key: 'stimulation', label: 'Stimulation receveuse', offsetJours: 3 },
  { key: 'monitoring', label: 'Monitoring', offsetJours: 10 },
  { key: 'ponction', label: 'Ponction / réception ovocytes', offsetJours: 14 },
  { key: 'fec', label: 'Fécondation don sperme', offsetJours: 15 },
  { key: 'transfert', label: 'Transfert', offsetJours: 19 },
  { key: 'test', label: 'Test de grossesse', offsetJours: 28 },
];

const PHASES_DON_SPERME: ActeCyclePhaseStep[] = [
  { key: 'consultation', label: 'Consultation', offsetJours: 0 },
  { key: 'stimulation', label: 'Stimulation ovarienne', offsetJours: 3 },
  { key: 'ponction', label: 'Ponction ovocytaire', offsetJours: 14 },
  { key: 'fec', label: 'Fécondation (don de sperme)', offsetJours: 15 },
  { key: 'culture', label: 'Culture embryonnaire', offsetJours: 17 },
  { key: 'transfert', label: 'Transfert', offsetJours: 19 },
  { key: 'test', label: 'Test de grossesse', offsetJours: 28 },
];

const PHASES_BIOPSIE: ActeCyclePhaseStep[] = [
  { key: 'consultation', label: 'Consultation', offsetJours: 0 },
  { key: 'culture', label: 'Culture embryonnaire', offsetJours: 5 },
  { key: 'biopsie', label: 'Biopsie embryonnaire (PGT)', offsetJours: 8 },
  { key: 'resultats', label: 'Résultats génétiques', offsetJours: 18 },
  { key: 'transfert', label: 'Transfert (si indiqué)', offsetJours: 25 },
];

const PHASES_AUTRE: ActeCyclePhaseStep[] = PHASES_AMP_CLASSIQUE;

/** Phases du parcours selon l’acte PMA prévu du patient. */
export function phasesForActePma(typeActePma?: string | null): readonly ActeCyclePhaseStep[] {
  const c = norm(typeActePma);
  switch (c) {
    case 'fiv':
    case 'icsi':
      return PHASES_AMP_CLASSIQUE;
    case 'insemination':
      return PHASES_IIU;
    case 'ponction_ovocytes':
      return PHASES_PONCTION_SEULE;
    case 'transfer_embryonnaire':
      return PHASES_TRANSFERT_SEUL;
    case 'congelation_embryons':
      return PHASES_CONGELATION_EMBRYONS;
    case 'biopsie_embryonnaire':
      return PHASES_BIOPSIE;
    case 'don_ovocytes':
      return PHASES_DON_OVOCYTES;
    case 'don_sperme':
      return PHASES_DON_SPERME;
    case 'spermogramme_bilan':
      return PHASES_SPERMOGRAMME;
    case 'preparation_sperme':
      return PHASES_CRYO_SPERME;
    case 'cryoconservation_sperme':
      return PHASES_CRYO_SPERME;
    case 'tesa':
    case 'tese':
    case 'mesa':
    case 'pesa':
      return PHASES_PRELEVEMENT_TESTICULAIRE;
    case 'autre':
    default:
      return PHASES_AUTRE;
  }
}

export function phaseLabelsForActePma(typeActePma?: string | null): string[] {
  return phasesForActePma(typeActePma).map((p) => p.label);
}

export function totalStepsForActePma(typeActePma?: string | null): number {
  return phasesForActePma(typeActePma).length;
}

export function actePmaResumeCourt(typeActePma?: string | null): string {
  const c = norm(typeActePma);
  if (!c) return '';
  return libelleTypeActe(c);
}
