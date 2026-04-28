import { Injectable, signal } from '@angular/core';
import type { EntityHistoryEntry } from '../models/entity-history.model';

const STORAGE_KEY = 'pma_entity_history';
const MAX = 500;

@Injectable({ providedIn: 'root' })
export class EntityHistoryService {
  readonly entries = signal<EntityHistoryEntry[]>(this.read());

  logPatient(patientId: number, action: string, summary: string, actor?: string): void {
    this.push({
      entity: 'patient',
      entityId: patientId,
      action,
      summary,
      actor,
    });
  }

  logCycle(cycleId: number, action: string, summary: string, actor?: string): void {
    this.push({
      entity: 'cycle',
      entityId: cycleId,
      action,
      summary,
      actor,
    });
  }

  getForPatient(patientId: number): EntityHistoryEntry[] {
    return this.read().filter((e) => e.entity === 'patient' && e.entityId === patientId);
  }

  getForCycle(cycleId: number): EntityHistoryEntry[] {
    return this.read().filter((e) => e.entity === 'cycle' && e.entityId === cycleId);
  }

  private push(entry: Omit<EntityHistoryEntry, 'id' | 'at'>): void {
    const full: EntityHistoryEntry = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      ...entry,
    };
    const next = [full, ...this.read()].slice(0, MAX);
    this.persist(next);
    this.entries.set(next);
  }

  private read(): EntityHistoryEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const p = JSON.parse(raw) as EntityHistoryEntry[];
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }

  private persist(list: EntityHistoryEntry[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}
