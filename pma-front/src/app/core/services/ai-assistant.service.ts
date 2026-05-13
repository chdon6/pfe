import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ActePma, CyclePma, RendezVous } from '../models';

interface SuggestRdvMotifResponse {
  suggestions: string[];
}

interface ReformulateNoteResponse {
  reformulatedNote: string;
}

interface SummarizePatientResponse {
  summary: string;
}

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  private readonly apiUrl = `${environment.apiUrl}/ai-assistant`;

  constructor(private http: HttpClient) {}

  suggestRdvMotif(payload: {
    patientId?: number;
    patientDisplayName?: string;
    dateHeure?: string;
    currentMotif?: string;
  }): Observable<SuggestRdvMotifResponse> {
    return this.http.post<SuggestRdvMotifResponse>(`${this.apiUrl}/suggest-rdv-motif`, payload).pipe(
      catchError(() => {
        const seed = (payload.currentMotif || '').trim() || 'Consultation PMA';
        const suggestions = [
          `${seed} - verification du dossier`,
          'Entretien administratif et planification des etapes',
          'Suivi patient et coordination avec le laboratoire'
        ];
        return of({ suggestions });
      })
    );
  }

  reformulateNote(note: string): Observable<ReformulateNoteResponse> {
    return this.http.post<ReformulateNoteResponse>(`${this.apiUrl}/reformulate-note`, { note }).pipe(
      catchError(() => {
        const normalized = this.normalizeText(note);
        const reformulatedNote = normalized
          ? `Note administrative reformulee: ${normalized.endsWith('.') ? normalized : `${normalized}.`}`
          : '';
        return of({ reformulatedNote });
      })
    );
  }

  summarizePatient(payload: {
    patientDisplayName?: string;
    dossierType?: string;
    rendezVous: Pick<RendezVous, 'dateHeure' | 'motif' | 'statut'>[];
    cycles: Pick<CyclePma, 'dateDebut' | 'phase' | 'etapeCourante' | 'statutCycle'>[];
    actes: Pick<ActePma, 'libelle' | 'typeActe' | 'statutRealisation'>[];
  }): Observable<SummarizePatientResponse> {
    return this.http.post<SummarizePatientResponse>(`${this.apiUrl}/summarize-patient`, payload).pipe(
      map((res) => ({ summary: (res.summary || '').trim() })),
      catchError(() => {
        const summary = this.buildLocalSummary(payload);
        return of({ summary });
      })
    );
  }

  private buildLocalSummary(payload: {
    patientDisplayName?: string;
    dossierType?: string;
    rendezVous: Pick<RendezVous, 'dateHeure' | 'motif' | 'statut'>[];
    cycles: Pick<CyclePma, 'dateDebut' | 'phase' | 'etapeCourante' | 'statutCycle'>[];
    actes: Pick<ActePma, 'libelle' | 'typeActe' | 'statutRealisation'>[];
  }): string {
    const patient = (payload.patientDisplayName || 'Patient').trim();
    const dossier = (payload.dossierType || 'non precise').trim();
    const rdvCount = payload.rendezVous.length;
    const cyclesCount = payload.cycles.length;
    const actesCount = payload.actes.length;
    const actifs = payload.cycles.filter((c) => (c.statutCycle || '').toLowerCase() !== 'termine').length;
    const aFaire = payload.actes.filter((a) => (a.statutRealisation || '').toLowerCase() === 'a_faire').length;

    return `${patient} - dossier ${dossier}. ${rdvCount} rendez-vous, ${cyclesCount} cycle(s) dont ${actifs} actif(s), ${actesCount} acte(s) prescrit(s) dont ${aFaire} a realiser.`;
  }

  private normalizeText(value: string): string {
    const tokens = value
      .replace(/\r/g, ' ')
      .replace(/\n/g, ' ')
      .split(' ')
      .map((x) => x.trim())
      .filter(Boolean);
    if (tokens.length === 0) return '';
    const joined = tokens.join(' ');
    return joined[0].toUpperCase() + joined.slice(1);
  }
}
