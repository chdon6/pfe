import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface AppHealthErrorSnapshot {
  at: string;
  url: string;
  status: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AppHealthService {
  /** Dernière réponse HTTP réussie (toute requête sortante). */
  readonly lastSuccessAt = signal<string | null>(null);

  /** Dernière erreur HTTP (hors annulation). */
  readonly lastError = signal<AppHealthErrorSnapshot | null>(null);

  recordSuccess(url: string): void {
    if (url.includes('/assets/')) return;
    this.lastSuccessAt.set(new Date().toISOString());
  }

  recordError(url: string, err: unknown): void {
    const e = err as HttpErrorResponse;
    const status = e.status ?? 0;
    let message = e.message || 'Erreur réseau';
    if (typeof e.error === 'string' && e.error.trim()) {
      message = e.error.trim().slice(0, 400);
    }
    this.lastError.set({
      at: new Date().toISOString(),
      url,
      status,
      message,
    });
  }

  clearLastError(): void {
    this.lastError.set(null);
  }
}
