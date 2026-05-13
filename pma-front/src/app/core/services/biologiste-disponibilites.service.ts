import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Clés yyyy-MM-dd ; false = biologiste indisponible ce jour-là. */
export type BiologisteDisponibilitesMap = Record<string, boolean>;

@Injectable({ providedIn: 'root' })
export class BiologisteDisponibilitesService {
  private readonly url = `${environment.apiUrl}/biologiste-disponibilites`;

  constructor(private http: HttpClient) {}

  get(): Observable<BiologisteDisponibilitesMap> {
    return this.http.get<BiologisteDisponibilitesMap>(this.url);
  }

  put(map: BiologisteDisponibilitesMap): Observable<void> {
    return this.http.put<void>(this.url, map);
  }
}
