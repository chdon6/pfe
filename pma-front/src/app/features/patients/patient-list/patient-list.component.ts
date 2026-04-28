import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../../../core/services/patient.service';
import { Patient } from '../../../core/models';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './patient-list.component.html',
  styleUrl: './patient-list.component.scss'
})
export class PatientListComponent implements OnInit {
  private patientService = inject(PatientService);

  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  searchTerm = '';
  loading = true;

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading = true;
    this.patientService.getAll().subscribe({
      next: (data) => {
        this.patients = data;
        this.applyFilterAndSort();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private digitsOnly(s: string | null | undefined): string {
    return (s ?? '').replace(/\D/g, '');
  }

  private comparePatient(a: Patient, b: Patient): number {
    const byNom = (a.nom ?? '').localeCompare(b.nom ?? '', 'fr', { sensitivity: 'base' });
    if (byNom !== 0) return byNom;
    return (a.prenom ?? '').localeCompare(b.prenom ?? '', 'fr', { sensitivity: 'base' });
  }

  applyFilterAndSort(): void {
    const raw = this.searchTerm.trim();
    const termLower = raw.toLowerCase();
    const termDigits = this.digitsOnly(raw);

    let list = this.patients.filter((p) => {
      if (!raw) return true;
      const femme = `${p.femmeNom ?? ''} ${p.femmePrenom ?? ''}`.toLowerCase();
      const phoneDigits = this.digitsOnly(p.telephone);
      const phoneMatch =
        termDigits.length > 0 && phoneDigits.includes(termDigits);
      return (
        p.nom.toLowerCase().includes(termLower) ||
        p.prenom.toLowerCase().includes(termLower) ||
        p.numDossier.toLowerCase().includes(termLower) ||
        femme.includes(termLower) ||
        (p.typeDossier === 'spermogramme' ? 'spermogramme' : 'couple').includes(termLower) ||
        phoneMatch
      );
    });
    list.sort((a, b) => this.comparePatient(a, b));
    this.filteredPatients = list;
  }

  onSearch(): void {
    this.applyFilterAndSort();
  }

  deletePatient(id: number): void {
    const p = this.patients.find((x) => x.id === id);
    if (p?.demo) return;
    if (confirm('Voulez-vous vraiment supprimer ce patient ?')) {
      this.patientService.delete(id).subscribe(() => this.loadPatients());
    }
  }
}
