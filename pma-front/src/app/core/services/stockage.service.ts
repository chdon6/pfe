import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Bonbonne, Canister, PailleTube } from '../models';

@Injectable({ providedIn: 'root' })
export class StockageService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Bonbonnes
  getBonbonnes(): Observable<Bonbonne[]> {
    return this.http.get<Bonbonne[]>(`${this.apiUrl}/bonbonnes`);
  }

  getBonbonne(id: number): Observable<Bonbonne> {
    return this.http.get<Bonbonne>(`${this.apiUrl}/bonbonnes/${id}`);
  }

  createBonbonne(bonbonne: Bonbonne): Observable<number> {
    return this.http.post<number>(`${this.apiUrl}/bonbonnes`, bonbonne);
  }

  deleteBonbonne(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/bonbonnes/${id}`);
  }

  // Canisters
  getCanisters(): Observable<Canister[]> {
    return this.http.get<Canister[]>(`${this.apiUrl}/canisters`);
  }

  createCanister(canister: Canister): Observable<number> {
    return this.http.post<number>(`${this.apiUrl}/canisters`, canister);
  }

  deleteCanister(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/canisters/${id}`);
  }

  // Pailles / Tubes
  getPaillesTubes(): Observable<PailleTube[]> {
    return this.http.get<PailleTube[]>(`${this.apiUrl}/paillestubes`);
  }

  createPailleTube(paille: PailleTube): Observable<number> {
    return this.http.post<number>(`${this.apiUrl}/paillestubes`, paille);
  }

  deletePailleTube(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/paillestubes/${id}`);
  }
}
