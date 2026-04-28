import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActePma } from '../models';

@Injectable({ providedIn: 'root' })
export class ActePmaService {
  private readonly apiUrl = `${environment.apiUrl}/actespma`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ActePma[]> {
    return this.http.get<ActePma[]>(this.apiUrl);
  }

  getById(id: number): Observable<ActePma> {
    return this.http.get<ActePma>(`${this.apiUrl}/${id}`);
  }

  getByPatient(patientId: number): Observable<ActePma[]> {
    return this.http.get<ActePma[]>(`${this.apiUrl}/by-patient/${patientId}`);
  }

  getTypes(): Observable<{ code: string; libelle: string }[]> {
    return this.http.get<{ code: string; libelle: string }[]>(`${this.apiUrl}/types`);
  }

  create(acte: Omit<ActePma, 'id'>): Observable<number> {
    return this.http.post<number>(this.apiUrl, acte);
  }

  update(id: number, acte: ActePma): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, acte);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
