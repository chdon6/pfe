/** Aligné sur l'API /api/actespma/types (ActePmaCatalog). */
export type TypeDossierActe = 'couple' | 'spermogramme' | 'femme_seul';

/** Une entrée catalogue : `dossiers` indique où l'acte est proposé à la création du dossier. */
type ActePmaEntry = {
  code: string;
  label: string;
  dossiers: readonly TypeDossierActe[];
};

const ACTE_PMA_ENTRIES: readonly ActePmaEntry[] = [
  // — Parcours AMP classique (dossier couple)
  { code: 'fiv', label: 'FIV — Fécondation in vitro', dossiers: ['couple', 'femme_seul'] },
  { code: 'icsi', label: 'ICSI — Injection intracytoplasmique', dossiers: ['couple', 'femme_seul'] },
  { code: 'insemination', label: 'IIU — Insémination intra-utérine', dossiers: ['couple', 'femme_seul'] },
  { code: 'ponction_ovocytes', label: 'Ponction ovocytes', dossiers: ['couple', 'femme_seul'] },
  { code: 'transfer_embryonnaire', label: 'Transfert embryonnaire', dossiers: ['couple', 'femme_seul'] },
  { code: 'congelation_embryons', label: 'Congélation d’embryons', dossiers: ['couple', 'femme_seul'] },
  { code: 'biopsie_embryonnaire', label: 'Biopsie embryonnaire (PGT)', dossiers: ['couple', 'femme_seul'] },
  { code: 'don_ovocytes', label: 'AMP avec don d’ovocytes', dossiers: ['couple', 'femme_seul'] },
  { code: 'don_sperme', label: 'AMP avec don de sperme', dossiers: ['couple', 'femme_seul'] },
  // — Actes côté homme (bilan, laboratoire, prélèvements — couple ou homme seul)
  {
    code: 'spermogramme_bilan',
    label: 'Spermogramme — cytologie du sperme / bilan andrologique',
    dossiers: ['couple', 'spermogramme']
  },
  {
    code: 'preparation_sperme',
    label: 'Préparation du sperme (capacitation, swim-up, gradient, lavage)',
    dossiers: ['couple', 'spermogramme']
  },
  {
    code: 'cryoconservation_sperme',
    label: 'Cryoconservation du sperme',
    dossiers: ['couple', 'spermogramme']
  },
  {
    code: 'tesa',
    label: 'TESA — aspiration testiculaire de spermatozoïdes',
    dossiers: ['couple', 'spermogramme']
  },
  {
    code: 'tese',
    label: 'TESE / micro-TESE — biopsie testiculaire (extraction de spermatozoïdes)',
    dossiers: ['couple', 'spermogramme']
  },
  {
    code: 'mesa',
    label: 'MESA — aspiration microchirurgicale du canal déférent / épididyme',
    dossiers: ['couple', 'spermogramme']
  },
  {
    code: 'pesa',
    label: 'PESA — ponction percutanée de l’épididyme',
    dossiers: ['couple', 'spermogramme']
  },
  { code: 'autre', label: 'Autre (préciser dans les observations)', dossiers: ['couple', 'spermogramme'] }
];

/** Liste complète (libellés, saisie des actes en laboratoire, etc.). */
export const ACTE_TYPE_OPTIONS: { code: string; label: string }[] = ACTE_PMA_ENTRIES.map(({ code, label }) => ({
  code,
  label
}));

/** Options proposées selon le type de dossier (couple vs homme seul / spermogramme). */
export function actePmaOptionsForDossier(typeDossier: TypeDossierActe): { code: string; label: string }[] {
  return ACTE_PMA_ENTRIES.filter((e) => e.dossiers.includes(typeDossier)).map(({ code, label }) => ({
    code,
    label
  }));
}

export const STATUT_REALISATION_OPTIONS: { code: string; label: string }[] = [
  { code: 'a_realiser', label: 'À réaliser' },
  { code: 'en_cours', label: 'En cours' },
  { code: 'realise', label: 'Réalisé' },
  { code: 'annule', label: 'Annulé' }
];

export function libelleTypeActe(code: string): string {
  return ACTE_TYPE_OPTIONS.find((o) => o.code === code)?.label ?? code;
}

export function libelleStatutRealisation(code: string): string {
  return STATUT_REALISATION_OPTIONS.find((o) => o.code === code)?.label ?? code;
}

// —— Parcours : cycle PMA (stimulation ovarienne) vs laboratoire / stockage seul ——

/** Actes AMP classiques : un cycle de suivi PMA (calendrier, étapes) est en général attendu. */
const ACTES_AVEC_CYCLE_AMP = new Set([
  'fiv',
  'icsi',
  'insemination',
  'ponction_ovocytes',
  'transfer_embryonnaire',
  'congelation_embryons',
  'biopsie_embryonnaire',
  'don_ovocytes',
  'don_sperme'
]);

/** Actes centrés laboratoire / andrologie / cryo sperme : pas de cycle de stimulation ovarien. */
const ACTES_LABO_SANS_CYCLE_STIMULATION = new Set([
  'spermogramme_bilan',
  'preparation_sperme',
  'cryoconservation_sperme',
  'tesa',
  'tese',
  'mesa',
  'pesa',
  'autre'
]);

export function norm(code?: string | null): string {
  return (code || '').trim().toLowerCase();
}

/** Ex. couple en FIV → vrai ; conservation de sperme seule → faux. */
export function typeActePmaImpliqueCycleAmp(code?: string | null): boolean {
  return ACTES_AVEC_CYCLE_AMP.has(norm(code));
}

/** Ex. cryoconservation du sperme, spermogramme, TESA… → vrai (pas de parcours cycle ovarien typique). */
export function typeActePmaEstParcoursLaboStockageSeul(code?: string | null): boolean {
  return ACTES_LABO_SANS_CYCLE_STIMULATION.has(norm(code));
}

/** Texte court pour la fiche dossier ou le formulaire. */
export function resumeParcoursPatientDossier(typeActePma?: string | null): string {
  if (typeActePmaImpliqueCycleAmp(typeActePma)) {
    return 'Parcours AMP : le couple suit un cycle PMA (stimulation, ponction, transfert, etc.) ; les actes de laboratoire et la cryoconservation s’inscrivent dans ce parcours selon les prescriptions.';
  }
  if (typeActePmaEstParcoursLaboStockageSeul(typeActePma)) {
    return 'Parcours laboratoire / stockage : résultats biologiques et conservation (ex. sperme) — sans cycle de stimulation ovarienne. Un cycle PMA n’est en général pas nécessaire pour ce type d’acte seul.';
  }
  return 'Choisissez l’acte prévu pour orienter le parcours (AMP avec cycle de suivi, ou laboratoire / cryoconservation).';
}

/** Actes pour lesquels un placement en cuve (bonbonne / canister / tube) est attendu côté technicien. */
const ACTES_AVEC_STOCKAGE_CRYO = new Set([
  'cryoconservation_sperme',
  'congelation_embryons',
  'preparation_sperme',
  'fiv',
  'icsi',
  'insemination',
  'ponction_ovocytes',
  'transfer_embryonnaire',
  'biopsie_embryonnaire',
  'don_ovocytes',
  'don_sperme'
]);

/** Indique si le dossier nécessite gestion stockage cryo (repères bonbonne, visotube, couleur). */
export function typeActePmaNecessiteStockageCryo(code?: string | null): boolean {
  return ACTES_AVEC_STOCKAGE_CRYO.has(norm(code));
}

/** Conseil court pour le technicien (type de cuve / contenu). */
export function conseilStockagePourActe(typeActePma?: string | null): string {
  const c = norm(typeActePma);
  if (c === 'cryoconservation_sperme' || c === 'preparation_sperme')
    return 'Privilégier une bonbonne « sperme » (ex. étiquette rouge), azote liquide ; renseigner la couleur du visotube sur la grille.';
  if (c === 'congelation_embryons' || c === 'fiv' || c === 'icsi' || c === 'transfer_embryonnaire')
    return 'Embryons / ovocytes : bonbonne dédiée embryons ; respecter le canister et la position libre indiqués.';
  if (typeActePmaNecessiteStockageCryo(typeActePma))
    return 'Choisir une bonbonne adaptée au type de stockage, un canister avec emplacement libre, puis la couleur du tube.';
  return 'Sélectionnez la bonbonne, le canister et une position libre ; code-barres unique obligatoire.';
}

/** Type de consentement aligné sur l’acte PMA choisi (formulaire secrétaire). */
export function consentementTypeFromActePma(code?: string | null): string {
  const c = norm(code);
  switch (c) {
    case 'fiv':
      return 'Consentement FIV';
    case 'icsi':
      return 'Consentement ICSI';
    case 'insemination':
      return 'Consentement IIU';
    case 'congelation_embryons':
      return 'Congélation embryonnaire';
    case 'don_ovocytes':
      return "Don d'ovocytes";
    case 'don_sperme':
      return 'Don de sperme';
    case 'spermogramme_bilan':
      return 'Bilan andrologique / spermogramme';
    case 'preparation_sperme':
      return 'Consentement traitement du sperme en laboratoire';
    case 'cryoconservation_sperme':
      return 'Consentement cryoconservation du sperme';
    case 'tesa':
    case 'tese':
      return 'Consentement prélèvement testiculaire (TESA / TESE)';
    case 'mesa':
    case 'pesa':
      return 'Consentement prélèvement épididymaire (PESA / MESA)';
    case 'ponction_ovocytes':
    case 'transfer_embryonnaire':
    case 'biopsie_embryonnaire':
      return 'Consentement général PMA';
    case 'autre':
      return 'Consentement général PMA';
    default:
      return '';
  }
}

/** Motif de rendez-vous suggéré selon l’acte PMA prévu du patient. */
export function motifRdvFromActePma(code?: string | null): string {
  const c = norm(code);
  if (!c) return '';
  const libelle = libelleTypeActe(c);
  if (!libelle || libelle === c) return 'Consultation PMA';
  return `Rendez-vous — ${libelle}`;
}
