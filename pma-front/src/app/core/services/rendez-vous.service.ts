import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { RendezVous, RdvFilters } from '../models';

@Injectable({ providedIn: 'root' })
export class RendezVousService {
  private readonly apiUrl = `${environment.apiUrl}/rendezvous`;

  constructor(private http: HttpClient) {}

  getAll(filters?: RdvFilters): Observable<RendezVous[]> {
    let params = new HttpParams();
    if (filters?.date) params = params.set('date', filters.date);
    if (filters?.patientId) params = params.set('patientId', String(filters.patientId));
    if (filters?.statut) params = params.set('statut', filters.statut);

    return this.http.get<RendezVous[]>(this.apiUrl, { params }).pipe(
      catchError(() => of([])),
      map((list) => this.applyClientFilters(list, filters))
    );
  }

  getById(id: number): Observable<RendezVous> {
    return this.http.get<RendezVous>(`${this.apiUrl}/${id}`);
  }

  create(rdv: RendezVous): Observable<RendezVous> {
    const body = {
      dateHeure: rdv.dateHeure,
      motif: rdv.motif,
      statut: rdv.statut || 'planifie',
      patientId: rdv.patientId,
    };
    return this.http.post<RendezVous>(this.apiUrl, body);
  }

  update(rdv: RendezVous): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${rdv.id}`, {
      id: rdv.id,
      dateHeure: rdv.dateHeure,
      motif: rdv.motif,
      statut: rdv.statut || 'planifie',
      patientId: rdv.patientId,
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private applyClientFilters(list: RendezVous[], filters?: RdvFilters): RendezVous[] {
    if (!filters) return this.sortByHour(list);

    let result = [...list];

    if (filters.patientId) {
      result = result.filter((r) => r.patientId === filters.patientId);
    }

    if (filters.statut) {
      const s = filters.statut.toLowerCase();
      result = result.filter((r) => r.statut.toLowerCase() === s);
    }

    if (filters.date) {
      const target = filters.date === 'today' ? new Date() : new Date(filters.date);
      if (!Number.isNaN(target.getTime())) {
        const key = this.dayKey(target);
        result = result.filter((r) => this.dayKey(new Date(r.dateHeure)) === key);
      }
    }

    return this.sortByHour(result);
  }

  private sortByHour(list: RendezVous[]): RendezVous[] {
    return [...list].sort(
      (a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime()
    );
  }

  private dayKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
