import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DEMO_PATIENTS } from '../data/demo-patients';
import { Patient, PatientCreate } from '../models';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly apiUrl = `${environment.apiUrl}/patients`;

  constructor(private http: HttpClient) {}

  private mergeDemoPatients(api: Patient[]): Patient[] {
    if (!environment.useDemoData) return api;
    const ids = new Set(api.map((p) => p.id));
    const extra = DEMO_PATIENTS.filter((d) => !ids.has(d.id));
    return [...api, ...extra];
  }

  private demoPatientById(id: number): Patient | undefined {
    return environment.useDemoData ? DEMO_PATIENTS.find((p) => p.id === id) : undefined;
  }

  private demoPatientByNum(num: string): Patient | undefined {
    const n = num.trim().toUpperCase();
    return environment.useDemoData
      ? DEMO_PATIENTS.find((p) => p.numDossier.toUpperCase() === n)
      : undefined;
  }

  getAll(): Observable<Patient[]> {
    return this.http.get<Patient[]>(this.apiUrl).pipe(
      catchError(() => of([])),
      map((list) => this.mergeDemoPatients(list))
    );
  }

  getById(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/${id}`).pipe(
      catchError((err: HttpErrorResponse) => {
        const demo = this.demoPatientById(id);
        if (demo && (err.status === 404 || err.status === 0)) return of(demo);
        return throwError(() => err);
      })
    );
  }

  /** Bracelet / scan accueil : numéro de dossier (ex. C-001). */
  getByNumDossier(numDossier: string): Observable<Patient> {
    const q = encodeURIComponent(numDossier.trim());
    return this.http.get<Patient>(`${this.apiUrl}/par-dossier/${q}`).pipe(
      catchError((err: HttpErrorResponse) => {
        const demo = this.demoPatientByNum(numDossier);
        if (demo && (err.status === 404 || err.status === 0)) return of(demo);
        return throwError(() => err);
      })
    );
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
