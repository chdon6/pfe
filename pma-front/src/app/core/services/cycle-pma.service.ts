import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CyclePma, CycleEtapeHistorique, ResultatTestGrossesse } from '../models';

@Injectable({ providedIn: 'root' })
export class CyclePmaService {
  private readonly apiUrl = `${environment.apiUrl}/cyclespma`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<CyclePma[]> {
    return this.http.get<CyclePma[]>(this.apiUrl).pipe(catchError(() => of([])));
  }

  getById(id: number): Observable<CyclePma> {
    return this.http.get<CyclePma>(`${this.apiUrl}/${id}`);
  }

  create(cycle: CyclePma): Observable<number> {
    return this.http.post<number>(this.apiUrl, cycle);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  patchResultatTest(id: number, resultat: ResultatTestGrossesse): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/resultat-test`, {
      resultatTestGrossesse: resultat,
    });
  }

  postSignatureResultatTest(id: number, signataire: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/signature-resultat-test`, {
      signataire: signataire.trim(),
    });
  }

  /** Jalons réels en base pour un cycle. */
  getHistorique(cycleId: number): Observable<CycleEtapeHistorique[]> {
    return this.http
      .get<CycleEtapeHistorique[]>(`${this.apiUrl}/${cycleId}/historique`)
      .pipe(catchError(() => of([])));
  }

  /** Tous les jalons (agenda / liste) — données API uniquement. */
  getAllHistoriques(): Observable<CycleEtapeHistorique[]> {
    return this.http
      .get<CycleEtapeHistorique[]>(`${this.apiUrl}/historiques`)
      .pipe(catchError(() => of([])));
  }

  avancerEtape(cycleId: number, data: { etape: string; observation?: string }): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${cycleId}/avancer`, data);
  }
}
