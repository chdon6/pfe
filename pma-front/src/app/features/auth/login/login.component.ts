import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface CompteRole {
  label: string;
  identifiant: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly comptes: CompteRole[] = [
    { label: 'Biologiste',     identifiant: 'biologiste', icon: 'fas fa-flask',       color: '#7c3aed' },
    { label: 'Secrétaire',     identifiant: 'secretaire', icon: 'fas fa-user-tie',    color: '#0891b2' },
    { label: 'Technicien',     identifiant: 'technicien', icon: 'fas fa-tools',       color: '#059669' },
    { label: 'Administrateur', identifiant: 'admin',      icon: 'fas fa-user-shield', color: '#dc2626' },
  ];

  selectedCompte: CompteRole | null = null;
  identifiant = '';
  password = '';
  error = '';
  loading = false;

  onRoleChange(val: string): void {
    this.identifiant = val;
    this.error = '';
  }

  onLogin(): void {
    if (!this.identifiant || !this.password) {
      this.error = 'Veuillez sélectionner un profil et saisir le mot de passe.';
      return;
    }
    this.loading = true;
    this.error = '';

    this.auth.login({ identifiant: this.identifiant, password: this.password }).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.error = 'Identifiant ou mot de passe incorrect.';
        this.loading = false;
      }
    });
  }
}
