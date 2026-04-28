import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ElementBiologique, EtiquetteLookup } from '../models';

@Injectable({ providedIn: 'root' })
export class ElementBiologiqueService {
  private readonly apiUrl = `${environment.apiUrl}/elementsbiologiques`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ElementBiologique[]> {
    return this.http.get<ElementBiologique[]>(this.apiUrl);
  }

  getById(id: number): Observable<ElementBiologique> {
    return this.http.get<ElementBiologique>(`${this.apiUrl}/${id}`);
  }

  /** Résout l'étiquette : élément biologique ou paillette cryo + patient. */
  lookupEtiquette(codeBarre: string): Observable<EtiquetteLookup> {
    const c = encodeURIComponent(codeBarre.trim());
    return this.http.get<EtiquetteLookup>(`${this.apiUrl}/lookup-etiquette/${c}`);
  }

  create(element: ElementBiologique): Observable<number> {
    return this.http.post<number>(this.apiUrl, element);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
