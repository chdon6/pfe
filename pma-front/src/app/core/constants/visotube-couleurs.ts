/**
 * Palettes fabricant (repères visuels cryo) — visotubes selon le format.
 * Utilisé pour le placement stockage et la résolution d’affichage (pastilles).
 */

export type VisotubeFamilleId = 'imv_polygonal' | 'mm10' | 'mm71';

export interface VisotubeCouleurEntry {
  nom: string;
  hex: string;
}

export interface VisotubeFamille {
  id: VisotubeFamilleId;
  label: string;
  couleurs: VisotubeCouleurEntry[];
}

/** Blanc cassé : meilleure lisibilité que #fff sur fond clair (bordure gérée côté UI). */
const BLANC: VisotubeCouleurEntry = { nom: 'Blanc', hex: '#f1f5f9' };

export const VISOTUBE_FAMILLES: readonly VisotubeFamille[] = [
  {
    id: 'imv_polygonal',
    label: 'Visotube polygonal (IMV)',
    couleurs: [
      BLANC,
      { nom: 'Orange', hex: '#ea580c' },
      { nom: 'Bleu', hex: '#2563eb' },
      { nom: 'Rouge', hex: '#dc2626' },
      { nom: 'Vert', hex: '#16a34a' },
      { nom: 'Jaune', hex: '#ca8a04' },
    ],
  },
  {
    id: 'mm10',
    label: 'Visotube 10 mm',
    couleurs: [
      BLANC,
      { nom: 'Bleu', hex: '#2563eb' },
      { nom: 'Jaune', hex: '#ca8a04' },
      { nom: 'Orange', hex: '#ea580c' },
      { nom: 'Pistache', hex: '#84cc16' },
      { nom: 'Rose', hex: '#ec4899' },
      { nom: 'Rouge', hex: '#dc2626' },
      { nom: 'Vert', hex: '#16a34a' },
    ],
  },
  {
    id: 'mm71',
    label: 'Visotube 7.1 mm',
    couleurs: [
      BLANC,
      { nom: 'Rouge', hex: '#dc2626' },
      { nom: 'Vert', hex: '#16a34a' },
      { nom: 'Bleu', hex: '#2563eb' },
      { nom: 'Jaune', hex: '#ca8a04' },
      { nom: 'Orange', hex: '#ea580c' },
      { nom: 'Violet', hex: '#7c3aed' },
    ],
  },
];

/** Espace + tiret cadratin (libellés identiques à l’affichage). */
export const LIBELLE_VISOTUBE_SEP = ' \u2014 ';

/** Libellé stocké en base / API (un seul champ `couleurVisotube`). */
export function composeLibelleVisotube(familleId: VisotubeFamilleId, couleurNom: string): string {
  const fam = VISOTUBE_FAMILLES.find((f) => f.id === familleId);
  if (!fam) return couleurNom.trim();
  return `${fam.label}${LIBELLE_VISOTUBE_SEP}${couleurNom.trim()}`;
}

export function familleParDefaut(): { familleId: VisotubeFamilleId; couleurNom: string } {
  const f = VISOTUBE_FAMILLES[0];
  return { familleId: f.id, couleurNom: f.couleurs[0].nom };
}

/** Pastille / fond : à partir de la valeur persistée (#legacy ou « Type — Couleur »). */
export function hexDepuisValeurVisotube(raw: string | null | undefined): string {
  const v = (raw || '').trim();
  if (!v) return '#cbd5e1';
  if (v.startsWith('#')) return v;
  if (!v.includes(LIBELLE_VISOTUBE_SEP)) return '#cbd5e1';
  const [labelFam, ...rest] = v.split(LIBELLE_VISOTUBE_SEP);
  const nomCol = rest.join(LIBELLE_VISOTUBE_SEP).trim();
  const fam = VISOTUBE_FAMILLES.find((f) => f.label === labelFam.trim());
  const hit = fam?.couleurs.find((c) => c.nom === nomCol);
  return hit?.hex ?? '#cbd5e1';
}
