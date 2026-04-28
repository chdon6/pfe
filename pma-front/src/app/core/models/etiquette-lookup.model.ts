import type { ElementBiologique } from './element-biologique.model';

export interface EtiquetteLookupPatient {
  id: number;
  nom: string;
  prenom: string;
  numDossier: string;
  femmeNom?: string | null;
  femmePrenom?: string | null;
  typeDossier: string;
}

export interface EtiquetteLookupPaillette {
  id: number;
  codeBarre: string;
  typeContenu: string;
  cyclePmaId?: number | null;
  patientId?: number | null;
}

/** Réponse GET /elementsbiologiques/lookup-etiquette/{code} */
export interface EtiquetteLookup {
  trouve: boolean;
  origine?: 'element_biologique' | 'paillette_cryo';
  elementBiologique?: ElementBiologique;
  paillette?: EtiquetteLookupPaillette;
  patient?: EtiquetteLookupPatient;
}
