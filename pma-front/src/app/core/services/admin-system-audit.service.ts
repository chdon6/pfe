import { Injectable, signal } from '@angular/core';
import type { AdminSystemAuditEntry } from '../models/admin-system-audit.model';

const STORAGE_KEY = 'pma_admin_system_audit';
const MAX = 200;

@Injectable({ providedIn: 'root' })
export class AdminSystemAuditService {
  readonly entries = signal<AdminSystemAuditEntry[]>(this.read());

  log(action: string, detail?: string, actor?: string): void {
    const entry: AdminSystemAuditEntry = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      action,
      detail: detail?.trim() || undefined,
      actor: actor?.trim() || undefined,
    };
    const next = [entry, ...this.read()].slice(0, MAX);
    this.persist(next);
    this.entries.set(next);
  }

  clear(): void {
    this.persist([]);
    this.entries.set([]);
  }

  private read(): AdminSystemAuditEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as AdminSystemAuditEntry[];
      return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
    } catch {
      return [];
    }
  }

  private persist(entries: AdminSystemAuditEntry[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
}
