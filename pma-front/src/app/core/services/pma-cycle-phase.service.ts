import { Injectable } from '@angular/core';
import type { CyclePma } from '../models';

/** Phases linéaires du parcours PMA (barre Consultation initiale → Test de grossesse). */
export const PMA_PHASE_STEPS: readonly { key: string; label: string; offsetJours: number }[] = [
  { key: 'consultation', label: 'Consultation initiale', offsetJours: 0 },
  { key: 'stimulation', label: 'Stimulation ovarienne', offsetJours: 3 },
  { key: 'monitoring', label: 'Suivi & monitoring', offsetJours: 10 },
  { key: 'declenchement', label: 'Déclenchement OV', offsetJours: 12 },
  { key: 'ponction', label: 'Ponction ovocytaire', offsetJours: 14 },
  { key: 'fec', label: 'Fécondation (FIV/ICSI)', offsetJours: 15 },
  { key: 'culture', label: 'Culture embryonnaire', offsetJours: 17 },
  { key: 'transfert', label: 'Transfert embryonnaire', offsetJours: 19 },
  { key: 'luteal', label: 'Phase lutéale', offsetJours: 21 },
  { key: 'test', label: 'Test de grossesse', offsetJours: 28 },
] as const;

export const PMA_TOTAL_STEPS = PMA_PHASE_STEPS.length;

export interface PhaseCalendarItem {
  index: number;
  label: string;
  datePrevue: Date;
  statut: 'termine' | 'en_cours' | 'a_venir';
}

/** Une ligne par jour du parcours (phase dominante ce jour-là). */
export interface JourPhaseCalendrier {
  /** Jour 0 = date de début du cycle */
  jourIndex: number;
  date: Date;
  phaseIndex: number;
  phaseLabel: string;
  statut: 'termine' | 'en_cours' | 'a_venir';
}

@Injectable({ providedIn: 'root' })
export class PmaCyclePhaseService {
  /** Index d’étape 1..N à partir du libellé de phase en base et éventuellement "3/10". */
  resolveStepIndex(cycle: Pick<CyclePma, 'phase' | 'etapeCourante'>): number {
    const frac = /^\s*(\d+)\s*\/\s*(\d+)\s*$/i.exec(cycle.etapeCourante || '');
    if (frac) {
      const cur = parseInt(frac[1], 10);
      return Math.min(PMA_TOTAL_STEPS, Math.max(1, cur));
    }

    const p = (cycle.phase || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (/consult|initial/.test(p)) return 1;
    if (/stimul|ovarien/.test(p)) return 2;
    if (/monitor|suivi|follicul/.test(p)) return 3;
    if (/declench/.test(p)) return 4;
    if (/ponct/.test(p)) return 5;
    if (/fec|icsi|fiv|insemin/.test(p)) return 6;
    if (/cultur|embryon(?!\s*transfer)/.test(p)) return 7;
    if (/transfert|transfer/.test(p)) return 8;
    if (/luteal|lute/.test(p)) return 9;
    if (/test|grossesse|beta|hcg/.test(p)) return 10;

    const ec = (cycle.etapeCourante || '').toLowerCase();
    if (/initial/.test(ec)) return 1;
    if (/stimul|ovarien/.test(ec)) return 2;
    return 2;
  }

  progressPercent(stepIndex: number): number {
    return Math.round((Math.min(stepIndex, PMA_TOTAL_STEPS) / PMA_TOTAL_STEPS) * 100);
  }

  /** Libellé court pour badge type acte (FIV / ICSI / Stimulation…). */
  badgeTypeActe(protocoleType: string | undefined, phase: string): string {
    const t = (protocoleType || '').toUpperCase();
    if (t.includes('ICSI')) return 'ICSI';
    if (t.includes('FIV')) return 'FIV';
    const ph = (phase || '').toLowerCase();
    if (/stimul|ovarien/.test(ph)) return 'Stimulation ovarienne';
    if (/monitor|suivi/.test(ph)) return 'Monitoring';
    if (/ponct/.test(ph)) return 'Ponction';
    if (/transfer/.test(ph)) return 'Transfert';
    return protocoleType || 'PMA';
  }

  statutLabel(statutCycle: string): string {
    switch (statutCycle) {
      case 'en_cours':
        return 'En cours';
      case 'termine':
        return 'Terminé';
      case 'brouillon':
        return 'Brouillon';
      default:
        return statutCycle || '—';
    }
  }

  badgeStatutClass(statutCycle: string): string {
    if (statutCycle === 'en_cours') return 'badge-statut-en-cours';
    if (statutCycle === 'termine') return 'badge-statut-termine';
    return 'badge-statut-brouillon';
  }

  buildCalendar(cycle: Pick<CyclePma, 'dateDebut' | 'phase' | 'etapeCourante'>): PhaseCalendarItem[] {
    const start = this.parseStartDate(cycle.dateDebut);
    const currentStep = this.resolveStepIndex(cycle);
    return PMA_PHASE_STEPS.map((s, i) => {
      const index = i + 1;
      const d = new Date(start);
      d.setDate(d.getDate() + s.offsetJours);
      let statut: PhaseCalendarItem['statut'] = 'a_venir';
      if (index < currentStep) statut = 'termine';
      else if (index === currentStep) statut = 'en_cours';
      return { index, label: s.label, datePrevue: d, statut };
    });
  }

  /**
   * Calendrier jour par jour : chaque jour du cycle a une phase associée
   * (même logique que les jalons : le jour appartient à la dernière étape dont l’offset est ≤ au jour courant).
   */
  buildDailyCalendar(cycle: Pick<CyclePma, 'dateDebut' | 'phase' | 'etapeCourante'>): JourPhaseCalendrier[] {
    const start = this.parseStartDate(cycle.dateDebut);
    const currentStep = this.resolveStepIndex(cycle);
    const lastDay = PMA_PHASE_STEPS[PMA_PHASE_STEPS.length - 1]!.offsetJours;
    const rows: JourPhaseCalendrier[] = [];
    for (let j = 0; j <= lastDay; j++) {
      const date = new Date(start);
      date.setDate(date.getDate() + j);
      let phaseIdx = 0;
      for (let i = 0; i < PMA_PHASE_STEPS.length; i++) {
        if (j >= PMA_PHASE_STEPS[i]!.offsetJours) phaseIdx = i;
      }
      const phaseIndex = phaseIdx + 1;
      let statut: JourPhaseCalendrier['statut'] = 'a_venir';
      if (phaseIndex < currentStep) statut = 'termine';
      else if (phaseIndex === currentStep) statut = 'en_cours';
      rows.push({
        jourIndex: j,
        date,
        phaseIndex,
        phaseLabel: PMA_PHASE_STEPS[phaseIdx]!.label,
        statut,
      });
    }
    return rows;
  }

  /**
   * Date de début en **heure locale** (évite les décalages d’un jour avec les ISO `...T00:00:00Z`).
   * Utilisée pour le calendrier jour / phase.
   */
  parseCycleStartDate(dateDebut: string | undefined | null): Date {
    if (dateDebut == null || !String(dateDebut).trim()) {
      return this.startOfLocalToday();
    }
    const s = String(dateDebut).trim();
    const isoDay = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (isoDay) {
      const y = +isoDay[1];
      const m = +isoDay[2] - 1;
      const day = +isoDay[3];
      return new Date(y, m, day, 12, 0, 0, 0);
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? this.startOfLocalToday() : d;
  }

  private parseStartDate(dateDebut: string): Date {
    return this.parseCycleStartDate(dateDebut);
  }

  /** Milieu de journée locale pour comparaisons stables. */
  private startOfLocalToday(): Date {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12, 0, 0, 0);
  }
}
