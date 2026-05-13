import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AdminSystemAuditService } from '../../../core/services/admin-system-audit.service';
import { UserService } from '../../../core/services/user.service';
import { ProfileService } from '../../../core/services/profile.service';
import { User, Profile } from '../../../core/models';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private profileService = inject(ProfileService);
  private auth = inject(AuthService);
  private adminAudit = inject(AdminSystemAuditService);

  users: User[] = [];
  profiles: Profile[] = [];
  loading = true;
  formError = '';

  showForm = false;
  editUser: User = { id: 0, nom: '', prenom: '', identifiant: '', telephone: '', profileId: undefined };
  password = '';
  confirmPassword = '';

  /** Profils attribuables (Secrétaire, Biologiste, Technicien) — pas Administrateur. */
  get assignableProfiles(): Profile[] {
    return this.profiles.filter((p) =>
      ['Secretaire', 'Biologiste', 'Technicien'].includes(p.libelle)
    );
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.formError = '';
    this.profileService.getAll().subscribe((p) => (this.profiles = p));
    this.userService.getAll().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.formError = this.httpErrorMessage(err, 'Impossible de charger les utilisateurs.');
      },
    });
  }

  getProfileName(user: User): string {
    if (user.profileLibelle) return user.profileLibelle;
    return this.profiles.find((p) => p.id === user.profileId)?.libelle || '—';
  }

  isAdministrateur(user: User): boolean {
    return user.profileLibelle === 'Administrateur' || this.getProfileName(user) === 'Administrateur';
  }

  openNew(): void {
    this.formError = '';
    this.editUser = { id: 0, nom: '', prenom: '', identifiant: '', telephone: '', profileId: undefined };
    this.password = '';
    this.confirmPassword = '';
    this.showForm = true;
  }

  saveUser(): void {
    this.formError = '';
    if (!this.editUser.nom?.trim() || !this.editUser.prenom?.trim() || !this.editUser.identifiant?.trim()) {
      this.formError = 'Nom, prénom et identifiant sont obligatoires.';
      return;
    }
    if (!this.editUser.profileId) {
      this.formError = 'Sélectionnez un profil.';
      return;
    }
    if (!this.editUser.id) {
      if (!this.password.trim()) {
        this.formError = 'Le mot de passe est obligatoire pour un nouvel utilisateur.';
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.formError = 'Les mots de passe ne correspondent pas.';
        return;
      }
    } else {
      if (this.password && this.password !== this.confirmPassword) {
        this.formError = 'Les mots de passe ne correspondent pas.';
        return;
      }
    }

    const payload = {
      id: this.editUser.id,
      nom: this.editUser.nom.trim(),
      prenom: this.editUser.prenom.trim(),
      identifiant: this.editUser.identifiant.trim(),
      telephone: this.editUser.telephone?.trim() || '',
      profileId: this.editUser.profileId,
      ...(this.password.trim() ? { password: this.password.trim() } : {}),
    };

    if (this.editUser.id) {
      this.userService.update(payload).subscribe({
        next: () => {
          this.adminAudit.log(
            'Modification utilisateur',
            `${payload.identifiant} (id ${payload.id})`,
            this.auth.user()?.identifiant
          );
          this.showForm = false;
          this.loadData();
        },
        error: (err) => {
          this.formError = this.httpErrorMessage(err, 'Échec de la mise à jour.');
        },
      });
    } else {
      this.userService.create(payload).subscribe({
        next: () => {
          this.adminAudit.log(
            'Création utilisateur',
            payload.identifiant,
            this.auth.user()?.identifiant
          );
          this.showForm = false;
          this.loadData();
        },
        error: (err) => {
          this.formError = this.httpErrorMessage(err, 'Échec de la création.');
        },
      });
    }
  }

  editExisting(user: User): void {
    this.formError = '';
    this.editUser = { ...user };
    this.password = '';
    this.confirmPassword = '';
    this.showForm = true;
  }

  deleteUser(user: User): void {
    if (this.isAdministrateur(user)) return;
    if (!confirm(`Supprimer l’utilisateur ${user.prenom} ${user.nom} ?`)) return;
    this.userService.delete(user.id).subscribe({
      next: () => {
        this.adminAudit.log(
          'Suppression utilisateur',
          `${user.identifiant} (id ${user.id})`,
          this.auth.user()?.identifiant
        );
        this.loadData();
      },
      error: (err) => alert(this.httpErrorMessage(err, 'Suppression impossible.')),
    });
  }

  private httpErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      if (typeof err.error === 'string' && err.error.trim()) return err.error.trim();
      if (err.status === 401 || err.status === 403) {
        return 'Accès refusé : connectez-vous avec un compte administrateur (JWT valide).';
      }
    }
    return fallback;
  }
}
