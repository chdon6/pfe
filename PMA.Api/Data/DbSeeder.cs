using Microsoft.EntityFrameworkCore;
using PMA.Api.Entites;
using PMA.Api.Services;

namespace PMA.Api.Data;

public static class DbSeeder
{
    private static readonly string[] ProfileLabels = ["Technicien", "Secretaire", "Biologiste", "Administrateur"];

    /// <summary>Profils de base + utilisateurs démo + compte admin (identifiant <c>admin</c> / <c>admin123</c> en dev).</summary>
    public static void SeedDevelopmentData(PmaDbContext db)
    {
        EnsureProfiles(db);
        if (!db.Users.Any())
        {
            var tid = db.Profiles.First(p => p.Libelle == "Technicien").Id;
            var sid = db.Profiles.First(p => p.Libelle == "Secretaire").Id;
            var bid = db.Profiles.First(p => p.Libelle == "Biologiste").Id;
            var aid = db.Profiles.First(p => p.Libelle == "Administrateur").Id;
            db.Users.AddRange(
                new User
                {
                    Nom = "Benali",
                    Prenom = "Samira",
                    Identifiant = "biologiste",
                    Telephone = "0612345678",
                    ProfileId = bid,
                    PasswordHash = PasswordHasher.Sha256Hex("bio123")
                },
                new User
                {
                    Nom = "Khaldi",
                    Prenom = "Youssef",
                    Identifiant = "technicien",
                    Telephone = "0698765432",
                    ProfileId = tid,
                    PasswordHash = PasswordHasher.Sha256Hex("tech123")
                },
                new User
                {
                    Nom = "Mansouri",
                    Prenom = "Amina",
                    Identifiant = "secretaire",
                    Telephone = "0655443322",
                    ProfileId = sid,
                    PasswordHash = PasswordHasher.Sha256Hex("sec123")
                },
                new User
                {
                    Nom = "Admin",
                    Prenom = "PMA",
                    Identifiant = "admin",
                    Telephone = "",
                    ProfileId = aid,
                    PasswordHash = PasswordHasher.Sha256Hex("admin123")
                });
            db.SaveChanges();
        }
        else
        {
            EnsureAdminUser(db);
        }
    }

    private static void EnsureProfiles(PmaDbContext db)
    {
        foreach (var lib in ProfileLabels)
        {
            if (!db.Profiles.Any(p => p.Libelle == lib))
                db.Profiles.Add(new Profile { Libelle = lib });
        }

        db.SaveChanges();
    }

    /// <summary>Ajoute le compte admin si la base existait sans profil Administrateur / sans utilisateur admin.</summary>
    private static void EnsureAdminUser(PmaDbContext db)
    {
        if (db.Users.Any(u => string.Equals(u.Identifiant, "admin", StringComparison.OrdinalIgnoreCase)))
            return;
        var p = db.Profiles.FirstOrDefault(x => x.Libelle == "Administrateur");
        if (p is null) return;
        db.Users.Add(new User
        {
            Nom = "Admin",
            Prenom = "PMA",
            Identifiant = "admin",
            Telephone = "",
            ProfileId = p.Id,
            PasswordHash = PasswordHasher.Sha256Hex("admin123")
        });
        db.SaveChanges();
    }
}
