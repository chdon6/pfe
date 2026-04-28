import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RealisationActe } from '../models';

@Injectable({ providedIn: 'root' })
export class RealisationActeService {
  private readonly apiUrl = `${environment.apiUrl}/realisationsactes`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<RealisationActe[]> {
    return this.http.get<RealisationActe[]>(this.apiUrl);
  }

  getById(id: number): Observable<RealisationActe> {
    return this.http.get<RealisationActe>(`${this.apiUrl}/${id}`);
  }

  create(realisation: RealisationActe): Observable<number> {
    return this.http.post<number>(this.apiUrl, realisation);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
