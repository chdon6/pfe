using Microsoft.EntityFrameworkCore;
using PMA.Api.Entites;
using PMA.Api.Services;

namespace PMA.Api.Data;

public static class DbSeeder
{
    private static readonly string[] ProfileLabels = ["Technicien", "Secretaire", "Biologiste", "Administrateur"];
    private sealed record DefaultUserSeed(
        string Identifiant,
        string Nom,
        string Prenom,
        string Telephone,
        string ProfileLabel,
        string Password);

    /// <summary>Profils de base + utilisateurs démo + compte admin (identifiant <c>admin</c> / <c>admin123</c> en dev).</summary>
    public static void SeedDevelopmentData(PmaDbContext db)
    {
        EnsureProfiles(db);
        EnsureDefaultUsers(db);
        EnsureCryoData(db);
    }

    private static void EnsureProfiles(PmaDbContext db)
    {
        var existing = db.Profiles.AsNoTracking().Select(p => p.Libelle).ToList();
        var existingSet = existing.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var added = false;

        foreach (var lib in ProfileLabels)
        {
            if (!existingSet.Contains(lib))
            {
                db.Profiles.Add(new Profile { Libelle = lib });
                added = true;
            }
        }

        if (added)
            db.SaveChanges();
    }

    /// <summary>Ajoute les comptes de base si absents (sans modifier les comptes existants).</summary>
    private static void EnsureDefaultUsers(PmaDbContext db)
    {
        var defaultUsers = new[]
        {
            new DefaultUserSeed("biologiste", "Benali", "Samira", "0612345678", "Biologiste", "bio123"),
            new DefaultUserSeed("technicien", "Khaldi", "Youssef", "0698765432", "Technicien", "tech123"),
            new DefaultUserSeed("secretaire", "Mansouri", "Amina", "0655443322", "Secretaire", "sec123"),
            new DefaultUserSeed("admin", "Admin", "PMA", "0000000000", "Administrateur", "admin123")
        };

        var profilesByLabel = db.Profiles.AsNoTracking().ToList().ToDictionary(p => p.Libelle, p => p.Id);
        var existingLogins = db.Users.AsNoTracking()
            .Select(u => u.Identifiant)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var added = false;
        foreach (var seed in defaultUsers)
        {
            if (existingLogins.Contains(seed.Identifiant))
                continue;
            if (!profilesByLabel.TryGetValue(seed.ProfileLabel, out var profileId))
                continue;

            db.Users.Add(new User
            {
                Nom = seed.Nom,
                Prenom = seed.Prenom,
                Identifiant = seed.Identifiant,
                Telephone = seed.Telephone,
                ProfileId = profileId,
                PasswordHash = PasswordHasher.Sha256Hex(seed.Password)
            });
            added = true;
        }

        if (added)
            db.SaveChanges();
    }

    private static void EnsureCryoData(PmaDbContext db)
    {
        var bonbonne = db.Bonbonnes.FirstOrDefault();
        if (bonbonne == null) return;

        var code = bonbonne.Code;
        var bbId = bonbonne.Id;

        if (db.CapteursTemperature.AsNoTracking().Count() > 0)
        {
            db.HistoriquesTemperature.RemoveRange(db.HistoriquesTemperature.ToList());
            db.CapteursTemperature.RemoveRange(db.CapteursTemperature.ToList());
            db.NiveauxAzote.RemoveRange(db.NiveauxAzote.ToList());
            db.MaintenancesPreventives.RemoveRange(db.MaintenancesPreventives.ToList());
            db.AlertesCryo.RemoveRange(db.AlertesCryo.ToList());
            db.SaveChanges();
        }

        var now = DateTime.UtcNow;
        var jour = TimeSpan.FromDays(1);

        var capteur = new CapteurTemperature
        {
            Nom = $"Capteur {code}",
            BonbonneId = bbId,
            TemperatureActuelle = -195.8,
            TemperatureCible = -196,
            SeuilAlerte = 3,
            Statut = "normal",
            DerniereMaj = now
        };
        db.CapteursTemperature.Add(capteur);

        db.NiveauxAzote.Add(new NiveauAzote
        {
            BonbonneId = bbId,
            NiveauPourcentage = 72,
            VolumeLitres = 28.8,
            CapaciteLitres = 40,
            SeuilAlerte = 30,
            DernierRemplissage = now - 10 * jour,
            ProchainRemplissage = now + 11 * jour,
            Statut = "ok"
        });

        db.MaintenancesPreventives.AddRange(
            new MaintenancePreventive
            {
                Equipement = $"Bonbonne {code}",
                TypeEquipement = "bonbonne",
                TypeMaintenance = "Verification etancheite et joints",
                DerniereExecution = now - 60 * jour,
                ProchaineExecution = now + 30 * jour,
                FrequenceJours = 90,
                Responsable = "Tech. Khaldi",
                Statut = "a_jour",
                Notes = "RAS"
            },
            new MaintenancePreventive
            {
                Equipement = $"Capteur {code}",
                TypeEquipement = "capteur",
                TypeMaintenance = "Calibrage et etalonnage",
                DerniereExecution = now - 170 * jour,
                ProchaineExecution = now - 10 * jour,
                FrequenceJours = 180,
                Responsable = "Tech. Khaldi",
                Statut = "en_retard",
                Notes = "Etalonnage semestriel obligatoire ABM"
            },
            new MaintenancePreventive
            {
                Equipement = $"Bonbonne {code}",
                TypeEquipement = "bonbonne",
                TypeMaintenance = "Controle niveau et pesee",
                DerniereExecution = now - 13 * jour,
                ProchaineExecution = now + 1 * jour,
                FrequenceJours = 14,
                Responsable = "Tech. Khaldi",
                Statut = "a_planifier",
                Notes = "Pesee bimensuelle"
            }
        );

        db.AlertesCryo.AddRange(
            new AlerteCryo
            {
                DateAlerte = now - TimeSpan.FromHours(2),
                Type = "azote",
                Severite = "warning",
                Message = $"Niveau azote a surveiller sur {code} (72%)",
                Equipement = code,
                Acquittee = false
            },
            new AlerteCryo
            {
                DateAlerte = now - TimeSpan.FromHours(12),
                Type = "maintenance",
                Severite = "warning",
                Message = $"Calibrage capteur {code} en retard de 10 jours",
                Equipement = $"Capteur {code}",
                Acquittee = false
            },
            new AlerteCryo
            {
                DateAlerte = now - TimeSpan.FromHours(48),
                Type = "temperature",
                Severite = "info",
                Message = $"Remplissage azote effectue sur {code} - temperature stabilisee a -195.9C",
                Equipement = code,
                Acquittee = true
            }
        );

        db.SaveChanges();
    }
}
