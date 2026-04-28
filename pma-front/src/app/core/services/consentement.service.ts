import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Consentement } from '../models';

@Injectable({ providedIn: 'root' })
export class ConsentementService {
  private readonly apiUrl = `${environment.apiUrl}/consentements`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Consentement[]> {
    return this.http.get<Consentement[]>(this.apiUrl);
  }

  getById(id: number): Observable<Consentement> {
    return this.http.get<Consentement>(`${this.apiUrl}/${id}`);
  }

  createFromForm(formData: FormData): Observable<number> {
    return this.http.post<number>(this.apiUrl, formData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
