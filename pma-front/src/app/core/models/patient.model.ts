export interface Patient {
  id: number;
  nom: string;
  prenom: string;
  dateNaissance: string;
  /** Fiche injectée côté front pour les tests (non en base). */
  demo?: boolean;
  femmeNom?: string | null;
  femmePrenom?: string | null;
  femmeDateNaissance?: string | null;
  numDossier: string;
  /** couple | spermogramme (homme seul) | femme_seul */
  typeDossier?: string;
  /** Code acte PMA prévu (fiv, icsi, …) */
  typeActePma?: string | null;
  adresse?: string;
  telephone?: string | null;
  imagePath?: string;
}

export interface PatientCreate {
  nom: string;
  prenom: string;
  dateNaissance: string;
  numDossier: string;
  adresse?: string;
}
