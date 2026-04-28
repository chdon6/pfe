import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DEMO_CYCLE_PMA, demoHistoriqueForCycle } from '../data/demo-cycles';
import { CyclePma, CycleEtapeHistorique, ResultatTestGrossesse } from '../models';

@Injectable({ providedIn: 'root' })
export class CyclePmaService {
  private readonly apiUrl = `${environment.apiUrl}/cyclespma`;

  constructor(private http: HttpClient) {}

  private mergeDemoCycles(api: CyclePma[]): CyclePma[] {
    if (!environment.useDemoData) return api;
    const ids = new Set(api.map((c) => c.id));
    const extra = DEMO_CYCLE_PMA.filter((d) => !ids.has(d.id));
    return [...api, ...extra];
  }

  private demoCycleById(id: number): CyclePma | undefined {
    return environment.useDemoData ? DEMO_CYCLE_PMA.find((c) => c.id === id) : undefined;
  }

  getAll(): Observable<CyclePma[]> {
    return this.http.get<CyclePma[]>(this.apiUrl).pipe(
      catchError(() => of([])),
      map((list) => this.mergeDemoCycles(list))
    );
  }

  getById(id: number): Observable<CyclePma> {
    return this.http.get<CyclePma>(`${this.apiUrl}/${id}`).pipe(
      catchError((err: HttpErrorResponse) => {
        const demo = this.demoCycleById(id);
        if (demo && (err.status === 404 || err.status === 0)) return of(demo);
        return throwError(() => err);
      })
    );
  }

  create(cycle: CyclePma): Observable<number> {
    return this.http.post<number>(this.apiUrl, cycle);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** Saisie du résultat β-hCG — efface la signature existante jusqu’à nouvelle validation biologiste. */
  patchResultatTest(id: number, resultat: ResultatTestGrossesse): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/resultat-test`, {
      resultatTestGrossesse: resultat,
    });
  }

  /** Signature électronique du résultat (biologiste) — résultat doit être positif ou négatif. */
  postSignatureResultatTest(id: number, signataire: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/signature-resultat-test`, { signataire: signataire.trim() });
  }

  getHistorique(cycleId: number): Observable<CycleEtapeHistorique[]> {
    return this.http.get<CycleEtapeHistorique[]>(`${this.apiUrl}/${cycleId}/historique`).pipe(
      map((rows) => {
        if (rows?.length) return rows;
        return environment.useDemoData ? demoHistoriqueForCycle(cycleId) : [];
      }),
      catchError(() => of(environment.useDemoData ? demoHistoriqueForCycle(cycleId) : []))
    );
  }

  avancerEtape(cycleId: number, data: { etape: string; observation?: string }): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${cycleId}/avancer`, data);
  }
}
