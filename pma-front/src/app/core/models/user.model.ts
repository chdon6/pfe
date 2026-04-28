export interface User {
  id: number;
  nom: string;
  prenom: string;
  identifiant: string;
  telephone: string;
  profileId?: number;
  /** Libellé du profil (API), prioritaire pour le menu / garde. */
  profileLibelle?: string | null;
}

export interface LoginRequest {
  identifiant: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
