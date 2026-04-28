using Microsoft.EntityFrameworkCore;

namespace PMA.Api.Entites;

public class PmaDbContext : DbContext
{
    public PmaDbContext(DbContextOptions<PmaDbContext> options) : base(options)
    {
    }

    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<RendezVous> RendezVous => Set<RendezVous>();
    public DbSet<Consentement> Consentements => Set<Consentement>();
    public DbSet<ActePma> ActesPma => Set<ActePma>();
    public DbSet<ElementBiologique> ElementsBiologiques => Set<ElementBiologique>();
    public DbSet<RealisationActe> RealisationsActes => Set<RealisationActe>();
    public DbSet<Protocole> Protocoles => Set<Protocole>();
    public DbSet<CyclePma> CyclesPma => Set<CyclePma>();
    public DbSet<PailleTube> PailleTubes => Set<PailleTube>();
    public DbSet<Canister> Canisters => Set<Canister>();
    public DbSet<Bonbonne> Bonbonnes => Set<Bonbonne>();
    public DbSet<CycleEtapeHistorique> CycleEtapesHistorique => Set<CycleEtapeHistorique>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Profile>(entity =>
        {
            entity.ToTable("PROFILES");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasColumnName("ID");
            entity.Property(p => p.Libelle)
                .HasColumnName("LIBELLE")
                .HasMaxLength(100)
                .IsRequired();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("USERS");
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Identifiant).IsUnique();
            entity.Property(u => u.Id).HasColumnName("ID");
            entity.Property(u => u.Nom).HasColumnName("NOM").HasMaxLength(100).IsRequired();
            entity.Property(u => u.Prenom).HasColumnName("PRENOM").HasMaxLength(100).IsRequired();
            entity.Property(u => u.Identifiant).HasColumnName("IDENTIFIANT").HasMaxLength(100).IsRequired();
            entity.Property(u => u.PasswordHash).HasColumnName("PASSWORDHASH").HasMaxLength(500).IsRequired();
            entity.Property(u => u.Telephone).HasColumnName("TELEPHONE").HasMaxLength(50);
            entity.Property(u => u.ProfileId).HasColumnName("PROFILEID");

            entity.HasOne(u => u.Profile)
                .WithMany(p => p.Users)
                .HasForeignKey(u => u.ProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.ToTable("PATIENTS");
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => p.NumDossier).IsUnique();
            entity.Property(p => p.Id).HasColumnName("ID");
            entity.Property(p => p.Nom).HasColumnName("NOM").HasMaxLength(100).IsRequired();
            entity.Property(p => p.Prenom).HasColumnName("PRENOM").HasMaxLength(100).IsRequired();
            entity.Property(p => p.DateNaissance).HasColumnName("DATENAISSANCE");
            entity.Property(p => p.FemmeNom).HasColumnName("FEMMENOM").HasMaxLength(100);
            entity.Property(p => p.FemmePrenom).HasColumnName("FEMMEPRENOM").HasMaxLength(100);
            entity.Property(p => p.FemmeDateNaissance).HasColumnName("FEMMEDATENAISSANCE");
            entity.Property(p => p.NumDossier).HasColumnName("NUMDOSSIER").HasMaxLength(50).IsRequired();
            entity.Property(p => p.TypeDossier).HasColumnName("TYPEDOSSIER").HasMaxLength(30).IsRequired();
            entity.Property(p => p.TypeActePma).HasColumnName("TYPEACTEPMA").HasMaxLength(50);
            entity.Property(p => p.Adresse).HasColumnName("ADRESSE").HasMaxLength(500);
            entity.Property(p => p.Telephone).HasColumnName("TELEPHONE").HasMaxLength(30);
            entity.Property(p => p.ImagePath).HasColumnName("IMAGEPATH").HasMaxLength(500);
        });

        modelBuilder.Entity<RendezVous>(entity =>
        {
            entity.ToTable("RENDEZ_VOUS");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Id).HasColumnName("ID");
            entity.Property(r => r.DateHeure).HasColumnName("DATEHEURE");
            entity.Property(r => r.Motif).HasColumnName("MOTIF");
            entity.Property(r => r.Statut).HasColumnName("STATUT").HasMaxLength(50).IsRequired();
            entity.Property(r => r.PatientId).HasColumnName("PATIENTID");

            entity.HasOne(r => r.Patient)
                .WithMany(p => p.RendezVous)
                .HasForeignKey(r => r.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Consentement>(entity =>
        {
            entity.ToTable("CONSENTEMENTS");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasColumnName("ID");
            entity.Property(c => c.Type).HasColumnName("TYPE");
            entity.Property(c => c.DateSignature).HasColumnName("DATESIGNATURE");
            entity.Property(c => c.PhotoPath).HasColumnName("PHOTOPATH").HasMaxLength(500);
            entity.Property(c => c.CinHommePath).HasColumnName("CINHOMMEPATH").HasMaxLength(500);
            entity.Property(c => c.CinFemmePath).HasColumnName("CINFEMMEPATH").HasMaxLength(500);
            entity.Property(c => c.ContratMariagePath).HasColumnName("CONTRATMARIAGEPATH").HasMaxLength(500);
            entity.Property(c => c.PatientId).HasColumnName("PATIENTID");

            entity.HasOne(c => c.Patient)
                .WithMany(p => p.Consentements)
                .HasForeignKey(c => c.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ActePma>(entity =>
        {
            entity.ToTable("ACTES_PMA");
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Id).HasColumnName("ID");
            entity.Property(a => a.TypeActe).HasColumnName("TYPEACTE").HasMaxLength(50).IsRequired();
            entity.Property(a => a.Libelle).HasColumnName("LIBELLE").HasMaxLength(200).IsRequired();
            entity.Property(a => a.Observation).HasColumnName("OBSERVATION").HasMaxLength(2000);
            entity.Property(a => a.StatutRealisation).HasColumnName("STATUTREALISATION").HasMaxLength(30).IsRequired();
            entity.Property(a => a.PatientId).HasColumnName("PATIENTID");

            entity.HasOne(a => a.Patient)
                .WithMany(p => p.ActesPma)
                .HasForeignKey(a => a.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ElementBiologique>(entity =>
        {
            entity.ToTable("ELEMENTS_BIOLOGIQUES");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("ID");
            entity.Property(e => e.TypeElement).HasColumnName("TYPEELEMENT");
            entity.Property(e => e.DateCreation).HasColumnName("DATECREATION");
            entity.Property(e => e.NumeroTube).HasColumnName("NUMEROTUBE");
            entity.Property(e => e.PatientId).HasColumnName("PATIENTID");

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.ElementsBiologiques)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RealisationActe>(entity =>
        {
            entity.ToTable("REALISATIONS_ACTES");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Id).HasColumnName("ID");
            entity.Property(r => r.DateRealisation).HasColumnName("DATEREALISATION");
            entity.Property(r => r.Resultat).HasColumnName("RESULTAT");
            entity.Property(r => r.Observation).HasColumnName("OBSERVATION");
            entity.Property(r => r.Statut).HasColumnName("STATUT");
            entity.Property(r => r.ActePmaId).HasColumnName("ACTEPMAID");
            entity.Property(r => r.UserId).HasColumnName("USERID");

            entity.HasOne(r => r.ActePma)
                .WithMany(a => a.Realisations)
                .HasForeignKey(r => r.ActePmaId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.User)
                .WithMany(u => u.RealisationsActes)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Protocole>(entity =>
        {
            entity.ToTable("PROTOCOLS");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasColumnName("ID");
            entity.Property(p => p.Type).HasColumnName("TYPE").HasMaxLength(50).IsRequired();
        });

        modelBuilder.Entity<CyclePma>(entity =>
        {
            entity.ToTable("CYCLES_PMA");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasColumnName("ID");
            entity.Property(c => c.Phase).HasColumnName("PHASE");
            entity.Property(c => c.StatutCycle).HasColumnName("STATUTCYCLE").HasMaxLength(50).IsRequired();
            entity.Property(c => c.EtapeCourante).HasColumnName("ETAPECOURANTE").HasMaxLength(100).IsRequired();
            entity.Property(c => c.DateDebut).HasColumnName("DATEDEBUT");
            entity.Property(c => c.DateFin).HasColumnName("DATEFIN");
            entity.Property(c => c.DerniereMiseAJour).HasColumnName("DERNIEREMISEAJOUR");
            entity.Property(c => c.PatientId).HasColumnName("PATIENTID");
            entity.Property(c => c.ProtocoleId).HasColumnName("PROTOCOLEID");

            entity.HasOne(c => c.Patient)
                .WithMany(p => p.CyclesPma)
                .HasForeignKey(c => c.PatientId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.Protocole)
                .WithMany(p => p.CyclesPma)
                .HasForeignKey(c => c.ProtocoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CycleEtapeHistorique>(entity =>
        {
            entity.ToTable("CYCLES_ETAPES_HISTORIQUE");
            entity.HasKey(h => h.Id);
            entity.Property(h => h.Id).HasColumnName("ID");
            entity.Property(h => h.Etape).HasColumnName("ETAPE").HasMaxLength(100).IsRequired();
            entity.Property(h => h.Statut).HasColumnName("STATUT").HasMaxLength(50).IsRequired();
            entity.Property(h => h.DateEtape).HasColumnName("DATEETAPE");
            entity.Property(h => h.Observation).HasColumnName("OBSERVATION").HasMaxLength(2000);
            entity.Property(h => h.CyclePmaId).HasColumnName("CYCLEPMAID");
            entity.Property(h => h.UserId).HasColumnName("USERID");

            entity.HasOne(h => h.CyclePma)
                .WithMany(c => c.EtapesHistorique)
                .HasForeignKey(h => h.CyclePmaId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(h => h.User)
                .WithMany()
                .HasForeignKey(h => h.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PailleTube>(entity =>
        {
            entity.ToTable("PAILLES_TUBES");
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => p.CodeBarre).IsUnique();
            entity.Property(p => p.Id).HasColumnName("ID");
            entity.Property(p => p.CodeBarre).HasColumnName("CODEBARRE");
            entity.Property(p => p.TypeContenu).HasColumnName("TYPECONTENU");
            entity.Property(p => p.Position).HasColumnName("POSITION");
            entity.Property(p => p.CyclePmaId).HasColumnName("CYCLEPMAID");
            entity.Property(p => p.CanisterId).HasColumnName("CANISTERID");

            entity.HasOne(p => p.CyclePma)
                .WithMany(c => c.PailleTubes)
                .HasForeignKey(p => p.CyclePmaId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(p => p.Canister)
                .WithMany(c => c.PailleTubes)
                .HasForeignKey(p => p.CanisterId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Canister>(entity =>
        {
            entity.ToTable("CANISTERS");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasColumnName("ID");
            entity.Property(c => c.Numero).HasColumnName("NUMERO");
            entity.Property(c => c.BonbonneId).HasColumnName("BONBONNEID");

            entity.HasOne(c => c.Bonbonne)
                .WithMany(b => b.Canisters)
                .HasForeignKey(c => c.BonbonneId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Bonbonne>(entity =>
        {
            entity.ToTable("BONBONNES");
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Id).HasColumnName("ID");
            entity.Property(b => b.TypeStockage).HasColumnName("TYPESTOCKAGE");
            entity.Property(b => b.Temperature).HasColumnName("TEMPERATURE");
        });
    }
}
