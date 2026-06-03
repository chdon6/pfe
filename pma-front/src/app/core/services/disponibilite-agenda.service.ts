import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DisponibiliteAgenda } from '../models/disponibilite-agenda.model';

const STORAGE_KEY = 'pma_disponibilites_agenda';

@Injectable({ providedIn: 'root' })
export class DisponibiliteAgendaService {
  private readonly apiUrl = `${environment.apiUrl}/disponibilites-agenda`;

  constructor(private http: HttpClient) {}

  getAll(from?: string, to?: string): Observable<DisponibiliteAgenda[]> {
    const params: Record<string, string> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;

    return this.http.get<DisponibiliteAgenda[]>(this.apiUrl, { params }).pipe(
      map((list) => list.map((x) => this.normalize(x))),
      catchError(() => of(this.readLocal())),
      tap((list) => this.writeLocal(list))
    );
  }

  /** true = jour non disponible, false = jour à nouveau disponible */
  setNonDisponible(date: string, nonDisponible: boolean): Observable<DisponibiliteAgenda | null> {
    return this.http.put<DisponibiliteAgenda | null>(this.apiUrl, { date, nonDisponible }).pipe(
      catchError(() => of(this.applyLocal(date, nonDisponible))),
      tap(() => this.applyLocal(date, nonDisponible))
    );
  }

  private applyLocal(date: string, nonDisponible: boolean): DisponibiliteAgenda | null {
    let list = this.readLocal();
    const idx = list.findIndex((x) => x.date === date);
    if (!nonDisponible) {
      if (idx >= 0) list.splice(idx, 1);
      this.writeLocal(list);
      return null;
    }
    const entry: DisponibiliteAgenda = {
      id: idx >= 0 ? list[idx].id : Date.now(),
      date,
      nonDisponible: true,
      modifieLe: new Date().toISOString(),
    };
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);
    this.writeLocal(list);
    return entry;
  }

  private normalize(x: DisponibiliteAgenda & { confirme?: boolean }): DisponibiliteAgenda {
    const nonDisponible =
      x.nonDisponible === true || (x as { confirme?: boolean }).confirme === false;
    return { ...x, nonDisponible };
  }

  private readLocal(): DisponibiliteAgenda[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: (DisponibiliteAgenda & { confirme?: boolean })[] = raw ? JSON.parse(raw) : [];
      return list.map((x) => this.normalize(x)).filter((x) => x.nonDisponible);
    } catch {
      return [];
    }
  }

  private writeLocal(list: DisponibiliteAgenda[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}
