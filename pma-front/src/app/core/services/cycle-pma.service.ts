import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { demoHistoriqueForCycle } from '../data/demo-cycles';
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
