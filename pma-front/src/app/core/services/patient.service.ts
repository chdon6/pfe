import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Patient, PatientCreate } from '../models';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly apiUrl = `${environment.apiUrl}/patients`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Patient[]> {
    return this.http.get<Patient[]>(this.apiUrl);
  }

  getById(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/${id}`);
  }

  /** Bracelet / scan accueil : numéro de dossier (ex. C-001). */
  getByNumDossier(numDossier: string): Observable<Patient> {
    const q = encodeURIComponent(numDossier.trim());
    return this.http.get<Patient>(`${this.apiUrl}/par-dossier/${q}`);
  }

  create(formData: FormData): Observable<number> {
    return this.http.post<number>(this.apiUrl, formData);
  }

  update(id: number, formData: FormData): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, formData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
