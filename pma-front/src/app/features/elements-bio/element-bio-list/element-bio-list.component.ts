import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElementBiologiqueService } from '../../../core/services/element-biologique.service';
import { PatientService } from '../../../core/services/patient.service';
import { ElementBiologique, Patient } from '../../../core/models';

@Component({
  selector: 'app-element-bio-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './element-bio-list.component.html',
  styleUrl: './element-bio-list.component.scss'
})
export class ElementBioListComponent implements OnInit {
  private elementService = inject(ElementBiologiqueService);
  private patientService = inject(PatientService);

  elements: ElementBiologique[] = [];
  patients: Patient[] = [];
  loading = true;

  showForm = false;
  newElement: ElementBiologique = {
    id: 0,
    typeElement: '',
    dateCreation: '',
    numeroTube: '',
    codeBarre: '',
    patientId: 0
  };

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.patientService.getAll().subscribe(p => this.patients = p);
    this.elementService.getAll().subscribe({
      next: (data) => { this.elements = data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  getPatientName(patientId: number): string {
    const p = this.patients.find(x => x.id === patientId);
    return p ? `${p.prenom} ${p.nom}` : '-';
  }

  openNew(): void {
    this.newElement = {
      id: 0,
      typeElement: '',
      dateCreation: '',
      numeroTube: '',
      codeBarre: '',
      patientId: 0
    };
    this.showForm = true;
  }

  save(): void {
    this.elementService.create(this.newElement).subscribe(() => {
      this.showForm = false;
      this.loadData();
    });
  }

  deleteElement(id: number): void {
    if (confirm('Supprimer cet élément biologique ?')) {
      this.elementService.delete(id).subscribe(() => this.loadData());
    }
  }
}
