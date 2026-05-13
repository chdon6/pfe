import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RendezVous } from '../models';

@Injectable({ providedIn: 'root' })
export class RendezVousService {
  private readonly apiUrl = `${environment.apiUrl}/rendezvous`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<RendezVous[]> {
    return this.http.get<RendezVous[]>(this.apiUrl);
  }

  getById(id: number): Observable<RendezVous> {
    return this.http.get<RendezVous>(`${this.apiUrl}/${id}`);
  }

  create(rdv: RendezVous): Observable<number> {
    return this.http.post<number>(this.apiUrl, rdv);
  }

  update(rdv: RendezVous): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${rdv.id}`, rdv);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
