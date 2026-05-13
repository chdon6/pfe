import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

export type ProfileRole = 'Technicien' | 'Secretaire' | 'Biologiste' | 'Administrateur';

export interface MenuItem {
  label: string;
  icon: string;
  route: string;
  roles: ProfileRole[];
}

/** Rétrocompatibilité si l’API ne renvoie pas encore `profileLibelle`. */
const PROFILE_MAP: Record<number, ProfileRole> = {
  1: 'Technicien',
  2: 'Secretaire',
  3: 'Biologiste',
  4: 'Administrateur',
};

const ALL_ROLES: ProfileRole[] = ['Technicien', 'Secretaire', 'Biologiste', 'Administrateur'];

const ROLE_LABELS = new Set<string>(ALL_ROLES);

/** Compare insensible à la casse / accents (ex. base Oracle « Secrétaire », « ADMINISTRATEUR »). */
function foldAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

const NORMALIZED_TO_ROLE: Map<string, ProfileRole> = new Map(
  ALL_ROLES.map((r) => [foldAccents(r), r])
);

function roleFromUser(u: { profileLibelle?: string | null; profileId?: number } | null): ProfileRole | null {
  if (!u) return null;
  const lib = (u.profileLibelle || '').trim();
  if (lib) {
    if (ROLE_LABELS.has(lib)) return lib as ProfileRole;
    const byNorm = NORMALIZED_TO_ROLE.get(foldAccents(lib));
    if (byNorm) return byNorm;
  }
  if (u.profileId != null && PROFILE_MAP[u.profileId]) return PROFILE_MAP[u.profileId];
  return null;
}

export const ALL_MENU_ITEMS: MenuItem[] = [
  { label: 'Patients', icon: 'fas fa-user-injured', route: '/patients', roles: ['Secretaire'] },
  { label: 'Rendez-vous', icon: 'fas fa-calendar-alt', route: '/rendez-vous', roles: ['Secretaire'] },
  { label: 'Archives dossiers', icon: 'fas fa-archive', route: '/archives-dossiers', roles: ['Secretaire'] },
  { label: 'Étiquettes', icon: 'fas fa-tags', route: '/identitovigilance/etiquettes', roles: ['Secretaire', 'Biologiste'] },
  { label: 'Vérification scan', icon: 'fas fa-barcode', route: '/identitovigilance/scan', roles: ['Biologiste'] },
  { label: 'Traçabilité', icon: 'fas fa-stream', route: '/identitovigilance/tracabilite', roles: ['Biologiste'] },
  {
    label: 'Gestion cryogénique — températures, azote, maintenances',
    icon: 'fas fa-temperature-low',
    route: '/gestion-cryogenique',
    roles: ['Technicien'],
  },
  {
    label: 'Cryoconservation — localisation des échantillons (cuve, canister, position)',
    icon: 'fas fa-snowflake',
    route: '/identitovigilance/cryoconservation',
    roles: ['Technicien'],
  },
  { label: 'Cryoconservation', icon: 'fas fa-snowflake', route: '/identitovigilance/cryoconservation', roles: ['Biologiste'] },
  {
    label: 'Cycles & suivi PMA',
    icon: 'fas fa-project-diagram',
    route: '/cycles',
    roles: ['Biologiste'],
  },
  {
    label: 'Agenda & disponibilités',
    icon: 'fas fa-calendar-check',
    route: '/agenda-biologiste',
    roles: ['Biologiste'],
  },
  {
    label: 'Stockage cryogénique — occupation des bombonnes',
    icon: 'fas fa-warehouse',
    route: '/stockage',
    roles: ['Technicien'],
  },
  {
    label: 'Reporting — KPI et rapports réglementaires',
    icon: 'fas fa-chart-bar',
    route: '/reporting',
    roles: ['Technicien'],
  },
  {
    label: 'Administration utilisateurs',
    icon: 'fas fa-user-shield',
    route: '/administration/utilisateurs',
    roles: ['Administrateur'],
  },
];

@Injectable({ providedIn: 'root' })
export class RoleService {
  private auth = inject(AuthService);

  readonly role = computed<ProfileRole | null>(() => roleFromUser(this.auth.user()));

  readonly roleName = computed(() => this.role() ?? 'Inconnu');

  readonly menuItems = computed(() => {
    const r = this.role();
    if (!r) return [];
    return ALL_MENU_ITEMS.filter((item) => item.roles.includes(r));
  });

  hasAccess(allowedRoles: ProfileRole[]): boolean {
    const r = this.role();
    return !!r && allowedRoles.includes(r);
  }

  hasRoute(route: string): boolean {
    const items = ALL_MENU_ITEMS.filter((m) => m.route === route);
    if (items.length === 0) return true;
    return items.some((item) => this.hasAccess(item.roles));
  }
}
