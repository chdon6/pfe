import { Injectable } from '@angular/core';
import type { CycleEtapeHistorique } from '../models';
import type { CyclePma } from '../models';
import {
  phasesForActePma,
  type ActeCyclePhaseStep,
} from '../constants/acte-cycle-phases';

export type { ActeCyclePhaseStep };

/** @deprecated Utiliser totalStepsForActePma(typeActePma) — conservé pour compatibilité templates. */
export const PMA_TOTAL_STEPS = 10;

export interface PhaseCalendarItem {
  index: number;
  label: string;
  datePrevue: Date;
  statut: 'termine' | 'en_cours' | 'a_venir';
  /** Date réelle issue de l’historique API si disponible */
  fromHistorique?: boolean;
}

export interface JourPhaseCalendrier {
  jourIndex: number;
  date: Date;
  phaseIndex: number;
  phaseLabel: string;
  statut: 'termine' | 'en_cours' | 'a_venir';
}

@Injectable({ providedIn: 'root' })
export class PmaCyclePhaseService {
  getSteps(typeActePma?: string | null): readonly ActeCyclePhaseStep[] {
    return phasesForActePma(typeActePma);
  }

  totalSteps(typeActePma?: string | null): number {
    return phasesForActePma(typeActePma).length;
  }

  resolveStepIndex(
    cycle: Pick<CyclePma, 'phase' | 'etapeCourante'>,
    typeActePma?: string | null,
    historique?: CycleEtapeHistorique[]
  ): number {
    const steps = phasesForActePma(typeActePma);
    const total = steps.length;
    if (total === 0) return 1;

    if (historique?.length) {
      let maxIdx = 0;
      for (const h of historique) {
        const idx = this.matchStepIndex(h.etape, steps);
        if (idx > maxIdx) maxIdx = idx;
      }
      if (maxIdx > 0) return Math.min(total, maxIdx);
    }

    const frac = /^\s*(\d+)\s*\/\s*(\d+)\s*$/i.exec(cycle.etapeCourante || '');
    if (frac) {
      const cur = parseInt(frac[1], 10);
      return Math.min(total, Math.max(1, cur));
    }

    const fromPhase = this.matchStepIndex(cycle.phase || '', steps);
    if (fromPhase > 0) return fromPhase;

    const fromEtape = this.matchStepIndex(cycle.etapeCourante || '', steps);
    if (fromEtape > 0) return fromEtape;

    return 1;
  }

  progressPercent(stepIndex: number, typeActePma?: string | null): number {
    const total = this.totalSteps(typeActePma);
    if (total <= 0) return 0;
    return Math.round((Math.min(stepIndex, total) / total) * 100);
  }

  badgeTypeActe(typeActePma: string | undefined, phase: string): string {
    const t = (typeActePma || '').trim();
    if (t) {
      const short = t.toUpperCase();
      if (short.includes('ICSI')) return 'ICSI';
      if (short.includes('FIV')) return 'FIV';
      if (short === 'INSEMINATION') return 'IIU';
      if (short.includes('SPERMOGRAMME')) return 'Spermogramme';
      if (short.includes('CRYO')) return 'Cryo';
    }
    const ph = (phase || '').toLowerCase();
    if (/stimul|ovarien/.test(ph)) return 'Stimulation';
    if (/monitor|suivi/.test(ph)) return 'Monitoring';
    if (/ponct/.test(ph)) return 'Ponction';
    if (/transfer|transfert/.test(ph)) return 'Transfert';
    return typeActePma || 'PMA';
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

  buildCalendar(
    cycle: Pick<CyclePma, 'dateDebut' | 'phase' | 'etapeCourante'>,
    typeActePma?: string | null,
    historique?: CycleEtapeHistorique[]
  ): PhaseCalendarItem[] {
    const steps = phasesForActePma(typeActePma);
    const start = this.parseCycleStartDate(cycle.dateDebut);
    const currentStep = this.resolveStepIndex(cycle, typeActePma, historique);
    const histByStep = this.historiqueParPhase(steps, historique);

    return steps.map((s, i) => {
      const index = i + 1;
      const hist = histByStep.get(index);
      let d: Date;
      let fromHistorique = false;
      if (hist?.dateEtape) {
        d = this.parseCycleStartDate(hist.dateEtape);
        fromHistorique = true;
      } else {
        d = new Date(start);
        d.setDate(d.getDate() + s.offsetJours);
      }
      let statut: PhaseCalendarItem['statut'] = 'a_venir';
      if (index < currentStep) statut = 'termine';
      else if (index === currentStep) statut = 'en_cours';
      return { index, label: s.label, datePrevue: d, statut, fromHistorique };
    });
  }

  buildDailyCalendar(
    cycle: Pick<CyclePma, 'dateDebut' | 'phase' | 'etapeCourante'>,
    typeActePma?: string | null,
    historique?: CycleEtapeHistorique[]
  ): JourPhaseCalendrier[] {
    const steps = phasesForActePma(typeActePma);
    if (steps.length === 0) return [];
    const start = this.parseCycleStartDate(cycle.dateDebut);
    const currentStep = this.resolveStepIndex(cycle, typeActePma, historique);
    const lastDay = steps[steps.length - 1]!.offsetJours;
    const rows: JourPhaseCalendrier[] = [];
    for (let j = 0; j <= lastDay; j++) {
      const date = new Date(start);
      date.setDate(date.getDate() + j);
      let phaseIdx = 0;
      for (let i = 0; i < steps.length; i++) {
        if (j >= steps[i]!.offsetJours) phaseIdx = i;
      }
      const phaseIndex = phaseIdx + 1;
      let statut: JourPhaseCalendrier['statut'] = 'a_venir';
      if (phaseIndex < currentStep) statut = 'termine';
      else if (phaseIndex === currentStep) statut = 'en_cours';
      rows.push({
        jourIndex: j,
        date,
        phaseIndex,
        phaseLabel: steps[phaseIdx]!.label,
        statut,
      });
    }
    return rows;
  }

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

  private matchStepIndex(text: string, steps: readonly ActeCyclePhaseStep[]): number {
    const t = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (!t.trim()) return 0;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i]!;
      const key = s.key.toLowerCase();
      const label = s.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (t === key || t === label || label.includes(t) || t.includes(key)) {
        return i + 1;
      }
      if (key === 'fec' && /fec|fiv|icsi|insemin/.test(t)) return i + 1;
      if (key === 'ponction' && /ponct/.test(t)) return i + 1;
      if (key === 'transfert' && /transfer|transfert/.test(t)) return i + 1;
      if (key === 'test' && /test|grossesse|hcg|beta/.test(t)) return i + 1;
      if (key === 'stimulation' && /stimul/.test(t)) return i + 1;
      if (key === 'monitoring' && /monitor|suivi|follicul/.test(t)) return i + 1;
      if (key === 'consultation' && /consult|initial/.test(t)) return i + 1;
    }
    return 0;
  }

  private historiqueParPhase(
    steps: readonly ActeCyclePhaseStep[],
    historique?: CycleEtapeHistorique[]
  ): Map<number, CycleEtapeHistorique> {
    const map = new Map<number, CycleEtapeHistorique>();
    if (!historique?.length) return map;
    for (const h of historique) {
      const idx = this.matchStepIndex(h.etape, steps);
      if (idx > 0 && !map.has(idx)) {
        map.set(idx, h);
      }
    }
    return map;
  }

  private startOfLocalToday(): Date {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12, 0, 0, 0);
  }
}
