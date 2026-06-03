import { Injectable, signal } from '@angular/core';
import type { Patient, RendezVous, CyclePma } from '../models';

export interface PatientChatContext {
  patient: Patient;
  rdvs: RendezVous[];
  cycles: CyclePma[];
}

/**
 * Service partagé entre la patient-list et le widget flottant Grok.
 * Permet d'ouvrir le chatbot avec un contexte patient pré-chargé.
 */
@Injectable({ providedIn: 'root' })
export class GrokChatWidgetService {
  readonly isOpen      = signal(false);
  readonly context     = signal<PatientChatContext | null>(null);
  readonly pendingQuery= signal<string | null>(null);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  /** Ouvre le widget et demande immédiatement un résumé du patient. */
  openWithPatient(ctx: PatientChatContext): void {
    this.context.set(ctx);
    this.pendingQuery.set('summarize');
    this.isOpen.set(true);
  }

  clearContext(): void {
    this.context.set(null);
    this.pendingQuery.set(null);
  }
}
